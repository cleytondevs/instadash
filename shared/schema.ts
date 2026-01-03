import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Linked to users.id manually for now
  platformIdentifier: text("platform_identifier").notNull(), // ID do impulsionamento
  name: text("name").notNull(),
  platform: text("platform").notNull(), // 'shopee' or 'instagram'
  status: text("status").notNull().default('active'), // 'active', 'paused'
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  spend: integer("spend").notNull(), // In cents
  revenue: integer("revenue").notNull(), // In cents
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
});

// === RELATIONS ===
export const adsRelations = relations(ads, ({ many }) => ({
  reports: many(reports),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  ad: one(ads, {
    fields: [reports.adId],
    references: [ads.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAdSchema = createInsertSchema(ads).omit({ 
  id: true, 
  userId: true,
  createdAt: true 
});

export const insertReportSchema = createInsertSchema(reports).omit({ 
  id: true 
});

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Report = typeof reports.$inferSelect;

export type CreateAdRequest = InsertAd;
export type UpdateAdRequest = Partial<InsertAd>;

// Response types
export type AdResponse = Ad & {
  reports?: Report[];
  roi?: number; // Calculated field
};
