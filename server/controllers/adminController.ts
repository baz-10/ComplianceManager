import { Request, Response } from 'express';
import { db } from '@db';
import { type User } from '@db/schema';
import { sql } from 'drizzle-orm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const AdminController = {
  async getPerformanceMetrics(_req: Request, res: Response) {
    try {
      const orgId = (res.req.user as any)?.organizationId;
      if (!orgId) {
        return res.status(403).json({ error: 'Organization context required' });
      }
      // Fetch total counts (excluding policies from archived manuals)
      const totalStatsResult = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM policies p
           JOIN sections s ON s.id = p.section_id
           JOIN manuals m ON m.id = s.manual_id
           WHERE m.archived_at IS NULL AND m.organization_id = ${orgId})::int as total_policies,
          (SELECT COUNT(*) FROM users WHERE role != 'ADMIN' AND organization_id = ${orgId})::int as total_users,
          (SELECT COUNT(*) 
           FROM acknowledgements a
           JOIN policy_versions pv ON pv.id = a.policy_version_id
           JOIN policies p ON p.id = pv.policy_id
           JOIN sections s ON s.id = p.section_id
           JOIN manuals m ON m.id = s.manual_id
           WHERE m.organization_id = ${orgId})::int as total_acknowledgements,
          (SELECT COUNT(*) 
           FROM policy_versions pv
           JOIN policies p ON p.id = pv.policy_id
           JOIN sections s ON s.id = p.section_id
           JOIN manuals m ON m.id = s.manual_id
           WHERE m.organization_id = ${orgId})::int as total_versions
      `);
      const totalStats = totalStatsResult.rows[0];

      // Get compliance stats by user (excluding policies from archived manuals)
      const userComplianceResult = await db.execute(sql`
        WITH required_policies AS (
          SELECT 
            u.id as user_id,
            u.username,
            COUNT(DISTINCT p.id)::int as total_required,
            COUNT(DISTINCT a.id)::int as total_acknowledged
          FROM users u
          JOIN policies p ON 1=1
          JOIN sections s ON s.id = p.section_id
          JOIN manuals m ON m.id = s.manual_id
          LEFT JOIN policy_versions pv ON pv.policy_id = p.id AND pv.id = p.current_version_id
          LEFT JOIN acknowledgements a ON a.policy_version_id = pv.id AND a.user_id = u.id
          WHERE u.role != 'ADMIN' AND u.organization_id = ${orgId}
            AND m.archived_at IS NULL AND m.organization_id = ${orgId}
          GROUP BY u.id, u.username
        )
        SELECT 
          user_id,
          username,
          total_required,
          total_acknowledged,
          CASE 
            WHEN total_required > 0
            THEN ROUND((total_acknowledged::float / total_required::float * 100)::numeric, 2)
            ELSE 0
          END as compliance_rate
        FROM required_policies
        ORDER BY compliance_rate DESC
      `);
      const userCompliance = userComplianceResult.rows;

      // Get policies needing attention (excluding policies from archived manuals)
      const policiesNeedingAttentionResult = await db.execute(sql`
        WITH total_non_admin_users AS (
          SELECT 
            COUNT(*)::int AS total_users,
            NULLIF(COUNT(*)::numeric, 0) AS total_users_metric
          FROM users 
          WHERE role != 'ADMIN' AND organization_id = ${orgId}
        )
        SELECT 
          p.id,
          p.title,
          COUNT(DISTINCT a.id)::int as acknowledgement_count,
          s.title as section_title,
          m.title as manual_title,
          t.total_users,
          CASE 
            WHEN t.total_users_metric IS NULL THEN 0
            ELSE ROUND((COUNT(DISTINCT a.id)::numeric / t.total_users_metric) * 100, 2)
          END as completion_rate
        FROM policies p 
        LEFT JOIN policy_versions pv ON pv.policy_id = p.id
        LEFT JOIN acknowledgements a ON a.policy_version_id = pv.id
        LEFT JOIN sections s ON p.section_id = s.id
        LEFT JOIN manuals m ON s.manual_id = m.id
        CROSS JOIN total_non_admin_users t
        WHERE m.archived_at IS NULL AND m.organization_id = ${orgId}
        GROUP BY p.id, p.title, s.title, m.title, t.total_users, t.total_users_metric
        ORDER BY completion_rate ASC
        LIMIT 5
      `);
      const policiesNeedingAttention = policiesNeedingAttentionResult.rows;

      // Recent activity
      const recentActivityResult = await db.execute(sql`
        SELECT 
          u.username,
          p.title as policy_title,
          a.acknowledged_at,
          'acknowledgement' as activity_type
        FROM acknowledgements a
        JOIN users u ON a.user_id = u.id
        JOIN policy_versions pv ON a.policy_version_id = pv.id
        JOIN policies p ON pv.policy_id = p.id
        JOIN sections s ON s.id = p.section_id
        JOIN manuals m ON m.id = s.manual_id
        WHERE m.organization_id = ${orgId}
        ORDER BY a.acknowledged_at DESC
        LIMIT 10
      `);
      const recentActivity = recentActivityResult.rows;

      // User engagement over time (last 30 days)
      const userEngagementResult = await db.execute(sql`
        WITH RECURSIVE dates AS (
          SELECT CURRENT_DATE - INTERVAL '29 days' as date
          UNION ALL
          SELECT date + INTERVAL '1 day'
          FROM dates
          WHERE date < CURRENT_DATE
        )
        SELECT 
          dates.date::text,
          COALESCE(COUNT(a.id), 0)::int as count
        FROM dates
        LEFT JOIN acknowledgements a 
          ON DATE(a.acknowledged_at) = dates.date
        LEFT JOIN policy_versions pv ON pv.id = a.policy_version_id
        LEFT JOIN policies p ON p.id = pv.policy_id
        LEFT JOIN sections s ON s.id = p.section_id
        LEFT JOIN manuals m ON m.id = s.manual_id
        WHERE m.organization_id = ${orgId}
        GROUP BY dates.date
        ORDER BY dates.date ASC
      `);
      const userEngagement = userEngagementResult.rows;

      // Section completion rates
      const sectionStatsResult = await db.execute(sql`
        WITH section_policy_counts AS (
          SELECT 
            s.id,
            s.title,
            m.title as manual_title,
            COUNT(DISTINCT p.id)::int as total_policies,
            COUNT(DISTINCT a.id)::int as total_acknowledgements,
            (SELECT COUNT(*)::int FROM users WHERE role != 'ADMIN' AND organization_id = ${orgId}) as total_users
          FROM sections s
          JOIN manuals m ON s.manual_id = m.id
          LEFT JOIN policies p ON p.section_id = s.id
          LEFT JOIN policy_versions pv ON pv.policy_id = p.id
          LEFT JOIN acknowledgements a ON a.policy_version_id = pv.id
          WHERE m.organization_id = ${orgId}
          GROUP BY s.id, s.title, m.title
        )
        SELECT 
          id,
          title,
          manual_title,
          total_policies,
          total_acknowledgements,
          CASE 
            WHEN total_policies > 0 AND total_users > 0
            THEN ROUND((total_acknowledgements::float / (total_policies * total_users))::numeric * 100, 2)
            ELSE 0 
          END as completion_rate
        FROM section_policy_counts
        WHERE total_policies > 0
        ORDER BY completion_rate DESC
      `);
      const sectionStats = sectionStatsResult.rows;

      res.json({
        totalStats,
        userCompliance,
        policiesNeedingAttention,
        recentActivity,
        userEngagement,
        sectionStats
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
  },

  async getAuditTrail(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, entityType, action, severity, userId, startDate, endDate } = req.query;
      const orgId = (req.user as any)?.organizationId;
      if (!orgId) {
        return res.status(403).json({ error: 'Organization context required' });
      }
      
      let whereConditions = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Build dynamic WHERE clause
      if (entityType) {
        whereConditions.push(`entity_type = $${paramIndex++}`);
        params.push(entityType);
      }
      if (action) {
        whereConditions.push(`action = $${paramIndex++}`);
        params.push(action);
      }
      if (severity) {
        whereConditions.push(`severity = $${paramIndex++}`);
        params.push(severity);
      }
      if (userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        params.push(parseInt(userId as string));
      }
      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
      }
      if (endDate) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      // Org scoping: restrict to logs tied to this organization
      const orgParamIndex = paramIndex++;
      params.push(orgId);
      const orgScope = `((al.entity_type = 'policy' AND EXISTS (
          SELECT 1 FROM policies p
          JOIN sections s ON s.id = p.section_id
          JOIN manuals m ON m.id = s.manual_id
          WHERE p.id = al.entity_id AND m.organization_id = $${orgParamIndex}
        )) OR (al.entity_type = 'policy_version' AND EXISTS (
          SELECT 1 FROM policy_versions pv
          JOIN policies p ON p.id = pv.policy_id
          JOIN sections s ON s.id = p.section_id
          JOIN manuals m ON m.id = s.manual_id
          WHERE pv.id = al.entity_id AND m.organization_id = $${orgParamIndex}
        )) OR (al.entity_type = 'manual' AND EXISTS (
          SELECT 1 FROM manuals m WHERE m.id = al.entity_id AND m.organization_id = $${orgParamIndex}
        )) OR (al.user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM users ux WHERE ux.id = al.user_id AND ux.organization_id = $${orgParamIndex}
        )))`;

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')} AND ${orgScope}`
        : `WHERE ${orgScope}`;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Get audit logs with pagination
      const auditResult = await db.execute(sql.raw(`
        SELECT 
          al.id,
          al.entity_type,
          al.entity_id,
          al.action,
          al.change_details,
          al.ip_address,
          al.user_agent,
          al.severity,
          al.compliance_flags,
          al.created_at,
          u.username,
          u.role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `, [...params, parseInt(limit as string), offset]));

      // Get total count for pagination
      const countResult = await db.execute(sql.raw(`
        SELECT COUNT(*) as total
        FROM audit_logs al
        ${whereClause}
      `, params));

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit as string));

      res.json({
        auditLogs: auditResult.rows,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages,
          totalItems: total,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1
        }
      });
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      res.status(500).json({ error: 'Failed to fetch audit trail data' });
    }
  },

  async getComplianceReport(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const orgId = (req.user as any)?.organizationId;
      if (!orgId) {
        return res.status(403).json({ error: 'Organization context required' });
      }
      
      // Get compliance overview
      const complianceOverview = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END)::int as critical_events,
          COUNT(CASE WHEN severity = 'HIGH' THEN 1 END)::int as high_events,
          COUNT(CASE WHEN action = 'EXPORT' THEN 1 END)::int as export_events,
          COUNT(CASE WHEN action = 'PUBLISH' THEN 1 END)::int as publish_events,
          COUNT(CASE WHEN action = 'ACKNOWLEDGE' THEN 1 END)::int as acknowledgment_events,
          COUNT(CASE WHEN 'casa_compliance' = ANY(compliance_flags) THEN 1 END)::int as casa_events
        FROM audit_logs al
        WHERE al.created_at >= COALESCE(${startDate}, CURRENT_DATE - INTERVAL '30 days')
          AND al.created_at <= COALESCE(${endDate}, CURRENT_DATE + INTERVAL '1 day')
          AND EXISTS (
            SELECT 1 FROM policies p
            JOIN sections s ON s.id = p.section_id
            JOIN manuals m ON m.id = s.manual_id
            WHERE (
              (al.entity_type = 'policy' AND al.entity_id = p.id)
              OR (al.entity_type = 'policy_version' AND al.entity_id IN (
                SELECT pv.id FROM policy_versions pv WHERE pv.policy_id = p.id
              ))
            ) AND m.organization_id = ${orgId}
          )
      `);

      // Get user activity summary
      const userActivity = await db.execute(sql`
        SELECT 
          u.username,
          u.role,
          COUNT(al.id)::int as total_actions,
          COUNT(CASE WHEN al.severity IN ('HIGH', 'CRITICAL') THEN 1 END)::int as high_risk_actions,
          MAX(al.created_at) as last_activity
        FROM users u
        LEFT JOIN audit_logs al ON u.id = al.user_id
          AND al.created_at >= COALESCE(${startDate}, CURRENT_DATE - INTERVAL '30 days')
          AND al.created_at <= COALESCE(${endDate}, CURRENT_DATE + INTERVAL '1 day')
        WHERE u.role != 'ADMIN' AND u.organization_id = ${orgId}
        GROUP BY u.id, u.username, u.role
        ORDER BY total_actions DESC
      `);

      // Get policy compliance status
      const policyCompliance = await db.execute(sql`
        SELECT 
          p.title as policy_title,
          s.title as section_title,
          m.title as manual_title,
          COUNT(DISTINCT u.id)::int as total_users,
          COUNT(DISTINCT a.user_id)::int as acknowledged_users,
          ROUND(
            (COUNT(DISTINCT a.user_id)::float / COUNT(DISTINCT u.id)::float * 100)::numeric, 
            2
          ) as compliance_percentage,
          COUNT(CASE WHEN al.action = 'ACKNOWLEDGE' 
                     AND al.created_at >= COALESCE(${startDate}, CURRENT_DATE - INTERVAL '30 days')
                     AND al.created_at <= COALESCE(${endDate}, CURRENT_DATE + INTERVAL '1 day')
                THEN 1 END)::int as recent_acknowledgments
        FROM policies p
        JOIN sections s ON p.section_id = s.id
        JOIN manuals m ON s.manual_id = m.id
        LEFT JOIN policy_versions pv ON p.current_version_id = pv.id
        LEFT JOIN acknowledgements a ON pv.id = a.policy_version_id
        LEFT JOIN audit_logs al ON pv.id = al.entity_id AND al.entity_type = 'policy_version'
        JOIN users u ON u.role != 'ADMIN' AND u.organization_id = ${orgId}
        WHERE p.status = 'LIVE' AND m.organization_id = ${orgId}
        GROUP BY p.id, p.title, s.title, m.title
        ORDER BY compliance_percentage ASC
      `);

      res.json({
        overview: complianceOverview.rows[0],
        userActivity: userActivity.rows,
        policyCompliance: policyCompliance.rows,
        reportGenerated: new Date().toISOString(),
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  },

  async logExportEvent(req: Request, res: Response) {
    try {
      const { entityType, entityId, format, details, fileName } = req.body;
      
      // Import AuditService dynamically to avoid circular imports
      const { AuditService } = await import('../services/auditService');
      
      await AuditService.logExport(
        req, 
        entityType as 'manual' | 'policy', 
        entityId, 
        format, 
        `${details} - File: ${fileName}`
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error logging export event:', error);
      res.status(500).json({ error: 'Failed to log export event' });
    }
  }
};

// Middleware to track database queries
export function trackDatabaseQueries(req: Request, res: Response, next: () => void) {
  if (req.path.startsWith('/api')) {
    // You could enhance this to track specific types of queries
    // or store them in a separate analytics table
    console.log(`API Request: ${req.method} ${req.path}`);
  }
  next();
}
