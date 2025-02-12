import type { SelectUser } from "@db/schema";

declare module 'express-serve-static-core' {
  interface Request {
    user?: SelectUser;
  }
}
