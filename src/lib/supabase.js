import { createClient } from '@supabase/supabase-js';

// Usa as variáveis de ambiente ou fallback para o projeto configurado
const url = import.meta.env.VITE_SUPABASE_URL || 'https://udjitbjznisqwukkrorz.supabase.co';
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaml0Ymp6bmlzcXd1a2tyb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Nzc0ODQsImV4cCI6MjEwNzI1MzQ4NH0.0MYLD_jN3CFVVgptxcJ0JUpkO-WuME5itBZq6uZ0SJQ';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
