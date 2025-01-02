import { Request, Response } from 'express';
import { db } from '@db';
import { annotations, insertAnnotationSchema, type User } from '@db/schema';
import { eq, and, isNull } from 'drizzle-orm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const AnnotationController = {
  async list(req: Request, res: Response) {
    try {
      const { policyVersionId } = req.params;
      const allAnnotations = await db.query.annotations.findMany({
        where: and(
          eq(annotations.policyVersionId, parseInt(policyVersionId)),
          isNull(annotations.parentId) // Only get top-level annotations
        ),
        with: {
          user: true,
          replies: {
            with: {
              user: true
            }
          }
        }
      });
      res.json(allAnnotations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch annotations' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const result = insertAnnotationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [annotation] = await db.insert(annotations)
        .values({
          ...result.data,
          userId: req.user.id
        })
        .returning();

      const fullAnnotation = await db.query.annotations.findFirst({
        where: eq(annotations.id, annotation.id),
        with: {
          user: true,
          replies: {
            with: {
              user: true
            }
          }
        }
      });

      res.status(201).json(fullAnnotation);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create annotation' });
    }
  },

  async reply(req: Request, res: Response) {
    try {
      const { annotationId } = req.params;
      const result = insertAnnotationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [reply] = await db.insert(annotations)
        .values({
          ...result.data,
          userId: req.user.id,
          parentId: parseInt(annotationId)
        })
        .returning();

      const fullReply = await db.query.annotations.findFirst({
        where: eq(annotations.id, reply.id),
        with: {
          user: true
        }
      });

      res.status(201).json(fullReply);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create reply' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [annotation] = await db.select()
        .from(annotations)
        .where(eq(annotations.id, parseInt(id)))
        .limit(1);

      if (!annotation) {
        return res.status(404).json({ error: 'Annotation not found' });
      }

      if (annotation.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to delete this annotation' });
      }

      await db.delete(annotations)
        .where(eq(annotations.id, parseInt(id)));

      res.json({ message: 'Annotation deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete annotation' });
    }
  }
};
