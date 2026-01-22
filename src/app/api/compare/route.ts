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
    const minPriceRaw = searchParams.get('min_price');
    const maxPriceRaw = searchParams.get('max_price');
    const condition = searchParams.get('condition');
    const tbsParam = searchParams.get('tbs');

    // Conversion en nombres pour le filtrage manuel
    const minPrice = minPriceRaw ? parseFloat(minPriceRaw) : 0;
    const maxPrice = maxPriceRaw ? parseFloat(maxPriceRaw) : Infinity;

    const apiKey = process.env.SERPAPI_KEY;

    // --- CONSTRUCTION PARAMÈTRES GOOGLE ---
    const params: any = {
      api_key: apiKey || '',
      engine: "google_shopping",
      q: query,
      google_domain: "google.ca",
      gl: "ca",
      hl: "fr",
      location: userLocation,
      num: "50", // ON DEMANDE PLUS DE RÉSULTATS POUR AVOIR DU CHOIX APRÈS FILTRAGE
    };

    // 1. TENTATIVE DE FILTRAGE GOOGLE (Best Effort)
    let tbsArray = ["vw:g", "mr:1"]; // Grid + Merchant
    
    if (tbsParam) {
      params.tbs = tbsParam; // Si on a un filtre "Affiner" précis
    } else {
      // Construction manuelle
      if (minPriceRaw || maxPriceRaw) {
        tbsArray.push('price:1');
        if (minPriceRaw) tbsArray.push(`ppr_min:${minPriceRaw}`);
        if (maxPriceRaw) tbsArray.push(`ppr_max:${maxPriceRaw}`);
      }
      if (condition === 'new') tbsArray.push('new:1');
      if (condition === 'used') tbsArray.push('used:1');
      
      params.tbs = tbsArray.join(',');
    }

    // 2. TENTATIVE DE TRI GOOGLE
    if (sort === 'price_low') params.sort = 'price_low';
    else if (sort === 'price_high') params.sort = 'price_high';
    else if (sort === 'review_score') params.sort = 'review_score';

    console.log("Paramètres Google:", JSON.stringify(params));

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
            price_raw: priceValue, // Pour le filtrage manuel
            source: item.source,
            link: finalLink,
            merchant_id: merchantId,
            image: item.thumbnail,
            rating: item.rating,
            reviews: item.reviews
        };
    }) || [];

    // --- 3. FILTRAGE MANUEL (FILET DE SÉCURITÉ) ---
    // Si Google a ignoré nos filtres, on les applique brutalement ici.
    
    if (minPriceRaw || maxPriceRaw) {
      products = products.filter((p: any) => {
        if (p.price_raw < minPrice) return false;
        if (p.price_raw > maxPrice) return false;
        return true;
      });
    }

    // --- 4. TRI MANUEL (DOUBLE SÉCURITÉ) ---
    // Si Google n'a pas bien trié, on le refait
    if (sort === 'price_low') {
        products.sort((a: any, b: any) => a.total_price_value - b.total_price_value);
    } else if (sort === 'price_high') {
        products.sort((a: any, b: any) => b.total_price_value - a.total_price_value);
    } else if (sort === 'review_score') {
        products.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    }

    return NextResponse.json({ products, filters: data.filters || [] });

  } catch (error: any) {
    console.error("Erreur Backend:", error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}