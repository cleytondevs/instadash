import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { subDays } from "date-fns";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === ADS ROUTES ===

  app.get(api.ads.list.path, async (req, res) => {
    const ads = await storage.getAds();
    res.json(ads);
  });

  app.get(api.ads.get.path, async (req, res) => {
    const adId = Number(req.params.id);
    const ad = await storage.getAd(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    res.json(ad);
  });

  app.post(api.ads.create.path, async (req, res) => {
    try {
      const input = api.ads.create.input.parse(req.body);
      // Hardcode userId for MVP since no auth
      const defaultUser = await storage.getUserByUsername('admin');
      const userId = defaultUser ? defaultUser.id : 'default-user-id';
      
      const ad = await storage.createAd({ ...input, userId });
      
      // Auto-generate some initial reports for demo purposes
      await generateMockHistory(ad.id);
      
      res.status(201).json(ad);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.ads.update.path, async (req, res) => {
    const adId = Number(req.params.id);
    try {
      const input = api.ads.update.input.parse(req.body);
      const updated = await storage.updateAd(adId, input);
      if (!updated) {
        return res.status(404).json({ message: 'Ad not found' });
      }
      res.json(updated);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.ads.delete.path, async (req, res) => {
    const adId = Number(req.params.id);
    await storage.deleteAd(adId);
    res.status(204).send();
  });

  // === MOCK SYNC ENDPOINT ===
  app.post(api.ads.sync.path, async (req, res) => {
    const adId = Number(req.params.id);
    const ad = await storage.getAd(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Generate a new report for "today" (or just a new entry)
    const report = generateRandomReport(adId, new Date());
    await storage.createReport(report);

    res.json({ message: 'Sync successful', newReports: 1 });
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

// === HELPER FUNCTIONS ===

async function generateMockHistory(adId: number) {
  // Generate last 7 days of data
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const report = generateRandomReport(adId, date);
    await storage.createReport(report);
  }
}

function generateRandomReport(adId: number, date: Date) {
  const impressions = Math.floor(Math.random() * 5000) + 100;
  const clicks = Math.floor(impressions * (Math.random() * 0.05)); // 0-5% CTR
  const spend = Math.floor(clicks * (Math.random() * 50 + 20)); // 20-70 cents per click (in cents)
  
  // Revenue: sometimes good, sometimes bad
  const roiFactor = Math.random() * 2 + 0.5; // 0.5x to 2.5x return
  const revenue = Math.floor(spend * roiFactor);

  return {
    adId,
    date,
    impressions,
    clicks,
    spend,
    revenue
  };
}

async function seedDatabase() {
  // Check if admin user exists
  let admin = await storage.getUserByUsername('admin');
  if (!admin) {
    admin = await storage.createUser({
      username: 'admin',
      password: 'password123'
    });
  }

  // Check if any ads exist
  const existingAds = await storage.getAds();
  if (existingAds.length === 0) {
    console.log("Seeding database...");
    
    // Create Instagram Ad 1
    const instaAd1 = await storage.createAd({
      userId: admin.id,
      name: 'Instagram Story - Coleção Verão',
      platformIdentifier: 'IG_987654',
      platform: 'instagram',
      status: 'active'
    });
    await generateMockHistory(instaAd1.id);

    // Create Instagram Ad 2
    const instaAd2 = await storage.createAd({
      userId: admin.id,
      name: 'Feed Post - Ofertas da Semana',
      platformIdentifier: 'IG_123456',
      platform: 'instagram',
      status: 'active'
    });
    await generateMockHistory(instaAd2.id);
  }
}
