import { Request, Response } from 'express';
import { db } from '@db';
import { users, type User } from '@db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "READER"]),
});

export const UserController = {
  async list(_req: Request, res: Response) {
    try {
      const allUsers = await db.query.users.findMany({
        orderBy: users.username,
      });
      
      // Remove sensitive information before sending
      const sanitizedUsers = allUsers.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  async updateRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = updateUserSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      // Don't allow changing own role
      if (req.user?.id === parseInt(userId)) {
        return res.status(400).json({ error: "Cannot change your own role" });
      }

      const [updatedUser] = await db
        .update(users)
        .set({ 
          role: result.data.role,
          updatedAt: new Date()
        })
        .where(eq(users.id, parseInt(userId)))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { password, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  },

  async removeUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      // Don't allow removing yourself
      if (req.user?.id === parseInt(userId)) {
        return res.status(400).json({ error: "Cannot remove your own account" });
      }

      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, parseInt(userId)))
        .returning();

      if (!deletedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User removed successfully' });
    } catch (error) {
      console.error('Error removing user:', error);
      res.status(500).json({ error: 'Failed to remove user' });
    }
  }
};
