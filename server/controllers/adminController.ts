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
      // Fetch total counts
      const [totalStats] = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM policies) as total_policies,
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM acknowledgements) as total_acknowledgements,
          (SELECT COUNT(*) FROM policy_versions) as total_versions
      `);

      // Get most viewed policies (based on acknowledgments)
      const topPolicies = await db.execute(sql`
        SELECT 
          p.id,
          p.title,
          COUNT(a.id) as acknowledgement_count,
          s.title as section_title,
          m.title as manual_title
        FROM policies p 
        LEFT JOIN acknowledgements a ON a.policy_version_id IN (
          SELECT id FROM policy_versions WHERE policy_id = p.id
        )
        LEFT JOIN sections s ON p.section_id = s.id
        LEFT JOIN manuals m ON s.manual_id = m.id
        GROUP BY p.id, p.title, s.title, m.title
        ORDER BY acknowledgement_count DESC
        LIMIT 5
      `);

      // Recent activity
      const recentActivity = await db.execute(sql`
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

      // User engagement over time (last 30 days)
      const userEngagement = await db.execute(sql`
        SELECT 
          DATE(acknowledged_at) as date,
          COUNT(*) as count
        FROM acknowledgements
        WHERE acknowledged_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(acknowledged_at)
        ORDER BY date
      `);

      // Section completion rates
      const sectionStats = await db.execute(sql`
        WITH section_policy_counts AS (
          SELECT 
            s.id,
            s.title,
            COUNT(DISTINCT p.id) as total_policies,
            COUNT(DISTINCT a.id) as total_acknowledgements
          FROM sections s
          LEFT JOIN policies p ON p.section_id = s.id
          LEFT JOIN policy_versions pv ON pv.policy_id = p.id
          LEFT JOIN acknowledgements a ON a.policy_version_id = pv.id
          GROUP BY s.id, s.title
        )
        SELECT 
          id,
          title,
          total_policies,
          total_acknowledgements,
          CASE 
            WHEN total_policies > 0 
            THEN ROUND((total_acknowledgements::float / (total_policies * (SELECT COUNT(*) FROM users)))::numeric * 100, 2)
            ELSE 0 
          END as completion_rate
        FROM section_policy_counts
        ORDER BY completion_rate DESC
      `);

      res.json({
        totalStats,
        topPolicies,
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