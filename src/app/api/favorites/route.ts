import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. GET : Récupérer les favoris (Avec filtre optionnel)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');
  const type = searchParams.get('type'); // 'merchant' ou 'product'

  if (!user_id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  let query = supabase.from('favorites').select('*').eq('user_id', user_id);

  // Si on veut seulement les marchands favoris (Site Web)
  if (type === 'merchant') {
    query = query.is('product_title', null);
  }
  // Si on veut seulement les produits favoris (App Comparateur)
  else if (type === 'product') {
    query = query.not('product_title', 'is', null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ favorites: data });
}

// 2. POST : Ajouter un favori (Marchand OU Produit)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // product_title est optionnel : s'il est là, c'est un produit. Sinon, c'est un marchand.
    const { user_id, merchant_id, product_title, product_link, image_url, price } = body;

    if (!user_id || !merchant_id) {
      return NextResponse.json({ error: 'Missing basic data' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert([
        {
          user_id,
          merchant_id, // ex: 'Amazon'
          
          // Si ces champs sont vides (cas du site web), ils seront NULL dans la base
          product_title: product_title || null, 
          product_link: product_link || null,
          image_url: image_url || null,
          price: price || null
        }
      ])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. DELETE : Supprimer un favori
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const item_id = searchParams.get('id'); // ID unique de la ligne favorite
    
    // Fallback pour compatibilité : suppression par marchand/titre
    const merchant_id = searchParams.get('merchant_id');
    const product_title = searchParams.get('title');

    if (!user_id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    let query = supabase.from('favorites').delete().eq('user_id', user_id);

    if (item_id) {
      // Suppression précise par ID
      query = query.eq('id', item_id);
    } else if (product_title) {
       // Suppression d'un PRODUIT spécifique
       query = query.eq('product_title', product_title);
    } else if (merchant_id) {
       // Suppression d'un MARCHAND (et attention, ça pourrait supprimer les produits liés si on ne filtre pas)
       // Pour être sûr de ne supprimer QUE le favori marchand "général", on ajoute :
       query = query.eq('merchant_id', merchant_id).is('product_title', null);
    } else {
        return NextResponse.json({ error: 'Missing deletion criteria' }, { status: 400 });
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}