import type { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import csrf from 'csurf';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from '../config/environment.ts';
import { ApiError, sendErrorResponse } from '../utils/errorHandler';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
  },
});

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

export function setupSecurityMiddleware(app: Express) {
  app.use(helmet({
    contentSecurityPolicy: env.nodeEnv === 'production'
      ? undefined
      : false,
  }));

  const corsOptions: CorsOptions = env.allowedOrigins
    ? {
        origin(origin: string | undefined, callback) {
          if (!origin || env.allowedOrigins!.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true,
        optionsSuccessStatus: 200,
      }
    : {
        origin: true,
        credentials: true,
        optionsSuccessStatus: 200,
      };

  app.use(cors(corsOptions));

  app.use(cookieParser());
  // Rate limiting should apply only to API routes so Vite/module loads aren't throttled
  app.use('/api', apiRateLimiter);
  // Attach CSRF protection to API routes and expose fresh tokens
  app.use('/api', csrfProtection, (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.csrfToken();
      res.setHeader('x-csrf-token', token);
    } catch (error) {
      // Ignore errors when token cannot be generated (e.g., for ignored methods)
    }
    next();
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err?.code === 'EBADCSRFTOKEN') {
      return sendErrorResponse(res, new ApiError('Invalid CSRF token', 403, 'INVALID_CSRF_TOKEN'));
    }
    if (err instanceof Error && err.message === 'Origin not allowed by CORS') {
      return sendErrorResponse(res, new ApiError('Origin not allowed by CORS', 403, 'CORS_ERROR'));
    }
    next(err);
  });
}
