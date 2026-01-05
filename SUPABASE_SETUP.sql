-- COPIE E COLE ESTE SCRIPT NO "SQL EDITOR" DO SEU SUPABASE
-- ISSO VAI CRIAR AS TABELAS CORRETAMENTE PARA O INSTADASH

-- 1. Tabela de Vendas (Sales)
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default-user',
    order_id TEXT NOT NULL UNIQUE,
    product_name TEXT,
    order_date DATE NOT NULL,
    source TEXT NOT NULL, -- 'shopee_video' ou 'social_media'
    revenue INTEGER NOT NULL, -- Valor em centavos (ex: 1000 = R$ 10,00)
    clicks INTEGER DEFAULT 0,
    batch_id TEXT, -- Identificador do upload para exclusão em lote
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Despesas (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default-user',
    date DATE NOT NULL,
    amount INTEGER NOT NULL, -- Valor em centavos
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Usuários (Opcional se usar Supabase Auth, mas mantida para compatibilidade)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    fb_app_id TEXT,
    fb_app_secret TEXT,
    fb_access_token TEXT
);

-- Habilitar acesso público (apenas para teste inicial, considere RLS depois)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON sales FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON expenses FOR ALL USING (true) WITH CHECK (true);
