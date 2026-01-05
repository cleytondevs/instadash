import { 
  users, sales, expenses,
  type User, type InsertUser,
  type Sale, type InsertSale,
  type Expense, type InsertExpense,
  type DashboardStats
} from "@shared/schema";
import { db } from "./db";
import { eq, and, between, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Sales
  createSale(sale: InsertSale & { userId: string }): Promise<Sale>;
  getSales(userId: string): Promise<Sale[]>;
  bulkCreateSales(salesList: (InsertSale & { userId: string })[], resetExisting: boolean): Promise<void>;

  // Expenses
  createExpense(expense: InsertExpense & { userId: string }): Promise<Expense>;
  getExpenses(userId: string): Promise<Expense[]>;

  // Dashboard
  getDashboardStats(userId: string): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createSale(sale: InsertSale & { userId: string }): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    return newSale;
  }

  async getSales(userId: string): Promise<Sale[]> {
    return db.select().from(sales).where(eq(sales.userId, userId));
  }

  async bulkCreateSales(salesList: (InsertSale & { userId: string })[], resetExisting: boolean): Promise<void> {
    if (resetExisting && salesList.length > 0) {
      const userId = salesList[0].userId;
      await db.delete(sales).where(eq(sales.userId, userId));
    }
    
    if (salesList.length === 0) return;
    await db.insert(sales).values(salesList).onConflictDoNothing({ target: sales.orderId });
  }

  async createExpense(expense: InsertExpense & { userId: string }): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getExpenses(userId: string): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.userId, userId));
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const userSales = await this.getSales(userId);
    const userExpenses = await this.getExpenses(userId);

    const videoRevenue = userSales
      .filter(s => s.source === 'shopee_video')
      .reduce((sum, s) => sum + s.revenue, 0);

    const socialRevenue = userSales
      .filter(s => s.source === 'social_media')
      .reduce((sum, s) => sum + s.revenue, 0);

    const totalRevenue = videoRevenue + socialRevenue;
    const totalExpenses = userExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalOrders = userSales.length;

    // Calculate top product
    const productCounts: Record<string, number> = {};
    userSales.forEach(sale => {
      if (sale.productName) {
        productCounts[sale.productName] = (productCounts[sale.productName] || 0) + 1;
      }
    });

    let topProduct = null;
    let maxOrders = 0;
    for (const [name, count] of Object.entries(productCounts)) {
      if (count > maxOrders) {
        maxOrders = count;
        topProduct = { name, orders: count };
      }
    }

    return {
      totalRevenue,
      videoRevenue,
      socialRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalOrders,
      topProduct
    };
  }
}

export const storage = new DatabaseStorage();
