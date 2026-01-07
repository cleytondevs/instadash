import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSaleSchema, insertExpenseSchema, insertTrackedLinkSchema } from "@shared/schema";
import { z } from "zod";
import { handleDataDeletion } from "./facebook-callback";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Facebook Data Deletion Callback
  app.post("/api/facebook/deletion", handleDataDeletion);
  
  // Tracked Links
  app.get("/api/links", async (req, res) => {
    const links = await storage.getTrackedLinks("default-user");
    res.json(links);
  });

  app.post("/api/links", async (req, res) => {
    try {
      console.log("Recebendo link para salvar:", req.body);
      const data = insertTrackedLinkSchema.parse(req.body);
      const link = await storage.createTrackedLink({ ...data, userId: "default-user" });
      res.status(201).json(link);
    } catch (err) {
      console.error("Erro ao salvar link:", err);
      res.status(400).json({ message: "Dados inválidos", details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.patch("/api/links/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).send("ID inválido");
      const data = insertTrackedLinkSchema.partial().parse(req.body);
      const link = await storage.updateTrackedLink(id, data);
      res.json(link);
    } catch (err) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Redirect handler for tracked links
  app.get("/l/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send("ID inválido");
    
    const links = await storage.getTrackedLinks("default-user");
    const link = links.find(l => l.id === id);
    
    if (link) {
      await storage.incrementLinkClicks(id);
      res.redirect(link.originalUrl);
    } else {
      res.status(404).send("Link não encontrado");
    }
  });

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
      await storage.bulkCreateSales(salesList.map(s => ({ ...s, userId: "default-user", isManual: false })), true);
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
