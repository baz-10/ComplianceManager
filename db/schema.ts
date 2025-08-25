import { pgTable, text, serial, timestamp, integer, boolean, json, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const UserRole = pgEnum("user_role", ["ADMIN", "EDITOR", "READER"]);
export const Status = pgEnum("status", ["DRAFT", "LIVE"]);

// Organizations table
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  domain: text("domain"), // For email-based auto-assignment (e.g., "@company.com")
  settings: json("settings").$type<{
    allowSelfRegistration?: boolean;
    defaultUserRole?: "ADMIN" | "EDITOR" | "READER";
    maxUsers?: number;
    features?: string[];
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: integer("created_by_id"), // Will be set up in relations to avoid circular reference
  // Soft delete for organizations
  archivedAt: timestamp("archived_at"),
  archivedById: integer("archived_by_id"), // Will be set up in relations
  archiveReason: text("archive_reason")
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: UserRole("role").default("READER").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Manuals table
export const manuals = pgTable("manuals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: Status("status").default("DRAFT").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  // Soft delete fields for 30-day archive
  archivedAt: timestamp("archived_at"),
  archivedById: integer("archived_by_id").references(() => users.id),
  archiveReason: text("archive_reason"),
  permanentlyDeletedAt: timestamp("permanently_deleted_at")
});

// Sections table
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  manualId: integer("manual_id").references(() => manuals.id).notNull(),
  parentSectionId: integer("parent_section_id"), // Self-referencing for hierarchy
  title: text("title").notNull(),
  description: text("description"),
  level: integer("level").notNull().default(0), // 0 = top level, 1 = subsection, etc.
  sectionNumber: text("section_number"), // Auto-generated: "1.0", "1.1", "1.3.1", etc.
  orderIndex: integer("order_index").notNull(),
  isCollapsed: boolean("is_collapsed").default(false), // UI state for collapsible sections
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull()
});

// Policies table
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => sections.id).notNull(),
  title: text("title").notNull(),
  status: Status("status").default("DRAFT").notNull(),
  currentVersionId: integer("current_version_id"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull()
});

// PolicyVersions table
export const policyVersions = pgTable("policy_versions", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id").references(() => policies.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  bodyContent: text("body_content").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  changeSummary: text("change_summary"),
  attachments: json("attachments").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// AcknowledgementRecords table
export const acknowledgements = pgTable("acknowledgements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  policyVersionId: integer("policy_version_id").references(() => policyVersions.id).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull()
});

// Annotations table with fixed circular reference
export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  policyVersionId: integer("policy_version_id").references(() => policyVersions.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  startOffset: integer("start_offset").notNull(),
  endOffset: integer("end_offset").notNull(),
  selectedText: text("selected_text").notNull(),
  parentId: integer("parent_id"),  // Will be set up in relations
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Set up the self-referential relation after table definition
annotations.path = [{ path: ["parentId"], references: () => annotations.id }];

// Enhanced Audit Trail table for CASA compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  entityType: text("entity_type").notNull(), // 'manual', 'section', 'policy', 'policy_version', 'user'
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'ACKNOWLEDGE', 'EXPORT', 'LOGIN', 'LOGOUT'
  previousState: json("previous_state"),
  newState: json("new_state"),
  changeDetails: text("change_details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  severity: text("severity").default("INFO").notNull(), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  complianceFlags: json("compliance_flags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Document Signatures table for digital approval
export const documentSignatures = pgTable("document_signatures", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'manual', 'policy_version'
  entityId: integer("entity_id").notNull(),
  signerId: integer("signer_id").references(() => users.id).notNull(),
  signatureType: text("signature_type").notNull(), // 'DRAFT_APPROVAL', 'FINAL_APPROVAL', 'REVIEW'
  digitalSignature: text("digital_signature").notNull(), // Hash or crypto signature
  signatureMetadata: json("signature_metadata"), // Certificate info, timestamp, etc.
  signedAt: timestamp("signed_at").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: integer("revoked_by").references(() => users.id),
  revocationReason: text("revocation_reason")
});

// Policy Approval Workflows
export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  policyVersionId: integer("policy_version_id").references(() => policyVersions.id).notNull(),
  workflowStep: integer("workflow_step").notNull(), // 1, 2, 3, etc.
  approverId: integer("approver_id").references(() => users.id).notNull(),
  status: text("status").notNull(), // 'PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_CHANGES'
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Relations
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  users: many(users),
  manuals: many(manuals),
  createdBy: one(users, {
    fields: [organizations.createdById],
    references: [users.id]
  }),
  archivedBy: one(users, {
    fields: [organizations.archivedById],
    references: [users.id]
  })
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id]
  }),
  manuals: many(manuals),
  sections: many(sections),
  policies: many(policies),
  policyVersions: many(policyVersions),
  acknowledgements: many(acknowledgements),
  annotations: many(annotations),
  auditLogs: many(auditLogs),
  documentSignatures: many(documentSignatures),
  approvalWorkflows: many(approvalWorkflows)
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));

export const documentSignaturesRelations = relations(documentSignatures, ({ one }) => ({
  signer: one(users, {
    fields: [documentSignatures.signerId],
    references: [users.id]
  }),
  revokedByUser: one(users, {
    fields: [documentSignatures.revokedBy],
    references: [users.id]
  })
}));

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one }) => ({
  policyVersion: one(policyVersions, {
    fields: [approvalWorkflows.policyVersionId],
    references: [policyVersions.id]
  }),
  approver: one(users, {
    fields: [approvalWorkflows.approverId],
    references: [users.id]
  })
}));

export const manualsRelations = relations(manuals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [manuals.organizationId],
    references: [organizations.id]
  }),
  createdBy: one(users, {
    fields: [manuals.createdById],
    references: [users.id]
  }),
  sections: many(sections)
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  manual: one(manuals, {
    fields: [sections.manualId],
    references: [manuals.id]
  }),
  createdBy: one(users, {
    fields: [sections.createdById],
    references: [users.id]
  }),
  parentSection: one(sections, {
    fields: [sections.parentSectionId],
    references: [sections.id]
  }),
  childSections: many(sections, {
    fields: [sections.id],
    references: [sections.parentSectionId]
  }),
  policies: many(policies)
}));

export const policiesRelations = relations(policies, ({ one, many }) => ({
  section: one(sections, {
    fields: [policies.sectionId],
    references: [sections.id]
  }),
  createdBy: one(users, {
    fields: [policies.createdById],
    references: [users.id]
  }),
  versions: many(policyVersions),
  currentVersion: one(policyVersions, {
    fields: [policies.currentVersionId],
    references: [policyVersions.id]
  })
}));

export const policyVersionsRelations = relations(policyVersions, ({ one, many }) => ({
  policy: one(policies, {
    fields: [policyVersions.policyId],
    references: [policies.id]
  }),
  author: one(users, {
    fields: [policyVersions.authorId],
    references: [users.id]
  }),
  acknowledgements: many(acknowledgements),
  annotations: many(annotations)
}));

export const acknowledgementsRelations = relations(acknowledgements, ({ one }) => ({
  user: one(users, {
    fields: [acknowledgements.userId],
    references: [users.id]
  }),
  policyVersion: one(policyVersions, {
    fields: [acknowledgements.policyVersionId],
    references: [policyVersions.id]
  })
}));

export const annotationsRelations = relations(annotations, ({ one, many }) => ({
  policyVersion: one(policyVersions, {
    fields: [annotations.policyVersionId],
    references: [policyVersions.id]
  }),
  user: one(users, {
    fields: [annotations.userId],
    references: [users.id]
  }),
  parentAnnotation: one(annotations, {
    fields: [annotations.parentId],
    references: [annotations.id]
  }),
  replies: many(annotations, {
    fields: [annotations.id],
    references: [annotations.parentId]
  })
}));

// (Deduplicated) Organization and User relations are defined above.

// Schemas
export const insertOrganizationSchema = createInsertSchema(organizations);
export const selectOrganizationSchema = createSelectSchema(organizations);
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertManualSchema = createInsertSchema(manuals);
export const selectManualSchema = createSelectSchema(manuals);
export type Manual = typeof manuals.$inferSelect;
export type NewManual = typeof manuals.$inferInsert;

export const insertSectionSchema = createInsertSchema(sections);
export const selectSectionSchema = createSelectSchema(sections);
export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;

export const insertPolicySchema = createInsertSchema(policies);
export const selectPolicySchema = createSelectSchema(policies);
export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;

export const insertPolicyVersionSchema = createInsertSchema(policyVersions);
export const selectPolicyVersionSchema = createSelectSchema(policyVersions);
export type PolicyVersion = typeof policyVersions.$inferSelect;
export type NewPolicyVersion = typeof policyVersions.$inferInsert;

export const insertAcknowledgementSchema = createInsertSchema(acknowledgements);
export const selectAcknowledgementSchema = createSelectSchema(acknowledgements);
export type Acknowledgement = typeof acknowledgements.$inferSelect;
export type NewAcknowledgement = typeof acknowledgements.$inferInsert;

export const insertAnnotationSchema = createInsertSchema(annotations);
export const selectAnnotationSchema = createSelectSchema(annotations);
export type Annotation = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;

export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export const insertDocumentSignatureSchema = createInsertSchema(documentSignatures);
export const selectDocumentSignatureSchema = createSelectSchema(documentSignatures);
export type DocumentSignature = typeof documentSignatures.$inferSelect;
export type NewDocumentSignature = typeof documentSignatures.$inferInsert;

export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows);
export const selectApprovalWorkflowSchema = createSelectSchema(approvalWorkflows);
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type NewApprovalWorkflow = typeof approvalWorkflows.$inferInsert;
