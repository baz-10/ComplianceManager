import { Request, Response } from 'express';
import { db } from '@db';
import { policies, policyVersions, acknowledgements, annotations, auditLogs, policyAssignments, sections, manuals, type Policy, type User } from '@db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
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

async function assertSectionOwnership(req: Request, sectionId: number) {
  const section = await db.query.sections.findFirst({
    where: eq(sections.id, sectionId),
    columns: { id: true, manualId: true }
  });

  if (!section) {
    throw new ApiError('Section not found', 404, 'NOT_FOUND');
  }

  const manual = await db.query.manuals.findFirst({
    where: eq(manuals.id, section.manualId),
    columns: { id: true, organizationId: true }
  });

  if (!manual || !req.user?.organizationId || manual.organizationId !== req.user.organizationId) {
    throw new ApiError('Section not found', 404, 'NOT_FOUND');
  }

  return { section, manual };
}

async function assertPolicyOwnership(req: Request, policyId: number) {
  const policy = await db.query.policies.findFirst({
    where: eq(policies.id, policyId),
    columns: {
      id: true,
      sectionId: true,
      status: true,
      currentVersionId: true,
      title: true
    }
  });

  if (!policy) {
    throw new ApiError('Policy not found', 404, 'NOT_FOUND');
  }

  const context = await assertSectionOwnership(req, policy.sectionId);
  return { policy, ...context };
}

async function ensureDefaultAllAssignment(policyId: number) {
  try {
    const existing = await db.query.policyAssignments.findFirst({
      where: and(
        eq(policyAssignments.policyId, policyId),
        eq(policyAssignments.targetType, 'ALL')
      ),
      columns: { id: true }
    });

    if (!existing) {
      await db.insert(policyAssignments).values({
        policyId,
        targetType: 'ALL',
        requireAcknowledgement: true
      });
    }
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.warn('[Policy] policy_assignments table not found; default ALL assignment skipped');
      return;
    }
    throw error;
  }
}

export const PolicyController = {
  async list(req: Request, res: Response) {
    try {
      const { sectionId } = req.params;
      await assertSectionOwnership(req, parseInt(sectionId, 10));
      const isReader = (req.user as any)?.role === 'READER';
      const whereClause = isReader
        ? and(eq(policies.sectionId, parseInt(sectionId)), eq(policies.status, 'LIVE'))
        : eq(policies.sectionId, parseInt(sectionId));
      const allPolicies = await db.query.policies.findMany({
        where: whereClause,
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

      if (!req.user) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const { policy: policyData, version: versionData } = result.data;
      await assertSectionOwnership(req, policyData.sectionId);
      const userId = req.user.id;

      // Get the next order index for this section
      const existingPolicies = await db.query.policies.findMany({
        where: eq(policies.sectionId, policyData.sectionId),
        orderBy: desc(policies.orderIndex)
      });
      const nextOrderIndex = existingPolicies.length > 0 ? existingPolicies[0].orderIndex + 1 : 0;

      // Create policy
      const [policy] = await db.insert(policies)
        .values({
          title: policyData.title,
          sectionId: policyData.sectionId,
          status: policyData.status,
          createdById: userId,
          orderIndex: nextOrderIndex,
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
          authorId: userId,
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

      await ensureDefaultAllAssignment(policy.id);

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

      await assertSectionOwnership(req, policy.sectionId);

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

      await assertSectionOwnership(req, policy.sectionId);

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

      const numericPolicyId = parseInt(policyId, 10);
      await assertPolicyOwnership(req, numericPolicyId);

      // Fetch existing policy to detect status changes for audit logging
      const existing = await db.query.policies.findFirst({
        where: eq(policies.id, numericPolicyId),
        with: { currentVersion: true }
      });

      const [updatedPolicy] = await db
        .update(policies)
        .set({
          title: result.data.title,
          status: result.data.status,
          updatedAt: new Date()
        })
        .where(eq(policies.id, numericPolicyId))
        .returning();

      if (!updatedPolicy) {
        throw new ApiError('Policy not found', 404, 'NOT_FOUND');
      }

      await ensureDefaultAllAssignment(updatedPolicy.id);

      // If status changed, log publish/unpublish event
      try {
        if (existing && typeof result.data.status !== 'undefined' && existing.status !== result.data.status) {
          const action = result.data.status === 'LIVE' ? 'PUBLISH' : 'UNPUBLISH';
          await AuditService.logEvent(req, 'policy', updatedPolicy.id, action, {
            previousState: { status: existing.status },
            newState: { status: updatedPolicy.status, currentVersionId: updatedPolicy.currentVersionId },
            changeDetails: `Policy status changed to ${updatedPolicy.status}`,
            severity: 'HIGH',
            complianceFlags: ['policy_lifecycle']
          });
        }
      } catch (auditError) {
        console.warn('Failed to log publish/unpublish event:', auditError);
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
      const numericPolicyId = parseInt(policyId, 10);
      await assertPolicyOwnership(req, numericPolicyId);

      // Delete the policy row; ON DELETE CASCADE cleans up versions, acknowledgements, annotations
      const result = await db.delete(policies).where(eq(policies.id, numericPolicyId)).returning();
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
      // Support both routes: /policies/:policyId/acknowledge and /versions/:policyVersionId/acknowledge
      const { policyId, policyVersionId } = req.params as any;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get the current version of the policy
      let policy: (Policy & { currentVersion?: any }) | null = null;
      if (policyId) {
        policy = await db.query.policies.findFirst({
          where: eq(policies.id, parseInt(policyId)),
          with: { currentVersion: true }
        });
      } else if (policyVersionId) {
        const version = await db.query.policyVersions.findFirst({
          where: eq(policyVersions.id, parseInt(policyVersionId)),
          with: { policy: true }
        });
        if (version) {
          policy = await db.query.policies.findFirst({
            where: eq(policies.id, version.policyId),
            with: { currentVersion: true }
          });
        }
      }

      if (!policy || !policy.currentVersion) {
        return res.status(404).json({ error: 'Policy or current version not found' });
      }

      await assertSectionOwnership(req, policy.sectionId);

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

  // Track policy view for read/unread badge via audit log
  async recordView(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const { dwellMs } = req.body || {};

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const policy = await db.query.policies.findFirst({
        where: eq(policies.id, parseInt(policyId)),
        columns: { id: true, currentVersionId: true, title: true, sectionId: true }
      });

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      await assertSectionOwnership(req, policy.sectionId);

      // Log a lightweight audit entry instead of a separate policy_views table for now
      try {
        await AuditService.logEvent(req, 'policy', policy.id, 'VIEW', {
          changeDetails: `Viewed policy"${policy.title}"${typeof dwellMs === 'number' ? ` (dwell ${dwellMs}ms)` : ''}`,
          severity: 'LOW',
          complianceFlags: ['user_engagement']
        });
      } catch (auditError) {
        console.warn('Failed to log policy view:', auditError);
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Failed to record policy view:', error);
      res.status(500).json({ error: 'Failed to record policy view' });
    }
  },

  async getVersionHistory(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      await assertPolicyOwnership(req, parseInt(policyId, 10));
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

      const { section } = await assertSectionOwnership(req, parseInt(sectionId, 10));

      const updates = orderMap.map((policyId, index) =>
        db.update(policies)
          .set({ orderIndex: index })
          .where(and(eq(policies.id, policyId), eq(policies.sectionId, section.id)))
      );

      await Promise.all(updates);

      res.json({ message: 'Policies reordered successfully' });
    } catch (error) {
      console.error('Failed to reorder policies:', error);
      res.status(500).json({ error: 'Failed to reorder policies' });
    }
  },

  // Utility function to fix orderIndex for existing policies
  async fixOrderIndices(req: Request, res: Response) {
    try {
      const { sectionId } = req.params;
      const { section } = await assertSectionOwnership(req, parseInt(sectionId, 10));
      
      // Get all policies in the section ordered by creation time
      const sectionPolicies = await db.query.policies.findMany({
        where: eq(policies.sectionId, section.id),
        orderBy: [asc(policies.createdAt), asc(policies.id)]
      });

      // Update each policy with proper order index
      const updates = sectionPolicies.map((policy, index) =>
        db.update(policies)
          .set({ orderIndex: index })
          .where(eq(policies.id, policy.id))
      );

      await Promise.all(updates);

      res.json({ 
        message: `Fixed orderIndex for ${sectionPolicies.length} policies in section ${sectionId}` 
      });
    } catch (error) {
      console.error('Failed to fix order indices:', error);
      res.status(500).json({ error: 'Failed to fix order indices' });
    }
  }
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}
