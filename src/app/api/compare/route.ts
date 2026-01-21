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
  const condition = searchParams.get('condition'); // 'new' ou 'used'

  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  // --- CORRECTION MAJEURE DES FILTRES (TBS) ---
  // On commence par "vw:g,mr:1" qui force Google à accepter les filtres
  let tbsArray = ["vw:g", "mr:1"]; 
  
  // 1. Filtre Prix
  if (minPrice || maxPrice) {
    tbsArray.push('price:1'); // Active le flag prix
    if (minPrice) tbsArray.push(`ppr_min:${minPrice}`);
    if (maxPrice) tbsArray.push(`ppr_max:${maxPrice}`);
  }

  // 2. Filtre État
  if (condition === 'new') tbsArray.push('new:1');
  if (condition === 'used') tbsArray.push('used:1'); // Parfois 'good:1' fonctionne aussi pour usagé

  const tbsString = tbsArray.join(',');

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
    tbs: tbsString // On envoie la formule magique
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
      let clean = priceInput.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
        const priceValue = parsePrice(item.price);
        
        // --- LIVRAISON ---
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

        // --- LIEN INTELLIGENT ---
        let finalLink = item.link;
        let merchantId = null; 

        const matchedMerchant = merchants.find((m: any) => 
            item.source && item.source.toLowerCase().includes(m.name.toLowerCase())
        );

        if (matchedMerchant) {
            merchantId = matchedMerchant.id;
            if (matchedMerchant.search_url) {
                // Nettoyage titre
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
            // --- INFO AVIS ---
            rating: item.rating, // Note (ex: 4.5)
            reviews: item.reviews // Nombre d'avis (ex: 1200)
        };
    }) || [];

    // TRI MANUEL (Gardons-le pour être sûr)
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