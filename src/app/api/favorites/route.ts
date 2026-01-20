import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Utilisation de la clé Service Role pour contourner les restrictions RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. GET : Récupérer les favoris d'un utilisateur
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');

  if (!user_id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  // On récupère tout pour cet utilisateur, trié par date
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ favorites: data });
}

// 2. POST : Ajouter un favori
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, merchant_id, product_title, product_link, image_url, price } = body;

    if (!user_id || !product_title) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // On vérifie si le favori existe déjà pour éviter les doublons
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user_id)
      .eq('product_title', product_title)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Déjà favori', id: existing.id });
    }

    // Insertion
    const { data, error } = await supabase
      .from('favorites')
      .insert([
        {
          user_id,
          merchant_id: merchant_id || 'Autre', // Sécurité si merchant_id est vide
          product_title,
          product_link,
          image_url,
          price: price || 0
        }
      ])
      .select();

    if (error) {
      console.error("Erreur Insert:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. DELETE : Supprimer un favori
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body; // On supprime par ID unique de la ligne favori

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase.from('favorites').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}