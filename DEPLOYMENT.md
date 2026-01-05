# Instruções de Implantação (Netlify + Supabase)

## 1. Banco de Dados (Supabase)
1. Crie um projeto no Supabase.
2. Vá em **Project Settings > Database** e copie a **Connection String (URI)**.
3. No seu ambiente de backend (Replit ou outro), configure a variável de ambiente:
   - `DATABASE_URL`: A string de conexão que você copiou.

## 2. Frontend (Netlify)
1. Conecte seu repositório ao Netlify.
2. Configurações de Build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Variáveis de Ambiente no Netlify:
   - `VITE_API_URL`: A URL do seu backend (ex: `https://seu-projeto.replit.app`).

## 3. Backend (CORS)
Se o frontend estiver no Netlify, você deve configurar o CORS no backend (já preparado no código) permitindo a URL do Netlify.
- Defina `FRONTEND_URL` no backend com a URL do seu site no Netlify.
