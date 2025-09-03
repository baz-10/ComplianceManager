import { Request, Response } from 'express';
import { db } from '@db';
import { policies, policyVersions, acknowledgements, annotations, type Policy, type User } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { ApiError, sendErrorResponse } from '../utils/errorHandler';
import { AuditService } from '../services/auditService';

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
      sendErrorResponse(res, error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      console.log('Received policy creation request:', req.body);

      const result = createPolicySchema.safeParse(req.body);
      if (!result.success) {
        console.error('Policy validation failed:', result.error);
        return sendErrorResponse(res, result.error);
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
      sendErrorResponse(res, error);
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
        throw new ApiError('Policy not found', 404, 'NOT_FOUND');
      }

      res.json(policy);
    } catch (error) {
      console.error('Failed to fetch policy:', error);
      sendErrorResponse(res, error);
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
        throw new ApiError('Policy not found', 404, 'NOT_FOUND');
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
      sendErrorResponse(res, error);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const result = updatePolicySchema.safeParse(req.body);

      if (!result.success) {
        return sendErrorResponse(res, result.error);
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
        throw new ApiError('Policy not found', 404, 'NOT_FOUND');
      }

      res.json(updatedPolicy);
    } catch (error) {
      console.error('Failed to update policy:', error);
      sendErrorResponse(res, error);
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { policyId } = req.params;

      // Delete the policy row; ON DELETE CASCADE cleans up versions, acknowledgements, annotations
      const result = await db.delete(policies).where(eq(policies.id, parseInt(policyId))).returning();
      if (!result || result.length === 0) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      res.json({ message: 'Policy deleted successfully' });
    } catch (error) {
      console.error('Failed to delete policy:', error);
      res.status(500).json({ error: 'Failed to delete policy' });
    }
  },

  async acknowledge(req: Request, res: Response) {
    try {
      const { policyId } = req.params;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get the current version of the policy
      const policy = await db.query.policies.findFirst({
        where: eq(policies.id, parseInt(policyId)),
        with: {
          currentVersion: true
        }
      });

      if (!policy || !policy.currentVersion) {
        return res.status(404).json({ error: 'Policy or current version not found' });
      }

      // Check if already acknowledged
      const existing = await db.query.acknowledgements.findFirst({
        where: and(
          eq(acknowledgements.userId, req.user.id),
          eq(acknowledgements.policyVersionId, policy.currentVersion.id)
        )
      });

      if (existing) {
        return res.status(400).json({ error: 'Already acknowledged' });
      }

      // Create acknowledgement
      const [acknowledgement] = await db.insert(acknowledgements)
        .values({
          userId: req.user.id,
          policyVersionId: policy.currentVersion.id,
          acknowledgedAt: new Date()
        })
        .returning();

      // Log acknowledgment for audit trail
      try {
        const { AuditService } = await import('../services/auditService');
        await AuditService.logAcknowledgment(
          req,
          policy.currentVersion.id,
          `Policy "${policy.title}" acknowledged by user ${req.user.username} (version ${policy.currentVersion.versionNumber})`
        );
      } catch (auditError) {
        console.warn('Failed to log acknowledgment:', auditError);
      }

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
