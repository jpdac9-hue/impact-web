import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  // Paramètres de l'interface
  const sort = searchParams.get('sort'); // price_low, price_high, review_score
  const userLocation = searchParams.get('location') || "Canada";
  
  // Paramètre technique Google (TBS) pour les filtres actifs (ex: prix min, marque, état)
  const tbs = searchParams.get('tbs');

  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  const apiKey = process.env.SERPAPI_KEY;
  
  // 1. Configuration de base
  const params: any = {
    api_key: apiKey || '',
    engine: "google_shopping",
    q: query,
    google_domain: "google.ca",
    gl: "ca",
    hl: "fr",
    location: userLocation,
    num: "20",
  };

  // 2. Gestion du TRI (Sorting)
  // SerpApi gère ça très bien si on lui donne le bon mot clé
  if (sort === 'price_low') params.sort = 'price_low';
  if (sort === 'price_high') params.sort = 'price_high';
  if (sort === 'review_score') params.sort = 'review_score';
  // Si 'best_match', on ne met rien, c'est le défaut.

  // 3. Gestion des FILTRES (Refine Results)
  // Si l'app nous envoie un code TBS (ex: pour un prix spécifique ou une marque), on l'utilise
  if (tbs) {
    params.tbs = tbs;
  } else {
    // Sinon, on active au moins le mode "Vue Grille" pour avoir des résultats propres
    params.tbs = "vw:g,mr:1";
  }

  try {
    const [googleRes, supabaseRes] = await Promise.all([
      fetch(`https://serpapi.com/search.json?${new URLSearchParams(params).toString()}`),
      supabase.from('Merchant').select('*') 
    ]);

    const data = await googleRes.json();
    const merchants = supabaseRes.data || []; 

    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });

    // --- NETTOYAGE DES PRIX ---
    const parsePrice = (priceInput: any) => {
      if (!priceInput) return 0;
      let clean = priceInput.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
        const priceValue = parsePrice(item.price);
        
        // Livraison
        let shippingCost = 0;
        let shippingLabel = ""; 
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
                    shippingLabel = `+${extractedCost.toFixed(2)}$ Liv.`;
                }
            }
        }

        // Matching Marchand
        let finalLink = item.link;
        let merchantId = item.source || "Autre"; 
        const matchedMerchant = merchants.find((m: any) => 
            item.source && item.source.toLowerCase().includes(m.name.toLowerCase())
        );

        if (matchedMerchant) {
            merchantId = matchedMerchant.id;
            if (matchedMerchant.search_url) {
                let cleanTitle = item.title.replace(/[\(\)\[\]\/\\,\-]/g, ' ');
                cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
                const words = cleanTitle.split(' ');
                if (words.length > 6) cleanTitle = words.slice(0, 6).join(' ');
                const encodedTitle = encodeURIComponent(cleanTitle);
                finalLink = `${matchedMerchant.search_url}${encodedTitle}${matchedMerchant.affiliate_suffix || ''}`;
            }
        } else {
            if (item.product_link) finalLink = item.product_link;
            if (item.offer_url) finalLink = item.offer_url;
        }

        return {
            id: item.position,
            title: item.title,
            price_display: item.price,
            shipping_display: shippingLabel,
            total_price_value: priceValue + shippingCost,
            source: item.source,
            link: finalLink,
            merchant_id: merchantId,
            image: item.thumbnail,
            rating: item.rating,
            reviews: item.reviews
        };
    }) || [];

    // --- IMPORTANT : ON RENVOIE LES FILTRES (FACETS) ---
    // Google nous donne ici la liste des marques, magasins, etc. disponibles
    const filters = data.filters || [];

    return NextResponse.json({ products, filters });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}