import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merchant_id, product_title, price } = body;

    if (!merchant_id) {
      return NextResponse.json({ error: 'No merchant ID' }, { status: 400 });
    }

    // On enregistre le clic dans Supabase
    const { error } = await supabase
      .from('clicks')
      .insert([
        { 
          merchant_id: merchant_id,
          product_title: product_title, // Optionnel : pour savoir quel produit attire
          clicked_at: new Date()
        }
      ]);

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}