import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

/**
 * Nota Técnica: Migração para Supabase
 * Devido a instabilidades de DNS no ambiente Replit (ENOTFOUND), 
 * estamos utilizando a conexão direta via Pool de Conexão (Porta 5432).
 */

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false, 
  },
  connectionTimeoutMillis: 30000, 
  idleTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });

// Função para garantir que a estrutura básica exista no novo banco
export async function setupTables() {
  let client;
  try {
    console.log("Sincronizando tabelas com Supabase...");
    client = await pool.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        order_id TEXT UNIQUE,
        product_name TEXT,
        revenue INTEGER NOT NULL,
        clicks INTEGER DEFAULT 0,
        source TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        description TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Estrutura de dados validada com sucesso!");
  } catch (error: any) {
    console.error("Aviso de Sincronização:", error.message);
    // Não interrompemos o servidor se o setup falhar, pois o pool tentará reconectar
  } finally {
    if (client) client.release();
  }
}

// Inicialização assíncrona
setupTables();
