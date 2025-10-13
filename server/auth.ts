import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, organizations, type User } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "./config/environment.ts";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends User {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (env.nodeEnv === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      ...(sessionSettings.cookie || {}),
      secure: true,
      sameSite: "lax",
    } as session.CookieOptions;
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
          with: {
            organization: true
          }
        });

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          organization: true
        }
      });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Minimal, public-facing registration schema
  const registerSchema = z.object({
    username: z.string().email("Username must be a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, password } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Check if this is the first user
      const allUsers = await db.select().from(users);
      // Default role is READER unless it's the first user
      const role = allUsers.length === 0 ? "ADMIN" : "READER";

      // For now, assign all new users to the default organization (ID 1)
      // TODO: Implement proper organization invitation system
      const organizationId = 1;

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          role, // Use the determined role
          organizationId,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username, role: newUser.role }
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        // Log failed login attempt
        try {
          const { AuditService } = await import('./services/auditService');
          await AuditService.logAuth(req, 'LOGIN_FAILED', undefined, 
            `Failed login attempt for username: ${req.body.username}`);
        } catch (auditError) {
          console.warn('Failed to log login failure:', auditError);
        }
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.logIn(user, async (err) => {
        if (err) {
          return next(err);
        }

        // Log successful login
        try {
          const { AuditService } = await import('./services/auditService');
          await AuditService.logAuth(req, 'LOGIN', user.id, 
            `User ${user.username} logged in successfully`);
        } catch (auditError) {
          console.warn('Failed to log login success:', auditError);
        }

        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username, role: user.role }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res) => {
    const user = req.user as User;
    
    req.logout(async (err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      
      // Log logout event
      if (user) {
        try {
          const { AuditService } = await import('./services/auditService');
          await AuditService.logAuth(req, 'LOGOUT', user.id, 
            `User ${user.username} logged out`);
        } catch (auditError) {
          console.warn('Failed to log logout:', auditError);
        }
      }
      
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
  });
}
