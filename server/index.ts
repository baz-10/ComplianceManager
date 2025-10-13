import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, checkDatabaseConnection } from "@db";
import { errorMiddleware } from "./utils/errorHandler";
import { setupSecurityMiddleware } from "./middleware/securityMiddleware";
import { env } from "./config/environment.ts";

const app = express();

// Basic middleware setup
function setupMiddleware() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  setupSecurityMiddleware(app);
  
  // Serve uploaded images
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Add logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      const normalizedBody = normalizeErrorResponse(bodyJson, res.statusCode);
      capturedJsonResponse = normalizedBody;
      return originalResJson.apply(res, [normalizedBody, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  function normalizeErrorResponse(body: any, statusCode: number) {
    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "error" in body &&
      !("success" in body)
    ) {
      const rawError = body.error;
      const message =
        typeof rawError === "string"
          ? rawError
          : typeof rawError?.message === "string"
          ? rawError.message
          : "An unexpected error occurred. Please try again.";
      const field =
        typeof rawError === "object" && typeof rawError?.field === "string"
          ? rawError.field
          : undefined;
      const rawCode =
        typeof body.code === "string"
          ? body.code
          : typeof rawError === "object" && typeof rawError?.code === "string"
          ? rawError.code
          : undefined;

      const code =
        rawCode ??
        (statusCode === 400
          ? "BAD_REQUEST"
          : statusCode === 401
          ? "UNAUTHORIZED"
          : statusCode === 403
          ? "FORBIDDEN"
          : statusCode === 404
          ? "NOT_FOUND"
          : statusCode === 409
          ? "CONFLICT"
          : statusCode === 422
          ? "VALIDATION_ERROR"
          : "INTERNAL_ERROR");

      const transformed: Record<string, any> = {
        success: false,
        error: {
          message,
          code,
        },
      };

      if (field) {
        transformed.error.field = field;
      }

      if (typeof rawError === "object" && rawError?.details) {
        transformed.error.details = rawError.details;
      }

      return transformed;
    }

    return body;
  }
}

// Error handling middleware
function setupErrorHandler() {
  // Use our centralized error handler
  app.use(errorMiddleware);
  
  // Fallback error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });
}

async function initializeServer() {
  try {
    log("Starting server initialization...");

    // Setup basic middleware
    log("Setting up middleware...");
    setupMiddleware();

    // Check database connection
    log("Checking database connection...");
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to database");
    }
    log("Database connection verified");

    // Initialize routes
    log("Initializing routes...");
    const server = registerRoutes(app);

    // Setup error handling
    log("Setting up error handler...");
    setupErrorHandler();

    // Setup Vite or static files
  if (env.nodeEnv === "development") {
      log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving...");
      serveStatic(app);
    }

    // Start the server
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    });

    return server;
  } catch (error) {
    log(`Server initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Start the server
(async () => {
  try {
    await initializeServer();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
