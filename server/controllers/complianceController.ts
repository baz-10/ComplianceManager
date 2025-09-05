import { Request, Response } from 'express';
import { db } from '@db';
import { 
  users, policies, sections, manuals, policyVersions, acknowledgements, policyAssignments, 
  type User, AssignmentTarget, UserRole
} from '@db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

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
        return res.status(403).json({ error: 'Organization context required' });
      }

      const userId = req.user.id;
      const userRole = req.user.role;
      const orgId = req.user.organizationId;

      // Use SQL for efficient joins
      const result = await db.execute(sql`
        WITH required_policies AS (
          SELECT DISTINCT p.id as policy_id
          FROM policies p
          JOIN sections s ON s.id = p.section_id
          JOIN manuals m ON m.id = s.manual_id
          LEFT JOIN policy_assignments pa ON pa.policy_id = p.id
          WHERE m.organization_id = ${orgId}
            AND (
              pa.target_type = 'ALL'
              OR (pa.target_type = 'ROLE' AND pa.role = ${userRole})
              OR (pa.target_type = 'USER' AND pa.user_id = ${userId})
            )
        )
        SELECT 
          p.id,
          p.title,
          p.status,
          p.current_version_id,
          s.id as section_id,
          s.title as section_title,
          m.id as manual_id,
          m.title as manual_title,
          -- ack flag
          CASE WHEN a.id IS NULL THEN false ELSE true END as acked,
          -- read flag via audit logs
          CASE WHEN EXISTS (
            SELECT 1 FROM audit_logs al 
            WHERE al.user_id = ${userId} 
              AND al.entity_type = 'policy' 
              AND al.action = 'VIEW' 
              AND al.entity_id = p.id
          ) THEN true ELSE false END as read
        FROM required_policies rp
        JOIN policies p ON p.id = rp.policy_id
        JOIN sections s ON s.id = p.section_id
        JOIN manuals m ON m.id = s.manual_id
        LEFT JOIN acknowledgements a ON a.policy_version_id = p.current_version_id AND a.user_id = ${userId}
        ORDER BY m.title, s.title, p.title
      `);

      const rows = result.rows.map((r: any) => ({
        policyId: Number(r.id),
        title: r.title as string,
        live: (r.status as string) === 'LIVE',
        currentVersionId: r.current_version_id ? Number(r.current_version_id) : null,
        acked: r.acked === true || r.acked === 'true',
        read: r.read === true || r.read === 'true'
      }));

      // Readers should only get LIVE policies
      const filtered = req.user.role === 'READER' ? rows.filter(i => i.live) : rows;

      // Map to expected client shape with status enum
      const payload = filtered.map(i => ({
        policyId: i.policyId,
        title: i.title,
        currentVersionId: i.currentVersionId,
        status: i.acked ? 'ACKED' as const : (i.read ? 'READ' as const : 'UNREAD' as const),
        live: i.live
      }));

      res.json(payload);
    } catch (error) {
      console.error('Failed to get user compliance:', error);
      res.status(500).json({ error: 'Failed to get user compliance' });
    }
  },

  // Replace assignments for a policy
  async setPolicyAssignments(req: Request, res: Response) {
    try {
      const { policyId } = req.params;
      const parsed = assignmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      // Validate policy exists and get its org
      const policy = await db.query.policies.findFirst({
        where: eq(policies.id, parseInt(policyId)),
        with: { section: { with: { manual: true } } }
      });
      if (!policy) return res.status(404).json({ error: 'Policy not found' });

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

      res.json({ message: 'Assignments updated', assignments: inserted });
    } catch (error) {
      console.error('Failed to set policy assignments:', error);
      res.status(500).json({ error: 'Failed to set policy assignments' });
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
      if (!policy) return res.status(404).json({ error: 'Policy not found' });

      const orgId = policy.section?.manual?.organizationId;
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

      res.json({
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
      console.error('Failed to get policy coverage:', error);
      res.status(500).json({ error: 'Failed to get policy coverage' });
    }
  }
};
