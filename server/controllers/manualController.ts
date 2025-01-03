import { Request, Response } from 'express';
import { db } from '@db';
import { manuals, sections, insertManualSchema, type User } from '@db/schema';
import { eq } from 'drizzle-orm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const ManualController = {
  async list(req: Request, res: Response) {
    try {
      const allManuals = await db.query.manuals.findMany({
        with: {
          sections: {
            with: {
              policies: {
                with: {
                  currentVersion: true
                }
              }
            }
          },
          createdBy: true
        }
      });
      res.json(allManuals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch manuals' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const result = insertManualSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [manual] = await db.insert(manuals)
        .values({
          ...result.data,
          createdById: req.user.id
        })
        .returning();

      res.status(201).json(manual);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create manual' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = insertManualSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const [manual] = await db.update(manuals)
        .set({
          ...result.data,
          updatedAt: new Date()
        })
        .where(eq(manuals.id, parseInt(id)))
        .returning();

      if (!manual) {
        return res.status(404).json({ error: 'Manual not found' });
      }

      res.json(manual);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update manual' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [manual] = await db.delete(manuals)
        .where(eq(manuals.id, parseInt(id)))
        .returning();

      if (!manual) {
        return res.status(404).json({ error: 'Manual not found' });
      }

      res.json({ message: 'Manual deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete manual' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const manual = await db.query.manuals.findFirst({
        where: eq(manuals.id, parseInt(id)),
        with: {
          sections: {
            with: {
              policies: {
                with: {
                  currentVersion: true
                }
              }
            }
          },
          createdBy: true
        }
      });

      if (!manual) {
        return res.status(404).json({ error: 'Manual not found' });
      }

      res.json(manual);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch manual' });
    }
  }
};