import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// URL de conexão do banco de dados (Secret DATABASE_URL no Replit)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL não configurada. Certifique-se de adicionar a URL do Supabase nos Secrets.");
}

export const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });

// Função para criar as tabelas automaticamente se necessário
export async function setupTables() {
  if (!connectionString) return;
  
  try {
    console.log("Verificando tabelas no Supabase...");
    
    await pool.query(`
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

    console.log("Banco de dados sincronizado com sucesso!");
  } catch (error) {
    console.error("Erro ao sincronizar tabelas:", error.message);
  }
}

setupTables().catch(console.error);
