-- COPIE E COLE ESTE SCRIPT NO "SQL EDITOR" DO SEU SUPABASE
-- ISSO VAI CRIAR AS TABELAS CORRETAMENTE E HABILITAR A SEGURANÇA POR USUÁRIO (RLS)

-- 1. Tabela de Vendas (Sales)
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    user_id UUID, 
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

-- 2. Tabela de Despesas (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    date DATE NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Links Rastreados (Tracked Links)
CREATE TABLE IF NOT EXISTS tracked_links (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    original_url TEXT NOT NULL,
    tracked_url TEXT NOT NULL,
    sub_id TEXT,
    clicks INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Tabela de Planilhas de Campanha (Campaign Sheets)
CREATE TABLE IF NOT EXISTS campaign_sheets (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    sub_id TEXT UNIQUE NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Tabela de Gastos de Campanha (Campaign Expenses)
CREATE TABLE IF NOT EXISTS campaign_expenses (
    id SERIAL PRIMARY KEY,
    campaign_sheet_id INTEGER REFERENCES campaign_sheets(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- CONFIGURAÇÃO DE SEGURANÇA (RLS)
-- Isso garante que um usuário só veja os SEUS próprios dados.

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
CREATE POLICY "Users can manage their own sales" ON sales 
FOR ALL USING (auth.uid() = user_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own expenses" ON expenses;
CREATE POLICY "Users can manage their own expenses" ON expenses 
FOR ALL USING (auth.uid() = user_id);

ALTER TABLE tracked_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own links" ON tracked_links;
CREATE POLICY "Users can manage their own links" ON tracked_links 
FOR ALL USING (auth.uid() = user_id);

ALTER TABLE campaign_sheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own campaign sheets" ON campaign_sheets;
CREATE POLICY "Users can manage their own campaign sheets" ON campaign_sheets 
FOR ALL USING (auth.uid() = user_id);

-- Para campaign_expenses, a segurança vem através da relação com campaign_sheets
ALTER TABLE campaign_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own campaign expenses" ON campaign_expenses;
CREATE POLICY "Users can manage their own campaign expenses" ON campaign_expenses 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM campaign_sheets 
    WHERE id = campaign_expenses.campaign_sheet_id 
    AND user_id = auth.uid()
  )
);
