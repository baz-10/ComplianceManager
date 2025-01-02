import { pgTable, text, serial, timestamp, integer, boolean, json, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const UserRole = pgEnum("user_role", ["ADMIN", "EDITOR", "READER"]);
export const Status = pgEnum("status", ["DRAFT", "LIVE"]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: UserRole("role").default("READER").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Manuals table
export const manuals = pgTable("manuals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: Status("status").default("DRAFT").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull()
});

// Sections table
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  manualId: integer("manual_id").references(() => manuals.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  manuals: many(manuals),
  sections: many(sections),
  policies: many(policies),
  policyVersions: many(policyVersions),
  acknowledgements: many(acknowledgements)
}));

export const manualsRelations = relations(manuals, ({ one, many }) => ({
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
  acknowledgements: many(acknowledgements)
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

// Schemas
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
