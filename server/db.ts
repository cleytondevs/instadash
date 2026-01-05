import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Configuração robusta do pool usando parâmetros individuais
export const pool = new Pool({ 
  user: 'postgres',
  host: 'db.vbhvghgvpjknsfwiyvft.supabase.co',
  database: 'postgres',
  password: '.W3haNk?qsumaJF',
  port: 5432,
  ssl: { 
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000,
});

export const db = drizzle(pool, { schema });

// Função para criar as tabelas automaticamente
export async function setupTables() {
  let client;
  try {
    console.log("Verificando tabelas no Supabase...");
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
    console.log("Banco de dados sincronizado com sucesso!");
  } catch (error: any) {
    console.error("Erro na sincronização do banco de dados:", error.message);
  } finally {
    if (client) client.release();
  }
}

// Inicialização
setupTables().catch(err => console.error("Falha no setup:", err));
