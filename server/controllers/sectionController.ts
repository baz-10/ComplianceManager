import { Request, Response } from 'express';
import { db } from '@db';
import { sections, insertSectionSchema, type User, policies, policyVersions, acknowledgements, annotations, approvalWorkflows, documentSignatures } from '@db/schema';
import { eq, inArray, and } from 'drizzle-orm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const SectionController = {
  async list(req: Request, res: Response) {
    try {
      const { manualId } = req.params;
      const allSections = await db.query.sections.findMany({
        where: eq(sections.manualId, parseInt(manualId)),
        with: {
          policies: true,
          createdBy: true
        },
        orderBy: sections.orderIndex
      });
      res.json(allSections);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sections' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const result = insertSectionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [section] = await db.insert(sections)
        .values({
          ...result.data,
          createdById: req.user.id
        })
        .returning();

      res.status(201).json(section);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create section' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = insertSectionSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const [section] = await db.update(sections)
        .set({
          ...result.data,
          updatedAt: new Date()
        })
        .where(eq(sections.id, parseInt(id)))
        .returning();

      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }

      res.json(section);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update section' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // First check if the section exists
      const section = await db.query.sections.findFirst({
        where: eq(sections.id, parseInt(id)),
        with: {
          policies: {
            with: {
              versions: true
            }
          }
        }
      });

      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }

      // Begin transaction to ensure all related records are deleted
      await db.transaction(async (tx) => {
        // For each policy in this section
        for (const policy of section.policies) {
          // Get all version IDs for this policy
          const versionIds = policy.versions.map(v => v.id);
          
          if (versionIds.length > 0) {
            // Delete all acknowledgements for all versions of this policy
            await tx.delete(acknowledgements)
              .where(inArray(acknowledgements.policyVersionId, versionIds));
            
            // Delete all annotations for all versions of this policy
            await tx.delete(annotations)
              .where(inArray(annotations.policyVersionId, versionIds));
            
            // Delete all approval workflows for all versions of this policy
            await tx.delete(approvalWorkflows)
              .where(inArray(approvalWorkflows.policyVersionId, versionIds));
            
            // Delete all document signatures for all versions of this policy
            await tx.delete(documentSignatures)
              .where(
                and(
                  eq(documentSignatures.entityType, 'policy_version'),
                  inArray(documentSignatures.entityId, versionIds)
                )
              );
            
            // Delete all versions of this policy
            await tx.delete(policyVersions)
              .where(eq(policyVersions.policyId, policy.id));
          }
        }
        
        // Delete all policies in this section
        if (section.policies.length > 0) {
          await tx.delete(policies)
            .where(eq(policies.sectionId, parseInt(id)));
        }
        
        // Finally delete the section itself
        await tx.delete(sections)
          .where(eq(sections.id, parseInt(id)));
      });

      // Log deletion for audit trail (optional, non-blocking)
      try {
        const { AuditService } = await import('../services/auditService');
        await AuditService.logDeletion(
          req,
          'section',
          parseInt(id),
          `Section "${section.title}" deleted with ${section.policies.length} policies`
        );
      } catch (auditError) {
        console.warn('Failed to log section deletion:', auditError);
      }

      res.json({ message: 'Section deleted successfully' });
    } catch (error) {
      console.error('Failed to delete section:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete section';
      res.status(500).json({ error: errorMessage });
    }
  },

  async reorder(req: Request, res: Response) {
    try {
      const { manualId } = req.params;
      const { orderMap } = req.body;

      if (!Array.isArray(orderMap)) {
        return res.status(400).json({ error: 'Invalid order map' });
      }

      const updates = orderMap.map((sectionId, index) =>
        db.update(sections)
          .set({ orderIndex: index })
          .where(eq(sections.id, sectionId))
      );

      await Promise.all(updates);

      res.json({ message: 'Sections reordered successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reorder sections' });
    }
  }
};