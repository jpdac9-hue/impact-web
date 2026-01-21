import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sort = searchParams.get('sort');
  const userLocation = searchParams.get('location') || "Canada";
  
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const condition = searchParams.get('condition'); 

  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  // --- FILTRES (TBS) ---
  let tbsParams = ["vw:g", "mr:1"]; // Force le mode magasinage avancé
  
  if (minPrice || maxPrice) {
    tbsParams.push('price:1');
    if (minPrice) tbsParams.push(`ppr_min:${minPrice}`);
    if (maxPrice) tbsParams.push(`ppr_max:${maxPrice}`);
  }

  if (condition === 'new') tbsParams.push('new:1');
  else if (condition === 'used') tbsParams.push('used:1');

  const tbsString = tbsParams.join(',');

  const apiKey = process.env.SERPAPI_KEY;
  const params = new URLSearchParams({
    api_key: apiKey || '',
    engine: "google_shopping",
    q: query,
    google_domain: "google.ca",
    gl: "ca",
    hl: "fr",
    location: userLocation, 
    num: "20",
    tbs: tbsString
  });

  try {
    const [googleRes, supabaseRes] = await Promise.all([
      fetch(`https://serpapi.com/search.json?${params}`),
      supabase.from('Merchant').select('*') 
    ]);

    const data = await googleRes.json();
    const merchants = supabaseRes.data || []; 

    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });

    const parsePrice = (priceInput: any) => {
      if (!priceInput) return 0;
      // On garde uniquement chiffres, points et virgules
      let clean = priceInput.toString().replace(/[^0-9.,]/g, '');
      // On remplace la virgule par un point pour que l'ordi comprenne
      clean = clean.replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
        const priceValue = parsePrice(item.price);
        
        // --- NOUVELLE LOGIQUE LIVRAISON ---
        let shippingCost = 0;
        let shippingLabel = "Livraison : Info site"; // Par défaut si on ne trouve rien
        const deliveryText = item.delivery || ""; 

        if (deliveryText) {
            const lowerText = deliveryText.toLowerCase();
            
            if (lowerText.includes('gratuit') || lowerText.includes('free')) {
                shippingCost = 0;
                shippingLabel = "Livraison Gratuite";
            } else {
                // On essaie d'extraire un chiffre du texte (ex: "Environ 15$")
                const extractedCost = parsePrice(deliveryText);
                if (extractedCost > 0) {
                    shippingCost = extractedCost;
                    // ICI : On ajoute le mot "Livraison"
                    shippingLabel = `+ ${extractedCost.toFixed(2)}$ Livraison`;
                }
            }
        }

        // --- LIEN & MARCHAND ---
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
            shipping_display: shippingLabel, // Contient maintenant le texte complet
            total_price_value: priceValue + shippingCost,
            source: item.source,
            link: finalLink,
            merchant_id: merchantId,
            image: item.thumbnail,
            rating: item.rating,
            reviews: item.reviews
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