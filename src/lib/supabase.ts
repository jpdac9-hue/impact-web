import { createClient } from '@supabase/supabase-js';

// On utilise des variables d'environnement pour la sécurité sur le web
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);