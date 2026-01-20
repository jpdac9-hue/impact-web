import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// CHANGEMENT ICI : On essaie d'abord la clé Service Role (Admin), sinon la clé Anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    // ... (Le reste du code reste identique) ...
  try {
    const body = await request.json();
    const { merchant_id, product_title, user_id } = body;

    // 1. Validation
    if (!merchant_id || !user_id) {
      return NextResponse.json({ error: 'Missing merchant_id or user_id' }, { status: 400 });
    }

    // 2. On récupère les infos du Marchand (Taux, Nom, etc.) pour remplir l'historique
    const { data: merchantData, error: merchantError } = await supabase
      .from('Merchant') // Attention à la majuscule
      .select('*')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchantData) {
      console.error("Marchand introuvable:", merchantError);
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // 3. On insère le clic complet
    const { error: insertError } = await supabase
      .from('clicks')
      .insert([
        { 
          user_id: user_id,                  // LE CHAINON MANQUANT !
          merchant_id: merchant_id,          // ex: 'Amazon'
          merchant_name: merchantData.name,  // ex: 'Amazon'
          product_title: product_title || 'Recherche produit',
          
          // On remplit les infos financières pour l'affichage
          commission_rate: merchantData.commissionRate,
          reward_type: merchantData.reward_type,
          status: 'pending',
          amount_spent: 0,
          actual_gain: 0,
          created_at: new Date()
        }
      ]);

    if (insertError) {
      console.error('Erreur Insert Clicks:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur Serveur:", error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}