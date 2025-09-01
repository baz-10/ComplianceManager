import { Request, Response } from 'express';
import { db } from '@db';
import { sections, insertSectionSchema, type User, policies, policyVersions, acknowledgements, annotations, approvalWorkflows, documentSignatures } from '@db/schema';
import { eq, inArray, and, isNull, desc, asc } from 'drizzle-orm';

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
          createdBy: true,
          parentSection: true,
          childSections: {
            orderBy: [asc(sections.orderIndex)]
          }
        },
        orderBy: [asc(sections.level), asc(sections.orderIndex)]
      });
      res.json(allSections);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sections' });
    }
  },

  async getHierarchy(req: Request, res: Response) {
    try {
      const { manualId } = req.params;
      
      // Get all sections for the manual
      const allSections = await db.query.sections.findMany({
        where: eq(sections.manualId, parseInt(manualId)),
        with: {
          policies: {
            with: {
              currentVersion: true,
            }
          },
          createdBy: true
        },
        orderBy: [asc(sections.level), asc(sections.orderIndex)]
      });

      // Build hierarchical structure
      const sectionMap = new Map();
      const rootSections: any[] = [];

      // First, create a map of all sections
      allSections.forEach(section => {
        sectionMap.set(section.id, {
          ...section,
          children: []
        });
      });

      // Then, build the hierarchy
      allSections.forEach(section => {
        const sectionWithChildren = sectionMap.get(section.id);
        if (section.parentSectionId) {
          const parent = sectionMap.get(section.parentSectionId);
          if (parent) {
            parent.children.push(sectionWithChildren);
          }
        } else {
          rootSections.push(sectionWithChildren);
        }
      });

      res.json(rootSections);
    } catch (error) {
      console.error('Failed to fetch section hierarchy:', error);
      res.status(500).json({ error: 'Failed to fetch section hierarchy' });
    }
  },

  async generateSectionNumber(manualId: number, parentSectionId?: number): Promise<string> {
    try {
      if (!parentSectionId) {
        // Top-level section - find the next available number
        const topLevelSections = await db.query.sections.findMany({
          where: and(
            eq(sections.manualId, manualId),
            isNull(sections.parentSectionId)
          ),
          orderBy: desc(sections.orderIndex)
        });
        
        const nextNumber = (topLevelSections.length) + 1;
        return `${nextNumber}.0`;
      } else {
        // Sub-section - find parent's number and append
        const parentSection = await db.query.sections.findFirst({
          where: eq(sections.id, parentSectionId)
        });
        
        if (!parentSection || !parentSection.sectionNumber) {
          throw new Error('Parent section not found or has no section number');
        }

        // Get sibling sections to determine next sub-number
        const siblingCount = await db.query.sections.findMany({
          where: and(
            eq(sections.manualId, manualId),
            eq(sections.parentSectionId, parentSectionId)
          )
        });

        const nextSubNumber = siblingCount.length + 1;
        return `${parentSection.sectionNumber.replace('.0', '')}.${nextSubNumber}`;
      }
    } catch (error) {
      console.error('Error generating section number:', error);
      return '1.0'; // Fallback
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

      // Determine the level based on parent section
      let level = 0;
      if (result.data.parentSectionId) {
        const parentSection = await db.query.sections.findFirst({
          where: eq(sections.id, result.data.parentSectionId)
        });
        if (parentSection) {
          level = parentSection.level + 1;
        }
      }

      // Generate section number
      const sectionNumber = await SectionController.generateSectionNumber(
        result.data.manualId,
        result.data.parentSectionId
      );

      // Get the next order index for this level/parent
      const siblingCount = await db.query.sections.findMany({
        where: result.data.parentSectionId 
          ? and(
              eq(sections.manualId, result.data.manualId),
              eq(sections.parentSectionId, result.data.parentSectionId)
            )
          : and(
              eq(sections.manualId, result.data.manualId),
              isNull(sections.parentSectionId)
            )
      });

      const [section] = await db.insert(sections)
        .values({
          ...result.data,
          level,
          sectionNumber,
          orderIndex: siblingCount.length,
          createdById: req.user.id
        })
        .returning();

      res.status(201).json(section);
    } catch (error) {
      console.error('Failed to create section:', error);
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

  async deleteWithChildren(tx: any, sectionId: number): Promise<void> {
    // Get all child sections
    const childSections = await tx.query.sections.findMany({
      where: eq(sections.parentSectionId, sectionId),
      with: {
        policies: {
          with: {
            versions: true
          }
        }
      }
    });

    // Recursively delete child sections
    for (const child of childSections) {
      await this.deleteWithChildren(tx, child.id);
    }

    // Get this section with its policies
    const section = await tx.query.sections.findFirst({
      where: eq(sections.id, sectionId),
      with: {
        policies: {
          with: {
            versions: true
          }
        }
      }
    });

    if (section) {
      // Delete all policies and their related data
      for (const policy of section.policies) {
        const versionIds = policy.versions.map(v => v.id);
        
        if (versionIds.length > 0) {
          await tx.delete(acknowledgements)
            .where(inArray(acknowledgements.policyVersionId, versionIds));
          
          await tx.delete(annotations)
            .where(inArray(annotations.policyVersionId, versionIds));
          
          await tx.delete(approvalWorkflows)
            .where(inArray(approvalWorkflows.policyVersionId, versionIds));
          
          await tx.delete(documentSignatures)
            .where(
              and(
                eq(documentSignatures.entityType, 'policy_version'),
                inArray(documentSignatures.entityId, versionIds)
              )
            );
          
          await tx.delete(policyVersions)
            .where(eq(policyVersions.policyId, policy.id));
        }
      }
      
      if (section.policies.length > 0) {
        await tx.delete(policies)
          .where(eq(policies.sectionId, sectionId));
      }
      
      // Delete the section itself
      await tx.delete(sections)
        .where(eq(sections.id, sectionId));
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // First check if the section exists
      const section = await db.query.sections.findFirst({
        where: eq(sections.id, parseInt(id)),
        with: {
          childSections: true,
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
        await SectionController.deleteWithChildren(tx, parseInt(id));
      });

      // Log deletion for audit trail (optional, non-blocking)
      try {
        const { AuditService } = await import('../services/auditService');
        await AuditService.logDeletion(
          req,
          'section',
          parseInt(id),
          `Section "${section.title}" deleted with ${section.childSections.length} child sections and ${section.policies.length} policies`
        );
      } catch (auditError) {
        console.warn('Failed to log section deletion:', auditError);
      }

      res.json({ message: 'Section and all children deleted successfully' });
    } catch (error) {
      console.error('Failed to delete section:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete section';
      res.status(500).json({ error: errorMessage });
    }
  },

  async moveSection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { parentSectionId, orderIndex } = req.body;

      const section = await db.query.sections.findFirst({
        where: eq(sections.id, parseInt(id))
      });

      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }

      await db.transaction(async (tx) => {
        // First, get siblings at the target location to adjust their order
        const targetSiblings = await tx.query.sections.findMany({
          where: parentSectionId 
            ? and(
                eq(sections.manualId, section.manualId),
                eq(sections.parentSectionId, parentSectionId)
              )
            : and(
                eq(sections.manualId, section.manualId),
                isNull(sections.parentSectionId)
              ),
          orderBy: asc(sections.orderIndex)
        });

        // Adjust order indices of existing siblings
        const updatesToMake = [];
        let insertIndex = orderIndex || 0;
        
        // Make room for the moved section
        for (let i = 0; i < targetSiblings.length; i++) {
          const sibling = targetSiblings[i];
          if (sibling.id === parseInt(id)) continue; // Skip the section we're moving
          
          let newOrderIndex = i;
          if (i >= insertIndex) {
            newOrderIndex = i + 1;
          }
          
          if (sibling.orderIndex !== newOrderIndex) {
            updatesToMake.push(
              tx.update(sections)
                .set({ orderIndex: newOrderIndex, updatedAt: new Date() })
                .where(eq(sections.id, sibling.id))
            );
          }
        }

        // Execute sibling updates
        await Promise.all(updatesToMake);

        // Calculate new level and section number for moved section
        let newLevel = 0;
        let newSectionNumber = section.sectionNumber;
        
        if (parentSectionId) {
          const parentSection = await tx.query.sections.findFirst({
            where: eq(sections.id, parentSectionId)
          });
          if (parentSection) {
            newLevel = parentSection.level + 1;
          }
        }

        // Update the moved section
        const [updatedSection] = await tx.update(sections)
          .set({
            parentSectionId: parentSectionId || null,
            level: newLevel,
            orderIndex: insertIndex,
            updatedAt: new Date()
          })
          .where(eq(sections.id, parseInt(id)))
          .returning();

        // Renumber all sections in the manual to ensure consistency
        await SectionController.renumberSectionsInManual(tx, section.manualId);

        return updatedSection;
      });

      res.json({ message: 'Section moved and renumbered successfully' });
    } catch (error) {
      console.error('Failed to move section:', error);
      res.status(500).json({ error: 'Failed to move section' });
    }
  },

  async renumberSectionsInManual(tx: any, manualId: number): Promise<void> {
    // Get all sections for the manual
    const allSections = await tx.query.sections.findMany({
      where: eq(sections.manualId, manualId),
      orderBy: [asc(sections.level), asc(sections.orderIndex)]
    });

    // Build hierarchy map
    const childrenMap = new Map<number | null, any[]>();
    allSections.forEach(section => {
      const parentId = section.parentSectionId;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(section);
    });

    // Recursive function to renumber sections
    const renumberLevel = async (parentId: number | null, parentNumber: string = '', level: number = 0) => {
      const children = childrenMap.get(parentId) || [];
      children.sort((a, b) => a.orderIndex - b.orderIndex);

      const updates = [];
      
      for (let i = 0; i < children.length; i++) {
        const section = children[i];
        let newSectionNumber;
        
        if (level === 0) {
          newSectionNumber = `${i + 1}.0`;
        } else {
          const baseNumber = parentNumber.replace('.0', '');
          newSectionNumber = `${baseNumber}.${i + 1}`;
        }

        updates.push(
          tx.update(sections)
            .set({
              sectionNumber: newSectionNumber,
              orderIndex: i,
              updatedAt: new Date()
            })
            .where(eq(sections.id, section.id))
        );

        // Recursively renumber children
        await renumberLevel(section.id, newSectionNumber, level + 1);
      }
      
      await Promise.all(updates);
    };

    await renumberLevel(null);
  },

  async reorder(req: Request, res: Response) {
    try {
      const { manualId } = req.params;
      const { hierarchicalOrder } = req.body;

      if (!Array.isArray(hierarchicalOrder)) {
        return res.status(400).json({ error: 'Invalid hierarchical order' });
      }

      // Function to recursively update section order
      const updateSectionOrder = async (items: any[], parentId: number | null = null, level: number = 0) => {
        const updates = [];
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          // Generate new section number
          const sectionNumber = parentId 
            ? await SectionController.generateSectionNumber(parseInt(manualId), parentId)
            : `${i + 1}.0`;

          updates.push(
            db.update(sections)
              .set({
                parentSectionId: parentId,
                level,
                orderIndex: i,
                sectionNumber,
                updatedAt: new Date()
              })
              .where(eq(sections.id, item.id))
          );

          // Recursively handle children
          if (item.children && item.children.length > 0) {
            const childUpdates = await updateSectionOrder(item.children, item.id, level + 1);
            updates.push(...childUpdates);
          }
        }
        
        return updates;
      };

      const allUpdates = await updateSectionOrder(hierarchicalOrder);
      await Promise.all(allUpdates);

      res.json({ message: 'Sections reordered successfully' });
    } catch (error) {
      console.error('Failed to reorder sections:', error);
      res.status(500).json({ error: 'Failed to reorder sections' });
    }
  },

  async renumberAllSections(req: Request, res: Response) {
    try {
      const { manualId } = req.params;
      
      // Get all sections for the manual ordered by level and current order
      const allSections = await db.query.sections.findMany({
        where: eq(sections.manualId, parseInt(manualId)),
        orderBy: [asc(sections.level), asc(sections.orderIndex)]
      });

      // Function to renumber sections recursively
      const renumberSections = async (parentId: number | null = null, level: number = 0, parentNumber: string = '') => {
        const sectionsAtLevel = allSections.filter(s => 
          s.parentSectionId === parentId && s.level === level
        );

        const updates = [];
        
        for (let i = 0; i < sectionsAtLevel.length; i++) {
          const section = sectionsAtLevel[i];
          let newSectionNumber;
          
          if (level === 0) {
            newSectionNumber = `${i + 1}.0`;
          } else {
            const baseNumber = parentNumber.replace('.0', '');
            newSectionNumber = `${baseNumber}.${i + 1}`;
          }

          updates.push(
            db.update(sections)
              .set({
                sectionNumber: newSectionNumber,
                orderIndex: i,
                updatedAt: new Date()
              })
              .where(eq(sections.id, section.id))
          );

          // Recursively handle children
          const childUpdates = await renumberSections(section.id, level + 1, newSectionNumber);
          updates.push(...childUpdates);
        }
        
        return updates;
      };

      const allUpdates = await renumberSections();
      await Promise.all(allUpdates);

      res.json({ message: 'All sections renumbered successfully' });
    } catch (error) {
      console.error('Failed to renumber sections:', error);
      res.status(500).json({ error: 'Failed to renumber sections' });
    }
  }
};
