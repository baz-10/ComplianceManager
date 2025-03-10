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
      // Fetch total counts with simpler queries
      const totalStatsResult = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM policies)::int as total_policies,
          (SELECT COUNT(*) FROM users)::int as total_users,
          (SELECT COUNT(*) FROM acknowledgements)::int as total_acknowledgements,
          (SELECT COUNT(*) FROM policy_versions)::int as total_versions
      `);
      const totalStats = totalStatsResult[0];

      // Get compliance stats by user
      const userComplianceResult = await db.execute(sql`
        WITH required_policies AS (
          SELECT 
            u.id as user_id,
            u.username,
            COUNT(DISTINCT p.id)::int as total_required,
            COUNT(DISTINCT a.id)::int as total_acknowledged
          FROM users u
          CROSS JOIN policies p
          LEFT JOIN policy_versions pv ON pv.policy_id = p.id AND pv.id = p.current_version_id
          LEFT JOIN acknowledgements a ON a.policy_version_id = pv.id AND a.user_id = u.id
          WHERE u.role != 'ADMIN'
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
      const userCompliance = userComplianceResult;

      // Get most viewed policies with simpler join
      const topPoliciesResult = await db.execute(sql`
        SELECT 
          p.id,
          p.title,
          COUNT(DISTINCT a.id)::int as acknowledgement_count,
          s.title as section_title,
          m.title as manual_title,
          (SELECT COUNT(*)::int FROM users WHERE role != 'ADMIN') as total_users,
          ROUND((COUNT(DISTINCT a.id)::float / (SELECT COUNT(*)::float FROM users WHERE role != 'ADMIN') * 100)::numeric, 2) as completion_rate
        FROM policies p 
        LEFT JOIN policy_versions pv ON pv.policy_id = p.id
        LEFT JOIN acknowledgements a ON a.policy_version_id = pv.id
        LEFT JOIN sections s ON p.section_id = s.id
        LEFT JOIN manuals m ON s.manual_id = m.id
        GROUP BY p.id, p.title, s.title, m.title
        ORDER BY completion_rate ASC
        LIMIT 5
      `);
      const policiesNeedingAttention = topPoliciesResult;

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
        ORDER BY a.acknowledged_at DESC
        LIMIT 10
      `);
      const recentActivity = recentActivityResult;

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
        GROUP BY dates.date
        ORDER BY dates.date ASC
      `);
      const userEngagement = userEngagementResult;

      // Section completion rates
      const sectionStatsResult = await db.execute(sql`
        WITH section_policy_counts AS (
          SELECT 
            s.id,
            s.title,
            m.title as manual_title,
            COUNT(DISTINCT p.id)::int as total_policies,
            COUNT(DISTINCT a.id)::int as total_acknowledgements,
            (SELECT COUNT(*)::int FROM users WHERE role != 'ADMIN') as total_users
          FROM sections s
          JOIN manuals m ON s.manual_id = m.id
          LEFT JOIN policies p ON p.section_id = s.id
          LEFT JOIN policy_versions pv ON pv.policy_id = p.id
          LEFT JOIN acknowledgements a ON a.policy_version_id = pv.id
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
      const sectionStats = sectionStatsResult;

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