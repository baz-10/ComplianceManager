import { Request, Response } from 'express';
import { db } from '@db';
import { policies, policyVersions, acknowledgements, insertPolicySchema, insertPolicyVersionSchema, type User } from '@db/schema';
import { eq, and } from 'drizzle-orm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

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
      res.status(500).json({ error: 'Failed to fetch policies' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const policyResult = insertPolicySchema.safeParse(req.body.policy);
      const versionResult = insertPolicyVersionSchema.safeParse(req.body.version);

      if (!policyResult.success || !versionResult.success) {
        return res.status(400).json({ 
          error: 'Invalid input',
          policyErrors: policyResult.success ? null : policyResult.error.message,
          versionErrors: versionResult.success ? null : versionResult.error.message
        });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Create policy with proper type inference
      const [policy] = await db.insert(policies)
        .values({
          title: policyResult.data.title,
          sectionId: policyResult.data.sectionId,
          status: policyResult.data.status,
          createdById: req.user.id
        })
        .returning();

      // Create initial version with proper type inference
      const [version] = await db.insert(policyVersions)
        .values({
          policyId: policy.id,
          versionNumber: 1,
          bodyContent: versionResult.data.bodyContent,
          effectiveDate: versionResult.data.effectiveDate,
          authorId: req.user.id,
          changeSummary: versionResult.data.changeSummary,
          attachments: versionResult.data.attachments || []
        })
        .returning();

      // Update policy with the current version
      await db.update(policies)
        .set({ currentVersionId: version.id })
        .where(eq(policies.id, policy.id));

      res.status(201).json({ policy, version });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create policy' });
    }
  },

  async createVersion(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const result = insertPolicyVersionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

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

      // Create new version with proper type inference
      const [version] = await db.insert(policyVersions)
        .values({
          policyId: parseInt(policyId),
          versionNumber: newVersionNumber,
          bodyContent: result.data.bodyContent,
          effectiveDate: result.data.effectiveDate,
          authorId: req.user.id,
          changeSummary: result.data.changeSummary,
          attachments: result.data.attachments || []
        })
        .returning();

      await db.update(policies)
        .set({ currentVersionId: version.id })
        .where(eq(policies.id, parseInt(policyId)));

      res.status(201).json(version);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create policy version' });
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
      res.status(500).json({ error: 'Failed to fetch version history' });
    }
  }
};