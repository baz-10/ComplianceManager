import { Request, Response } from 'express';
import { db } from '@db';
import { annotations, insertAnnotationSchema, type User } from '@db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { ApiError, sendErrorResponse } from '../utils/errorHandler';

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
      return res.json(allAnnotations);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const result = insertAnnotationSchema.safeParse(req.body);
      if (!result.success) {
        return sendErrorResponse(res, result.error);
      }

      if (!req.user) {
        return sendErrorResponse(res, new ApiError('Authentication required', 401, 'UNAUTHORIZED'));
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

      return res.status(201).json(fullAnnotation);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async reply(req: Request, res: Response) {
    try {
      const { annotationId } = req.params;
      const result = insertAnnotationSchema.safeParse(req.body);
      if (!result.success) {
        return sendErrorResponse(res, result.error);
      }

      if (!req.user) {
        return sendErrorResponse(res, new ApiError('Authentication required', 401, 'UNAUTHORIZED'));
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

      return res.status(201).json(fullReply);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        return sendErrorResponse(res, new ApiError('Authentication required', 401, 'UNAUTHORIZED'));
      }

      const [annotation] = await db.select()
        .from(annotations)
        .where(eq(annotations.id, parseInt(id)))
        .limit(1);

      if (!annotation) {
        return sendErrorResponse(res, new ApiError('Annotation not found', 404, 'NOT_FOUND'));
      }

      if (annotation.userId !== req.user.id && req.user.role !== 'ADMIN') {
        return sendErrorResponse(res, new ApiError('Not authorized to delete this annotation', 403, 'FORBIDDEN'));
      }

      await db.delete(annotations)
        .where(eq(annotations.id, parseInt(id)));

      return res.json({ message: 'Annotation deleted successfully' });
    } catch (error) {
      sendErrorResponse(res, error);
    }
  }
};
