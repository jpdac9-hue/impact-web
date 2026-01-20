import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// On empêche le cache pour avoir des liens frais
export const dynamic = 'force-dynamic';

// Initialisation de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sort = searchParams.get('sort');
  const userLocation = searchParams.get('location') || "Canada";

  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  const apiKey = process.env.SERPAPI_KEY;
  const params = new URLSearchParams({
    api_key: apiKey || '',
    engine: "google_shopping",
    q: query,
    google_domain: "google.ca",
    gl: "ca",
    hl: "fr",
    location: userLocation, 
    num: "20"
  });

  try {
    // 1. On lance les deux requêtes en parallèle (Google + Supabase) pour aller vite
    const [googleRes, supabaseRes] = await Promise.all([
      fetch(`https://serpapi.com/search.json?${params}`),
      supabase.from('merchants').select('*')
    ]);

    const data = await googleRes.json();
    const merchants = supabaseRes.data || []; // Notre liste de règles marchands

    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });

    const parsePrice = (priceInput: any) => {
      if (!priceInput) return 0;
      let clean = priceInput.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
        const priceValue = parsePrice(item.price);
        
        // --- LOGIQUE LIVRAISON ---
        let shippingCost = 0;
        let shippingLabel = "?"; 
        const deliveryText = item.delivery || ""; 

        if (deliveryText) {
            const lowerText = deliveryText.toLowerCase();
            if (lowerText.includes('gratuit') || lowerText.includes('free')) {
                shippingCost = 0;
                shippingLabel = "Gratuit";
            } else {
                const extractedCost = parsePrice(deliveryText);
                if (extractedCost > 0) {
                    shippingCost = extractedCost;
                    shippingLabel = `+${extractedCost.toFixed(2)}$`;
                } else {
                    shippingCost = 0; 
                    shippingLabel = "Info site"; 
                }
            }
        }

        // --- MAGIE DU LIEN INTELLIGENT ---
        let finalLink = item.link; // Par défaut, le lien Google
        
        // On essaie de trouver le marchand dans notre base de données
        // Ex: Si item.source = "Amazon.ca Marketplace", et que merchants contient "Amazon" -> Ça matche
// ... (votre code de matching marchand reste pareil) ...

        const matchedMerchant = merchants.find((m: any) => 
            item.source && item.source.toLowerCase().includes(m.name.toLowerCase())
        );

        let merchantId = null; // Variable pour stocker l'ID

        if (matchedMerchant) {
            merchantId = matchedMerchant.id; // ON RÉCUPÈRE L'ID ICI !
            const encodedTitle = encodeURIComponent(item.title);
            finalLink = `${matchedMerchant.search_url}${encodedTitle}${matchedMerchant.affiliate_suffix || ''}`;
        } else {
            if (item.product_link) finalLink = item.product_link;
            if (item.offer_url) finalLink = item.offer_url;
        }

        const total = priceValue + shippingCost;

        return {
            id: item.position,
            title: item.title,
            price_display: item.price,
            shipping_display: shippingLabel,
            total_price_value: total,
            source: item.source,
            link: finalLink,
            merchant_id: merchantId, // <--- NOUVEAU CHAMP ENVOYÉ À L'APP
            image: item.thumbnail,
            rating: item.rating
        };
    }) || [];

    // TRI
    if (sort === 'asc') {
      products.sort((a: any, b: any) => a.total_price_value - b.total_price_value);
    } else if (sort === 'desc') {
      products.sort((a: any, b: any) => b.total_price_value - a.total_price_value);
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}