import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { ManualController } from "./controllers/manualController";
import { SectionController } from "./controllers/sectionController";
import { PolicyController } from "./controllers/policyController";
import { AnnotationController } from "./controllers/annotationController";
import { AdminController, trackDatabaseQueries } from "./controllers/adminController";
import { AIPolicyController } from "./controllers/aiPolicyController";
import { UserController } from "./controllers/userController";
import { isAdmin, isEditorOrAdmin, isAuthenticated } from "./middleware/roleMiddleware";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Track database queries
  app.use(trackDatabaseQueries);

  // User Management routes (admin only)
  app.get('/api/users', isAdmin, UserController.list);
  app.post('/api/users', isAdmin, UserController.create);
  app.put('/api/users/:userId/role', isAdmin, UserController.updateRole);
  app.delete('/api/users/:userId', isAdmin, UserController.removeUser);

  // Admin routes
  app.get('/api/admin/performance', isAdmin, AdminController.getPerformanceMetrics);
  app.get('/api/admin/audit-trail', isAdmin, AdminController.getAuditTrail);
  app.get('/api/admin/compliance-report', isAdmin, AdminController.getComplianceReport);
  app.post('/api/admin/log-export', isAuthenticated, AdminController.logExportEvent);

  // AI Policy routes
  app.post('/api/policies/:policyId/suggest', isEditorOrAdmin, AIPolicyController.suggestImprovements);
  app.post('/api/policies/generate-draft', isEditorOrAdmin, AIPolicyController.generateDraft);

  // Manual routes
  app.get('/api/manuals', isAuthenticated, ManualController.list);
  app.post('/api/manuals', isEditorOrAdmin, ManualController.create);
  app.get('/api/manuals/:id', isAuthenticated, ManualController.getById);
  app.put('/api/manuals/:id', isEditorOrAdmin, ManualController.update);
  app.delete('/api/manuals/:id', isAdmin, ManualController.delete);

  // Section routes
  app.get('/api/manuals/:manualId/sections', isAuthenticated, SectionController.list);
  app.post('/api/sections', isEditorOrAdmin, SectionController.create);
  app.put('/api/sections/:id', isEditorOrAdmin, SectionController.update);
  app.delete('/api/sections/:id', isAdmin, SectionController.delete);
  app.post('/api/manuals/:manualId/sections/reorder', isEditorOrAdmin, SectionController.reorder);

  // Policy routes
  app.get('/api/sections/:sectionId/policies', isAuthenticated, PolicyController.list);
  app.post('/api/policies', isEditorOrAdmin, PolicyController.create);
  app.get('/api/policies/:policyId', isAuthenticated, PolicyController.getById);
  app.put('/api/policies/:policyId', isEditorOrAdmin, PolicyController.update);  // New route for updating policies
  app.delete('/api/policies/:policyId', isEditorOrAdmin, PolicyController.delete);  // New route for deleting policies
  app.post('/api/policies/:policyId/versions', isEditorOrAdmin, PolicyController.createVersion);
  app.get('/api/policies/:policyId/versions', isAuthenticated, PolicyController.getVersionHistory);
  app.post('/api/versions/:policyVersionId/acknowledge', isAuthenticated, PolicyController.acknowledge);
  app.post('/api/sections/:sectionId/policies/reorder', isEditorOrAdmin, PolicyController.reorder);

  // Annotation routes
  app.get('/api/versions/:policyVersionId/annotations', isAuthenticated, AnnotationController.list);
  app.post('/api/annotations', isAuthenticated, AnnotationController.create);
  app.post('/api/annotations/:annotationId/reply', isAuthenticated, AnnotationController.reply);
  app.delete('/api/annotations/:id', isAuthenticated, AnnotationController.delete);

  const httpServer = createServer(app);
  return httpServer;
}