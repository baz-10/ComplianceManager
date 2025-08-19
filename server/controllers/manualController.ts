import { Request, Response } from 'express';
import { db } from '@db';
import { manuals, sections, insertManualSchema, type User, auditLogs } from '@db/schema';
import { eq, isNull, isNotNull, and, sql } from 'drizzle-orm';
import { ApiError, sendErrorResponse } from '../utils/errorHandler';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const ManualController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(403).json({ error: 'Organization context required' });
      }

      const organizationManuals = await db.query.manuals.findMany({
        where: and(
          eq(manuals.organizationId, req.user.organizationId),
          isNull(manuals.archivedAt)
        ),
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
          createdBy: true,
          organization: true
        }
      });
      res.json(organizationManuals);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const result = insertManualSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      if (!req.user?.organizationId) {
        return res.status(403).json({ error: 'Organization context required' });
      }

      const [manual] = await db.insert(manuals)
        .values({
          ...result.data,
          organizationId: req.user.organizationId,
          createdById: req.user.id
        })
        .returning();

      res.status(201).json(manual);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = insertManualSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      if (!req.user?.organizationId) {
        return res.status(403).json({ error: 'Organization context required' });
      }

      const [manual] = await db.update(manuals)
        .set({
          ...result.data,
          updatedAt: new Date()
        })
        .where(and(
          eq(manuals.id, parseInt(id)),
          eq(manuals.organizationId, req.user.organizationId)
        ))
        .returning();

      if (!manual) {
        return res.status(404).json({ error: 'Manual not found or access denied' });
      }

      res.json(manual);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async archive(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!req.user) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      if (!reason || reason.trim().length === 0) {
        throw new ApiError('Archive reason is required', 400, 'VALIDATION_ERROR', 'reason');
      }

      // Check if manual exists and is not already archived
      const manual = await db.query.manuals.findFirst({
        where: eq(manuals.id, parseInt(id))
      });

      if (!manual) {
        throw new ApiError('Manual not found', 404, 'NOT_FOUND');
      }

      if (manual.archivedAt) {
        throw new ApiError('Manual is already archived', 400, 'ALREADY_ARCHIVED');
      }

      // Archive the manual
      const [archivedManual] = await db.update(manuals)
        .set({
          archivedAt: new Date(),
          archivedById: req.user.id,
          archiveReason: reason,
          updatedAt: new Date()
        })
        .where(eq(manuals.id, parseInt(id)))
        .returning();

      // Log the archive action
      await db.insert(auditLogs).values({
        userId: req.user.id,
        entityType: 'manual',
        entityId: archivedManual.id,
        action: 'ARCHIVE',
        changeDetails: `Manual "${archivedManual.title}" archived. Reason: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'MEDIUM',
        complianceFlags: ['DOCUMENT_LIFECYCLE']
      });

      res.json({ 
        message: 'Manual archived successfully',
        manual: archivedManual,
        scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async restore(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Check if manual exists and is archived
      const manual = await db.query.manuals.findFirst({
        where: eq(manuals.id, parseInt(id))
      });

      if (!manual) {
        throw new ApiError('Manual not found', 404, 'NOT_FOUND');
      }

      if (!manual.archivedAt) {
        throw new ApiError('Manual is not archived', 400, 'NOT_ARCHIVED');
      }

      // Restore the manual
      const [restoredManual] = await db.update(manuals)
        .set({
          archivedAt: null,
          archivedById: null,
          archiveReason: null,
          updatedAt: new Date()
        })
        .where(eq(manuals.id, parseInt(id)))
        .returning();

      // Log the restore action
      await db.insert(auditLogs).values({
        userId: req.user.id,
        entityType: 'manual',
        entityId: restoredManual.id,
        action: 'RESTORE',
        changeDetails: `Manual "${restoredManual.title}" restored from archive`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'MEDIUM',
        complianceFlags: ['DOCUMENT_LIFECYCLE']
      });

      res.json({ 
        message: 'Manual restored successfully',
        manual: restoredManual
      });
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async listArchived(req: Request, res: Response) {
    try {
      const archivedManuals = await db.query.manuals.findMany({
        where: isNotNull(manuals.archivedAt),
        with: {
          archivedBy: true,
          createdBy: true
        }
      });

      // Calculate days until permanent deletion for each manual
      const manualsWithDeletionInfo = archivedManuals.map(manual => {
        const archivedDate = new Date(manual.archivedAt!);
        const deletionDate = new Date(archivedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const daysRemaining = Math.max(0, Math.ceil((deletionDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

        return {
          ...manual,
          scheduledDeletionDate: deletionDate,
          daysUntilDeletion: daysRemaining,
          canBeDeleted: daysRemaining === 0
        };
      });

      res.json(manualsWithDeletionInfo);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async permanentlyDelete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Check if manual exists and can be permanently deleted
      const manual = await db.query.manuals.findFirst({
        where: eq(manuals.id, parseInt(id))
      });

      if (!manual) {
        throw new ApiError('Manual not found', 404, 'NOT_FOUND');
      }

      if (!manual.archivedAt) {
        throw new ApiError('Manual must be archived before permanent deletion', 400, 'NOT_ARCHIVED');
      }

      // Check if 30 days have passed since archival
      const archivedDate = new Date(manual.archivedAt);
      const daysSinceArchival = Math.floor((Date.now() - archivedDate.getTime()) / (24 * 60 * 60 * 1000));

      if (daysSinceArchival < 30 && req.user.role !== 'ADMIN') {
        throw new ApiError(
          `Manual cannot be permanently deleted yet. ${30 - daysSinceArchival} days remaining.`,
          403,
          'DELETION_PERIOD_NOT_MET'
        );
      }

      // Permanently delete the manual
      const [deletedManual] = await db.delete(manuals)
        .where(eq(manuals.id, parseInt(id)))
        .returning();

      // Log the permanent deletion
      await db.insert(auditLogs).values({
        userId: req.user.id,
        entityType: 'manual',
        entityId: deletedManual.id,
        action: 'DELETE',
        changeDetails: `Manual "${deletedManual.title}" permanently deleted`,
        previousState: deletedManual,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'CRITICAL',
        complianceFlags: ['DOCUMENT_LIFECYCLE', 'PERMANENT_DELETION']
      });

      res.json({ message: 'Manual permanently deleted successfully' });
    } catch (error) {
      sendErrorResponse(res, error);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!req.user?.organizationId) {
        return res.status(403).json({ error: 'Organization context required' });
      }

      const manual = await db.query.manuals.findFirst({
        where: and(
          eq(manuals.id, parseInt(id)),
          eq(manuals.organizationId, req.user.organizationId)
        ),
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
          createdBy: true,
          organization: true
        }
      });

      if (!manual) {
        return res.status(404).json({ error: 'Manual not found or access denied' });
      }

      res.json(manual);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  }
};