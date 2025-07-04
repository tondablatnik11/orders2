import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase URL:", SUPABASE_URL);
console.log("Supabase Key:", SUPABASE_ANON_KEY ? "✔️ loaded" : "❌ not loaded");