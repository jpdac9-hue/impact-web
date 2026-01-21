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
  
  // Filtres manuels
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const condition = searchParams.get('condition');
  
  // Filtre Google (TBS) envoyé directement par le bouton "Affiner"
  const tbsParam = searchParams.get('tbs');

  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  const apiKey = process.env.SERPAPI_KEY;
  
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

  // --- GESTION INTELLIGENTE DES FILTRES (TBS) ---
  if (tbsParam) {
    // Cas 1 : On a reçu un code TBS précis depuis l'app (Menu Affiner)
    params.tbs = tbsParam;
  } else {
    // Cas 2 : On construit le TBS à partir des champs manuels (Prix/État)
    let tbsArray = ["vw:g", "mr:1"]; // Toujours activer Grid View + Merchant Results
    
    if (minPrice || maxPrice) {
      tbsArray.push('price:1'); // Active le flag prix
      if (minPrice) tbsArray.push(`ppr_min:${minPrice}`);
      if (maxPrice) tbsArray.push(`ppr_max:${maxPrice}`);
    }

    if (condition === 'new') tbsArray.push('new:1');
    if (condition === 'used') tbsArray.push('used:1');

    params.tbs = tbsArray.join(',');
  }

  // --- GESTION DU TRI ---
  // SerpApi gère le tri via le paramètre 'sort', indépendamment de 'tbs'
  if (sort === 'price_low') params.sort = 'price_low';
  else if (sort === 'price_high') params.sort = 'price_high';
  else if (sort === 'review_score') params.sort = 'review_score';

  console.log("Paramètres envoyés à Google:", params); // Pour débugger sur Vercel

  try {
    const [googleRes, supabaseRes] = await Promise.all([
      fetch(`https://serpapi.com/search.json?${new URLSearchParams(params).toString()}`),
      supabase.from('Merchant').select('*') 
    ]);

    const data = await googleRes.json();
    const merchants = supabaseRes.data || []; 

    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });

    const parsePrice = (priceInput: any) => {
      if (!priceInput) return 0;
      let clean = priceInput.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
        const priceValue = parsePrice(item.price);
        
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

    const filters = data.filters || [];

    return NextResponse.json({ products, filters });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}