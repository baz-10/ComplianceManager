import { Request, Response } from 'express';
import { db } from '@db';
import { policies, policyVersions } from '@db/schema';
import { eq } from 'drizzle-orm';
import { AIService } from '../services/aiService';
import { z } from 'zod';
import { sendErrorResponse } from '../utils/errorHandler';

const generatePolicySchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  context: z.string().min(1, "Context is required"),
});

export const AIPolicyController = {
  async suggestImprovements(req: Request, res: Response) {
    try {
      const { policyId, versionId } = req.params;

      const policy = await db.query.policies.findFirst({
        where: eq(policies.id, parseInt(policyId)),
        with: {
          currentVersion: true
        }
      });

      if (!policy || !policy.currentVersion) {
        return res.status(404).json({ error: 'Policy or version not found' });
      }

      const suggestions = await AIService.suggestPolicyImprovements(policy, policy.currentVersion);
      res.json({ suggestions });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      sendErrorResponse(res, error);
    }
  },

  async generateDraft(req: Request, res: Response) {
    try {
      const result = generatePolicySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { topic, context } = result.data;
      const draft = await AIService.generatePolicyDraft(topic, context);
      res.json({ draft });
    } catch (error) {
      console.error('Error generating draft:', error);
      sendErrorResponse(res, error);
    }
  }
};
