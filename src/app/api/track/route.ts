import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merchant_id, product_title, price } = body;

    // Validation simple
    if (!merchant_id) {
      return NextResponse.json({ error: 'No merchant ID' }, { status: 400 });
    }

    // On enregistre le clic
    // Note: merchant_id est maintenant du texte (ex: 'Amazon')
    const { error } = await supabase
      .from('clicks')
      .insert([
        { 
          merchant_id: merchant_id, 
          product_title: product_title || 'Produit inconnu',
          amount_spent: 0, // Initialisé à 0 en attendant l'achat réel
          status: 'pending', // Statut par défaut
          created_at: new Date()
        }
      ]);

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}