import { pgTable, text, serial, integer, boolean, timestamp, varchar, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fbAppId: text("fb_app_id"),
  fbAppSecret: text("fb_app_secret"),
  fbAccessToken: text("fb_access_token"),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  orderId: text("order_id").notNull().unique(),
  productName: text("product_name"),
  orderDate: date("order_date").notNull(),
  source: text("source").notNull(), // 'shopee_video' or 'social_media'
  revenue: integer("revenue").notNull(), // In cents
  clicks: integer("clicks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  amount: integer("amount").notNull(), // In cents
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const salesRelations = relations(sales, ({ one }) => ({
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({ 
  id: true, 
  userId: true,
  createdAt: true 
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ 
  id: true, 
  userId: true,
  createdAt: true 
});

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Summary types for dashboard
export interface DashboardStats {
  totalRevenue: number;
  videoRevenue: number;
  socialRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  totalClicks: number;
  socialClicks: number;
  topProduct: {
    name: string;
    orders: number;
  } | null;
}
