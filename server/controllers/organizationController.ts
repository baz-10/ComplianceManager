import { Request, Response } from 'express';
import { db } from '@db';
import { organizations, users, insertOrganizationSchema, type User } from '@db/schema';
import { eq, and, isNull } from 'drizzle-orm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User & { organization?: any };
  }
}

export const OrganizationController = {
  // Get current user's organization
  async getCurrent(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ error: 'No organization found' });
      }

      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, req.user.organizationId),
        with: {
          users: {
            columns: {
              id: true,
              username: true,
              role: true,
              createdAt: true
            }
          },
          createdBy: {
            columns: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(organization);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  },

  // Update organization (Admin only)
  async update(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ error: 'No organization found' });
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = insertOrganizationSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const [updatedOrganization] = await db
        .update(organizations)
        .set({
          ...result.data,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, req.user.organizationId))
        .returning();

      if (!updatedOrganization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(updatedOrganization);
    } catch (error) {
      console.error('Failed to update organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  },

  // Get organization users (Admin only)
  async getUsers(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ error: 'No organization found' });
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const organizationUsers = await db.query.users.findMany({
        where: eq(users.organizationId, req.user.organizationId),
        columns: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json(organizationUsers);
    } catch (error) {
      console.error('Failed to fetch organization users:', error);
      res.status(500).json({ error: 'Failed to fetch organization users' });
    }
  },

  // Update user role within organization (Admin only)
  async updateUserRole(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ error: 'No organization found' });
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { userId } = req.params;
      const { role } = req.body;

      if (!['ADMIN', 'EDITOR', 'READER'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Verify the user belongs to the same organization
      const targetUser = await db.query.users.findFirst({
        where: and(
          eq(users.id, parseInt(userId)),
          eq(users.organizationId, req.user.organizationId)
        )
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found in organization' });
      }

      // Prevent users from changing their own role
      if (targetUser.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          role,
          updatedAt: new Date()
        })
        .where(eq(users.id, parseInt(userId)))
        .returning({
          id: users.id,
          username: users.username,
          role: users.role,
          updatedAt: users.updatedAt
        });

      res.json(updatedUser);
    } catch (error) {
      console.error('Failed to update user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  },

  // Remove user from organization (Admin only)
  async removeUser(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ error: 'No organization found' });
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { userId } = req.params;

      // Verify the user belongs to the same organization
      const targetUser = await db.query.users.findFirst({
        where: and(
          eq(users.id, parseInt(userId)),
          eq(users.organizationId, req.user.organizationId)
        )
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found in organization' });
      }

      // Prevent users from removing themselves
      if (targetUser.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot remove yourself from organization' });
      }

      // Check if this is the last admin
      const admins = await db.query.users.findMany({
        where: and(
          eq(users.organizationId, req.user.organizationId),
          eq(users.role, 'ADMIN')
        )
      });

      if (admins.length === 1 && targetUser.role === 'ADMIN') {
        return res.status(400).json({ 
          error: 'Cannot remove the last admin from organization' 
        });
      }

      // For now, we'll delete the user entirely
      // In a more sophisticated system, we might move them to a "pending" state
      await db.delete(users).where(eq(users.id, parseInt(userId)));

      res.json({ message: 'User removed from organization successfully' });
    } catch (error) {
      console.error('Failed to remove user from organization:', error);
      res.status(500).json({ error: 'Failed to remove user from organization' });
    }
  },

  // Create new organization (System admin function - for future use)
  async create(req: Request, res: Response) {
    try {
      // For now, only allow the first user or existing admins to create organizations
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = insertOrganizationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const [newOrganization] = await db
        .insert(organizations)
        .values({
          ...result.data,
          createdById: req.user.id
        })
        .returning();

      res.status(201).json(newOrganization);
    } catch (error) {
      console.error('Failed to create organization:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  },

  // Get organization statistics (Admin only)
  async getStats(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(404).json({ error: 'No organization found' });
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Get user count by role
      const userStats = await db.query.users.findMany({
        where: eq(users.organizationId, req.user.organizationId),
        columns: {
          role: true
        }
      });

      const roleCounts = userStats.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get manual count (will be implemented when manual controller is updated)
      const manualCount = 0; // TODO: Implement when manual controller is updated

      const stats = {
        totalUsers: userStats.length,
        usersByRole: roleCounts,
        totalManuals: manualCount,
        organizationId: req.user.organizationId
      };

      res.json(stats);
    } catch (error) {
      console.error('Failed to fetch organization stats:', error);
      res.status(500).json({ error: 'Failed to fetch organization stats' });
    }
  }
};