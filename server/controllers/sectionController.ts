import { Request, Response } from 'express';
import { db } from '@db';
import { sections, insertSectionSchema, type User } from '@db/schema';
import { eq } from 'drizzle-orm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const SectionController = {
  async list(req: Request, res: Response) {
    try {
      const { manualId } = req.params;
      const allSections = await db.query.sections.findMany({
        where: eq(sections.manualId, parseInt(manualId)),
        with: {
          policies: true,
          createdBy: true
        },
        orderBy: sections.orderIndex
      });
      res.json(allSections);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sections' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const result = insertSectionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [section] = await db.insert(sections)
        .values({
          ...result.data,
          createdById: req.user.id
        })
        .returning();

      res.status(201).json(section);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create section' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = insertSectionSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const [section] = await db.update(sections)
        .set({
          ...result.data,
          updatedAt: new Date()
        })
        .where(eq(sections.id, parseInt(id)))
        .returning();

      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }

      res.json(section);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update section' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [section] = await db.delete(sections)
        .where(eq(sections.id, parseInt(id)))
        .returning();

      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }

      res.json({ message: 'Section deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete section' });
    }
  },

  async reorder(req: Request, res: Response) {
    try {
      const { manualId } = req.params;
      const { orderMap } = req.body;

      if (!Array.isArray(orderMap)) {
        return res.status(400).json({ error: 'Invalid order map' });
      }

      const updates = orderMap.map((sectionId, index) =>
        db.update(sections)
          .set({ orderIndex: index })
          .where(eq(sections.id, sectionId))
      );

      await Promise.all(updates);

      res.json({ message: 'Sections reordered successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reorder sections' });
    }
  }
};