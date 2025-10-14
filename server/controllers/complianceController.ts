import { Request, Response } from 'express';
import { db } from '@db';
import {
  users,
  policies,
  sections,
  manuals,
  acknowledgements,
  policyAssignments,
  type User,
} from '@db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ApiError, sendErrorResponse } from '../utils/errorHandler';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const assignmentSchema = z.object({
  assignments: z.array(z.object({
    targetType: z.enum(['ALL','ROLE','USER']),
    role: z.enum(['ADMIN','EDITOR','READER']).optional(),
    userId: z.number().int().optional(),
    requireAcknowledgement: z.boolean().optional()
  }))
});

export const ComplianceController = {
  // Returns policies required for the current user with read/ack flags
  async getUserCompliance(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return sendErrorResponse(res, new ApiError('Organization context required', 403, 'FORBIDDEN'));
      }

      const userId = req.user.id;
      const userRole = req.user.role;
      const orgId = req.user.organizationId;

      // Use SQL for efficient joins
      const result = await db.execute(sql`
        WITH relevant_policies AS (
          SELECT
            p.id AS policy_id,
            p.title,
            p.status,
            p.current_version_id,
            s.id AS section_id,
            s.title AS section_title,
            m.id AS manual_id,
            m.title AS manual_title,
            COALESCE(BOOL_OR(COALESCE(pa.require_ack, true)), false) AS require_ack,
            COUNT(pa.policy_id) AS assignment_matches
          FROM policies p
          JOIN sections s ON s.id = p.section_id
          JOIN manuals m ON m.id = s.manual_id
          LEFT JOIN policy_assignments pa
            ON pa.policy_id = p.id
            AND (
              pa.target_type = 'ALL'
              OR (pa.target_type = 'ROLE' AND pa.role = ${userRole})
              OR (pa.target_type = 'USER' AND pa.user_id = ${userId})
            )
          WHERE m.organization_id = ${orgId}
          GROUP BY
            p.id, p.title, p.status, p.current_version_id,
            s.id, s.title,
            m.id, m.title
          HAVING COUNT(pa.policy_id) > 0
        )
        SELECT
          rp.policy_id AS id,
          rp.title,
          rp.status,
          rp.current_version_id,
          rp.section_id,
          rp.section_title,
          rp.manual_id,
          rp.manual_title,
          rp.require_ack,
          CASE WHEN a.id IS NULL THEN false ELSE true END AS acked,
          CASE WHEN EXISTS (
            SELECT 1 FROM audit_logs al
            WHERE al.user_id = ${userId}
              AND al.entity_type = 'policy'
              AND al.action = 'VIEW'
              AND al.entity_id = rp.policy_id
          ) THEN true ELSE false END AS read
        FROM relevant_policies rp
        LEFT JOIN acknowledgements a
          ON a.policy_version_id = rp.current_version_id
          AND a.user_id = ${userId}
        ORDER BY rp.manual_title, rp.section_title, rp.title
      `);

      const rows = result.rows.map((r: any) => ({
        policyId: Number(r.id),
        title: r.title as string,
        live: (r.status as string) === 'LIVE',
        status: (r.status as string) ?? 'DRAFT',
        currentVersionId: r.current_version_id ? Number(r.current_version_id) : null,
        acked: r.acked === true || r.acked === 'true',
        read: r.read === true || r.read === 'true',
        manual: {
          id: Number(r.manual_id),
          title: r.manual_title as string,
        },
        section: {
          id: Number(r.section_id),
          title: r.section_title as string,
        },
        requireAck: r.require_ack === true || r.require_ack === 'true',
      }));

      // Readers should only get LIVE policies
      const filtered = req.user.role === 'READER' ? rows.filter(i => i.live) : rows;

      const items = filtered.map((item) => ({
        policyId: item.policyId,
        title: item.title,
        status: (item.status as 'DRAFT' | 'LIVE') ?? 'DRAFT',
        currentVersionId: item.currentVersionId,
        manual: item.manual,
        section: item.section,
        required: true,
        acked: item.acked,
        read: item.read,
        requiresAcknowledgement: item.requireAck,
      }));

      const totals = {
        required: items.length,
        acked: items.filter((i) => i.acked).length,
        unread: items.filter((i) => !i.read).length,
      };

      return res.json({ items, totals });
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  // Replace assignments for a policy
  async setPolicyAssignments(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const parsed = assignmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendErrorResponse(res, parsed.error);
      }

      // Validate policy exists and get its org
      const policy = await db.query.policies.findFirst({
        where: eq(policies.id, parseInt(policyId)),
        with: { section: { with: { manual: true } } }
      });
      if (!policy) {
        return sendErrorResponse(res, new ApiError('Policy not found', 404, 'NOT_FOUND'));
      }

      // Remove existing assignments
      await db.delete(policyAssignments).where(eq(policyAssignments.policyId, policy.id));

      // Insert new ones
      const values = parsed.data.assignments.map(a => ({
        policyId: policy.id,
        targetType: a.targetType as any,
        role: a.role as any || null,
        userId: a.userId || null,
        requireAcknowledgement: a.requireAcknowledgement ?? true
      }));
      let inserted: any[] = [];
      if (values.length > 0) {
        inserted = await db.insert(policyAssignments).values(values).returning();
      }

      return res.json({ message: 'Assignments updated', assignments: inserted });
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  // Coverage for a policy across assigned users
  async getPolicyCoverage(req: Request, res: Response) {
    try {
      const { policyId } = req.params;

      // Fetch policy + org
      const policy = await db.query.policies.findFirst({
        where: eq(policies.id, parseInt(policyId)),
        with: { section: { with: { manual: true } } }
      });
      if (!policy) {
        return sendErrorResponse(res, new ApiError('Policy not found', 404, 'NOT_FOUND'));
      }

      const orgId = policy.section?.manual?.organizationId;
      if (!orgId) {
        return sendErrorResponse(res, new ApiError('Policy is missing organization context', 500, 'INTERNAL_ERROR'));
      }
      const currentVersionId = policy.currentVersionId;

      // Get assignments for policy
      const assigns = await db.query.policyAssignments.findMany({
        where: eq(policyAssignments.policyId, policy.id)
      });

      // Build user set for coverage
      const userIds = new Set<number>();

      // ALL -> all non-admin users in org
      if (assigns.some(a => a.targetType === 'ALL')) {
        const orgUsers = await db.query.users.findMany({
          where: and(eq(users.organizationId, orgId!), inArray(users.role, ['EDITOR','READER'] as any)),
          columns: { id: true }
        });
        orgUsers.forEach(u => userIds.add(u.id));
      }

      // ROLE assignments
      const roleAssignments = assigns.filter(a => a.targetType === 'ROLE' && a.role);
      for (const ra of roleAssignments) {
        const roleUsers = await db.query.users.findMany({
          where: and(eq(users.organizationId, orgId!), eq(users.role, ra.role as any)),
          columns: { id: true }
        });
        roleUsers.forEach(u => userIds.add(u.id));
      }

      // USER assignments
      assigns.filter(a => a.targetType === 'USER' && a.userId).forEach(a => userIds.add(a.userId!));

      const assigned = Array.from(userIds);

      // Acked users set
      let ackedSet = new Set<number>();
      if (currentVersionId && assigned.length > 0) {
        const acked = await db.query.acknowledgements.findMany({
          where: and(
            eq(acknowledgements.policyVersionId, currentVersionId),
            inArray(acknowledgements.userId, assigned)
          ),
          columns: { userId: true }
        });
        ackedSet = new Set(acked.map(a => a.userId));
      }

      return res.json({
        policy: { id: policy.id, title: policy.title, status: policy.status, currentVersionId },
        assignments: assigns,
        totals: {
          assigned: assigned.length,
          acked: Array.from(ackedSet).length,
          percent: assigned.length > 0 ? Math.round((Array.from(ackedSet).length / assigned.length) * 100) : 0
        },
        users: {
          assigned,
          acked: Array.from(ackedSet)
        }
      });
    } catch (error) {
      sendErrorResponse(res, error);
    }
  }
};
