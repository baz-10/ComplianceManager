import { Request, Response } from 'express';
import { db } from '@db';
import { type User } from '@db/schema';
import { performance } from 'perf_hooks';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

// Keep track of performance metrics
let responseTimeSamples: { time: string; value: number }[] = [];
let activeUserSamples: { time: string; count: number }[] = [];
let dbQuerySamples: { time: string; count: number }[] = [];
let dbQueryCount = 0;

// Helper to maintain only last hour of samples (120 samples at 30-second intervals)
function maintainSampleWindow(samples: any[]) {
  const oneHourAgo = Date.now() - 3600000;
  return samples.filter(sample => new Date(sample.time).getTime() > oneHourAgo);
}

export const AdminController = {
  async getPerformanceMetrics(_req: Request, res: Response) {
    try {
      const currentTime = new Date().toISOString();

      // Add new samples
      responseTimeSamples = maintainSampleWindow([
        ...responseTimeSamples,
        { time: currentTime, value: Math.random() * 100 + 50 } // Simulated response time
      ]);

      activeUserSamples = maintainSampleWindow([
        ...activeUserSamples,
        { time: currentTime, count: Math.floor(Math.random() * 20 + 10) } // Simulated active users
      ]);

      dbQuerySamples = maintainSampleWindow([
        ...dbQuerySamples,
        { time: currentTime, count: dbQueryCount }
      ]);

      // Reset query count after sampling
      dbQueryCount = 0;

      res.json({
        responseTimes: responseTimeSamples,
        activeUsers: activeUserSamples,
        dbQueries: dbQuerySamples
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  }
};

// Middleware to track database queries
export function trackDatabaseQueries(req: Request, res: Response, next: () => void) {
  if (req.path.startsWith('/api')) {
    dbQueryCount++;
  }
  next();
}
