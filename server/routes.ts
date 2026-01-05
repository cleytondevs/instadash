import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSaleSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Sales stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats("default-user");
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bulk sales import
  app.post("/api/sales/bulk", async (req, res) => {
    try {
      const salesList = z.array(insertSaleSchema).parse(req.body);
      await storage.bulkCreateSales(salesList.map(s => ({ ...s, userId: "default-user" })));
      res.status(201).json({ message: "Sales imported successfully" });
    } catch (err) {
      console.error("Bulk sales error:", err);
      res.status(400).json({ message: "Invalid sales data" });
    }
  });

  // Expense creation
  app.post("/api/expenses", async (req, res) => {
    try {
      const expense = insertExpenseSchema.parse(req.body);
      const result = await storage.createExpense({ ...expense, userId: "default-user" });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ message: "Invalid expense data" });
    }
  });

  return httpServer;
}
