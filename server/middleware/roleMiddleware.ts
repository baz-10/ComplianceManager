import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '@db/schema';

declare global {
  namespace Express {
    interface User extends User {}
  }
}

export const requireRole = (roles: Array<typeof UserRole.enumValues[number]>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).send('Insufficient permissions');
    }

    next();
  };
};

export const isAdmin = requireRole(['ADMIN']);
export const isEditorOrAdmin = requireRole(['ADMIN', 'EDITOR']);
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('Authentication required');
  }
  next();
};