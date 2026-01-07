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
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { 
    rejectUnauthorized: false, 
  } : false,
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
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        fb_app_id TEXT,
        fb_app_secret TEXT,
        fb_access_token TEXT
      );

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        order_id TEXT UNIQUE,
        product_name TEXT,
        revenue INTEGER NOT NULL,
        clicks INTEGER DEFAULT 0,
        source TEXT,
        sub_id TEXT,
        order_date DATE,
        batch_id TEXT,
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        description TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category TEXT,
        date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS tracked_links (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        original_url TEXT NOT NULL,
        tracked_url TEXT NOT NULL,
        sub_id TEXT,
        clicks INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      
      -- Garantir que as tabelas sejam expostas no schema public para a API
      GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
      
      -- Tentar conceder permissões para roles do Supabase se existirem
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
          GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
          GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
        END IF;
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
          GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
        END IF;
      END $$;

      -- Forçar atualização do cache do PostgREST (Supabase)
      NOTIFY pgrst, 'reload schema';
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
