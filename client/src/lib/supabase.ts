import { createClient } from "@supabase/supabase-js";

// Usamos as variáveis com prefixo VITE_ para que fiquem disponíveis no frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
}

// Fallback para strings vazias para evitar erro de inicialização imediata no carregamento do módulo
export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder");
