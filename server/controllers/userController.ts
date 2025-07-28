import { Request, Response } from 'express';
import { db } from '@db';
import { users, type User } from '@db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "READER"]),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const createUserSchema = z.object({
  username: z.string().email("Username must be a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "EDITOR", "READER"]).optional(), // Make role optional
});

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
};

export const UserController = {
  async create(req: Request, res: Response) {
    try {
      const result = createUserSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const { username, password } = result.data;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Check if this is the first user - only first user becomes admin
      const allUsers = await db.select().from(users);
      const role = allUsers.length === 0 ? "ADMIN" : "READER"; // Changed default role to READER

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          role,
        })
        .returning();

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  },

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
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = resetPasswordSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Hash the new password
      const hashedPassword = await crypto.hash(result.data.newPassword);

      // Update the user's password
      const [updatedUser] = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, parseInt(userId)))
        .returning();

      // Import AuditService to log the password reset
      const { AuditService } = await import('../services/auditService');
      await AuditService.logAdminAction(
        req,
        'user',
        parseInt(userId),
        'PASSWORD_RESET',
        `Password reset for user: ${existingUser.username}`,
        'HIGH'
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
};