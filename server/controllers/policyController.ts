import { Request, Response } from 'express';
import { db } from '@db';
import { policies, policyVersions, acknowledgements, annotations, type Policy, type PolicyVersion } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createPolicySchema = z.object({
  policy: z.object({
    title: z.string().min(1, "Title is required"),
    sectionId: z.number(),
    createdById: z.number(),
    status: z.enum(["DRAFT", "LIVE"]).default("DRAFT"),
  }),
  version: z.object({
    bodyContent: z.string().min(1, "Content is required"),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    createdById: z.number(),
    authorId: z.number(),
    versionNumber: z.number(),
  }),
});

const updatePolicySchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(["DRAFT", "LIVE"]).optional(),
});

export const PolicyController = {
  async list(req: Request, res: Response) {
    try {
      const { sectionId } = req.params;
      const allPolicies = await db.query.policies.findMany({
        where: eq(policies.sectionId, parseInt(sectionId)),
        with: {
          currentVersion: true,
          createdBy: true
        }
      });
      res.json(allPolicies);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      res.status(500).json({ error: 'Failed to fetch policies' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      console.log('Received policy creation request:', req.body);

      const result = createPolicySchema.safeParse(req.body);
      if (!result.success) {
        console.error('Policy validation failed:', result.error.issues);
        return res.status(400).json({ 
          error: 'Invalid input',
          details: result.error.issues
        });
      }

      const { policy: policyData, version: versionData } = result.data;

      // Create policy
      const [policy] = await db.insert(policies)
        .values({
          title: policyData.title,
          sectionId: policyData.sectionId,
          status: policyData.status,
          createdById: policyData.createdById,
          orderIndex: 0, // Will be updated by reorder if needed
        })
        .returning();

      console.log('Policy created:', policy);

      // Create initial version
      const [version] = await db.insert(policyVersions)
        .values({
          policyId: policy.id,
          versionNumber: versionData.versionNumber,
          bodyContent: versionData.bodyContent,
          effectiveDate: new Date(versionData.effectiveDate),
          authorId: versionData.authorId,
        })
        .returning();

      console.log('Policy version created:', version);

      // Update policy with the current version
      const [updatedPolicy] = await db
        .update(policies)
        .set({ currentVersionId: version.id })
        .where(eq(policies.id, policy.id))
        .returning();

      console.log('Policy updated with current version:', updatedPolicy);

      res.status(201).json({ 
        policy: updatedPolicy,
        version 
      });
    } catch (error) {
      console.error('Failed to create policy:', error);
      res.status(500).json({ error: 'Failed to create policy' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const policy = await db.query.policies.findFirst({
        where: eq(policies.id, parseInt(policyId)),
        with: {
          currentVersion: true,
          createdBy: true
        }
      });

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      res.json(policy);
    } catch (error) {
      console.error('Failed to fetch policy:', error);
      res.status(500).json({ error: 'Failed to fetch policy' });
    }
  },

  async createVersion(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const policy = await db.query.policies.findFirst({
        where: eq(policies.id, parseInt(policyId)),
        with: {
          versions: true
        }
      });

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      const newVersionNumber = policy.versions.length + 1;
      const [version] = await db.insert(policyVersions)
        .values({
          policyId: parseInt(policyId),
          versionNumber: newVersionNumber,
          bodyContent: req.body.bodyContent,
          effectiveDate: new Date(req.body.effectiveDate),
          authorId: req.user!.id,
        })
        .returning();

      await db.update(policies)
        .set({ currentVersionId: version.id })
        .where(eq(policies.id, parseInt(policyId)));

      res.status(201).json(version);
    } catch (error) {
      console.error('Failed to create policy version:', error);
      res.status(500).json({ error: 'Failed to create policy version' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const result = updatePolicySchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ 
          error: 'Invalid input',
          details: result.error.issues
        });
      }

      const [updatedPolicy] = await db
        .update(policies)
        .set({ 
          title: result.data.title,
          status: result.data.status,
          updatedAt: new Date()
        })
        .where(eq(policies.id, parseInt(policyId)))
        .returning();

      if (!updatedPolicy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      res.json(updatedPolicy);
    } catch (error) {
      console.error('Failed to update policy:', error);
      res.status(500).json({ error: 'Failed to update policy' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { policyId } = req.params;

      // First check if the policy exists
      const [policy] = await db
        .select()
        .from(policies)
        .where(eq(policies.id, parseInt(policyId)))
        .limit(1);

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      // Begin transaction to ensure all related records are deleted
      await db.transaction(async (tx) => {
        // Delete all acknowledgements for all versions of this policy
        await tx.delete(acknowledgements)
          .where(
            eq(acknowledgements.policyVersionId, 
              db.select({ id: policyVersions.id })
                .from(policyVersions)
                .where(eq(policyVersions.policyId, parseInt(policyId)))
                .limit(1)
            )
          );

        // Delete all annotations for all versions of this policy
        await tx.delete(annotations)
          .where(
            eq(annotations.policyVersionId,
              db.select({ id: policyVersions.id })
                .from(policyVersions)
                .where(eq(policyVersions.policyId, parseInt(policyId)))
                .limit(1)
            )
          );

        // Delete all versions of this policy
        await tx.delete(policyVersions)
          .where(eq(policyVersions.policyId, parseInt(policyId)));

        // Finally delete the policy itself
        await tx.delete(policies)
          .where(eq(policies.id, parseInt(policyId)));
      });

      res.json({ message: 'Policy deleted successfully' });
    } catch (error) {
      console.error('Failed to delete policy:', error);
      res.status(500).json({ error: 'Failed to delete policy' });
    }
  },

  async acknowledge(req: Request, res: Response) {
    try {
      const { policyVersionId } = req.params;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const existing = await db.query.acknowledgements.findFirst({
        where: and(
          eq(acknowledgements.userId, req.user.id),
          eq(acknowledgements.policyVersionId, parseInt(policyVersionId))
        )
      });

      if (existing) {
        return res.status(400).json({ error: 'Already acknowledged' });
      }

      const [acknowledgement] = await db.insert(acknowledgements)
        .values({
          userId: req.user.id,
          policyVersionId: parseInt(policyVersionId)
        })
        .returning();

      res.status(201).json(acknowledgement);
    } catch (error) {
      console.error('Failed to acknowledge policy:', error);
      res.status(500).json({ error: 'Failed to acknowledge policy' });
    }
  },

  async getVersionHistory(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const versions = await db.query.policyVersions.findMany({
        where: eq(policyVersions.policyId, parseInt(policyId)),
        orderBy: policyVersions.versionNumber,
        with: {
          author: true,
          acknowledgements: {
            with: {
              user: true
            }
          }
        }
      });

      res.json(versions);
    } catch (error) {
      console.error('Failed to fetch version history:', error);
      res.status(500).json({ error: 'Failed to fetch version history' });
    }
  },

  async reorder(req: Request, res: Response) {
    try {
      const { sectionId } = req.params;
      const { orderMap } = req.body;

      if (!Array.isArray(orderMap)) {
        return res.status(400).json({ error: 'Invalid order map' });
      }

      const updates = orderMap.map((policyId, index) =>
        db.update(policies)
          .set({ orderIndex: index })
          .where(eq(policies.id, policyId))
      );

      await Promise.all(updates);

      res.json({ message: 'Policies reordered successfully' });
    } catch (error) {
      console.error('Failed to reorder policies:', error);
      res.status(500).json({ error: 'Failed to reorder policies' });
    }
  }
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}