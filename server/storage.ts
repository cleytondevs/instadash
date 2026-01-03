import { 
  users, ads, reports,
  type User, type InsertUser,
  type Ad, type InsertAd, type AdResponse,
  type Report, type InsertAd as CreateAdRequest // Alias for consistency
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Ads
  getAds(): Promise<AdResponse[]>;
  getAd(id: number): Promise<AdResponse | undefined>;
  createAd(ad: CreateAdRequest & { userId: string }): Promise<Ad>;
  updateAd(id: number, updates: Partial<InsertAd>): Promise<Ad | undefined>;
  deleteAd(id: number): Promise<void>;

  // Reports
  createReport(report: any): Promise<Report>; // Typed as any to match schema insert loosely for internal use
  getReportsForAd(adId: number): Promise<Report[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
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

  // Ad methods
  async getAds(): Promise<AdResponse[]> {
    const allAds = await db.select().from(ads);
    // Fetch latest stats for each ad to calculate simple ROI overview if needed
    // For now, just return the ads. Frontend might fetch details separately or we could join.
    // Let's attach the latest report or summary if possible, but for MVP list, raw ads are fine.
    // Actually, to show ROI on dashboard list, we might need aggregation. 
    // Let's fetch all reports for calculation in memory (efficient enough for lite app)
    
    const results: AdResponse[] = [];
    
    for (const ad of allAds) {
      const adReports = await db.select().from(reports).where(eq(reports.adId, ad.id));
      const totalSpend = adReports.reduce((sum, r) => sum + r.spend, 0);
      const totalRevenue = adReports.reduce((sum, r) => sum + r.revenue, 0);
      const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
      
      results.push({
        ...ad,
        reports: adReports,
        roi
      });
    }
    
    return results;
  }

  async getAd(id: number): Promise<AdResponse | undefined> {
    const [ad] = await db.select().from(ads).where(eq(ads.id, id));
    if (!ad) return undefined;

    const adReports = await db.select().from(reports).where(eq(reports.adId, id)).orderBy(desc(reports.date));
    
    const totalSpend = adReports.reduce((sum, r) => sum + r.spend, 0);
    const totalRevenue = adReports.reduce((sum, r) => sum + r.revenue, 0);
    const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

    return {
      ...ad,
      reports: adReports,
      roi
    };
  }

  async createAd(ad: CreateAdRequest & { userId: string }): Promise<Ad> {
    const [newAd] = await db.insert(ads).values(ad).returning();
    return newAd;
  }

  async updateAd(id: number, updates: Partial<InsertAd>): Promise<Ad | undefined> {
    const [updated] = await db.update(ads).set(updates).where(eq(ads.id, id)).returning();
    return updated;
  }

  async deleteAd(id: number): Promise<void> {
    await db.delete(ads).where(eq(ads.id, id));
  }

  // Report methods
  async createReport(report: any): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getReportsForAd(adId: number): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.adId, adId)).orderBy(desc(reports.date));
  }
}

export const storage = new DatabaseStorage();
