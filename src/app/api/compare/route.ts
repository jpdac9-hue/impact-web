import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const sort = searchParams.get('sort'); 
    const userLocation = searchParams.get('location') || "Canada";
    
    // Filtres
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const condition = searchParams.get('condition');
    const tbsParam = searchParams.get('tbs');

    const apiKey = process.env.SERPAPI_KEY;

    // --- CONSTRUCTION DU TBS (Filtres Google) ---
    let finalTbs = "";

    if (tbsParam) {
      // Cas A : Filtre direct (Affiner)
      finalTbs = tbsParam;
    } else {
      // Cas B : Filtres manuels (Prix/État)
      let tbsArray = ["vw:g", "mr:1"]; // Vue Grille + Marchands
      
      if (minPrice || maxPrice) {
        tbsArray.push('price:1');
        if (minPrice) tbsArray.push(`ppr_min:${minPrice}`);
        if (maxPrice) tbsArray.push(`ppr_max:${maxPrice}`);
      }

      if (condition === 'new') tbsArray.push('new:1');
      if (condition === 'used') tbsArray.push('used:1');

      finalTbs = tbsArray.join(',');
    }

    // --- CONSTRUCTION DES PARAMÈTRES ---
    const params: any = {
      api_key: apiKey || '',
      engine: "google_shopping",
      q: query,
      google_domain: "google.ca",
      gl: "ca",
      hl: "fr",
      location: userLocation,
      num: "20",
      tbs: finalTbs // On assigne le TBS calculé
    };

    // Ajout du tri
    if (sort === 'price_low') params.sort = 'price_low';
    else if (sort === 'price_high') params.sort = 'price_high';
    else if (sort === 'review_score') params.sort = 'review_score';

    // --- APPELS API ---
    const [googleRes, supabaseRes] = await Promise.all([
      fetch(`https://serpapi.com/search.json?${new URLSearchParams(params).toString()}`),
      supabase.from('Merchant').select('*') 
    ]);

    const data = await googleRes.json();
    const merchants = supabaseRes.data || []; 

    if (data.error) {
      console.error("Erreur SerpApi:", data.error);
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // --- TRAITEMENT DES RÉSULTATS ---
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

    return NextResponse.json({ products, filters: data.filters || [] });

  } catch (error: any) {
    console.error("Erreur Backend:", error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}