-- SCRIPT ATUALIZADO - GARANTE VÍNCULO DE USER_ID
-- Execute este script no SQL Editor do Supabase

-- 1. Criação das Tabelas (UUID é essencial para o vínculo automático)
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL, -- UUID obrigatório para vincular ao Auth
    order_id TEXT NOT NULL UNIQUE,
    product_name TEXT,
    order_date DATE NOT NULL,
    source TEXT NOT NULL,
    revenue INTEGER NOT NULL,
    clicks INTEGER DEFAULT 0,
    sub_id TEXT,
    batch_id TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracked_links (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    original_url TEXT NOT NULL,
    tracked_url TEXT NOT NULL,
    sub_id TEXT,
    clicks INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_sheets (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    sub_id TEXT UNIQUE NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_expenses (
    id SERIAL PRIMARY KEY,
    campaign_sheet_id INTEGER REFERENCES campaign_sheets(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Ativar RLS (Segurança)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_expenses ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Users can manage their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can manage their own links" ON tracked_links;
DROP POLICY IF EXISTS "Users can manage their own campaign sheets" ON campaign_sheets;
DROP POLICY IF EXISTS "Users can manage their own campaign expenses" ON campaign_expenses;

CREATE POLICY "Users can manage their own sales" ON sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own expenses" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own links" ON tracked_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own campaign sheets" ON campaign_sheets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own campaign expenses" ON campaign_expenses FOR ALL USING (
  EXISTS (
    SELECT 1 FROM campaign_sheets 
    WHERE id = campaign_expenses.campaign_sheet_id 
    AND user_id = auth.uid()
  )
);
