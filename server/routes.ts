import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSaleSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Sales stats
  app.get("/api/stats", async (req, res) => {
    try {
      // Usamos um ID fixo para o MVP, mas garantimos que ele existe ou tratamos o retorno vazio
      const stats = await storage.getDashboardStats("default-user");
      res.json(stats);
    } catch (err) {
      console.error("Stats fetch error:", err);
      res.status(500).json({ message: "Erro ao carregar estatísticas. Verifique se o banco de dados está pronto." });
    }
  });

  // Bulk sales import
  app.post("/api/sales/bulk", async (req, res) => {
    try {
      // Garantir que o usuário padrão existe antes de inserir vendas
      const existingUser = await storage.getUser("default-user");
      if (!existingUser) {
        await storage.createUser({ 
          username: "default-user", 
          password: "password123" // Senha padrão para o usuário interno
        });
      }

      const salesList = z.array(insertSaleSchema).parse(req.body);
      await storage.bulkCreateSales(salesList.map(s => ({ ...s, userId: "default-user" })), true);
      res.status(201).json({ message: "Sales imported successfully" });
    } catch (err) {
      console.error("Bulk sales error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Erro de validação nos dados da planilha", 
          details: err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ message: "Erro interno ao processar a planilha. Verifique a conexão com o banco de dados." });
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
