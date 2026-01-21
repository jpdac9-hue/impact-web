import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  // NOUVEAU : Paramètre de tri Google
  // options attendues: 'price_low', 'price_high', 'review_score', 'best_match'
  const sort = searchParams.get('sort') || 'best_match'; 
  
  const userLocation = searchParams.get('location') || "Canada";
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const condition = searchParams.get('condition'); 

  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  // --- CONSTRUCTION AVANCÉE DES FILTRES (TBS) ---
  // vw:g = Vue Grille, mr:1 = Résultats marchands
  let tbsParams = ["vw:g", "mr:1"]; 

  // 1. Filtre Prix (Limites strictes)
  if (minPrice || maxPrice) {
    tbsParams.push('price:1');
    if (minPrice) tbsParams.push(`ppr_min:${minPrice}`);
    if (maxPrice) tbsParams.push(`ppr_max:${maxPrice}`);
  }

  // 2. Filtre État
  if (condition === 'new') tbsParams.push('new:1');
  if (condition === 'used') tbsParams.push('used:1');

  const tbsString = tbsParams.join(',');

  const apiKey = process.env.SERPAPI_KEY;
  
  // --- MAPPAGE DU TRI ---
  // On convertit votre choix en langage SerpApi/Google
  let serpApiSort = undefined;
  if (sort === 'price_low') serpApiSort = 'price_low'; // Prix croissant
  if (sort === 'price_high') serpApiSort = 'price_high'; // Prix décroissant
  if (sort === 'review_score') serpApiSort = 'review_score'; // Meilleures notes
  // Si 'best_match', on n'envoie rien (par défaut)

  const params: any = {
    api_key: apiKey || '',
    engine: "google_shopping",
    q: query,
    google_domain: "google.ca",
    gl: "ca",
    hl: "fr",
    location: userLocation,
    num: "20",
    tbs: tbsString
  };

  // On ajoute le tri seulement s'il est défini
  if (serpApiSort) {
    params.sort = serpApiSort;
  }

  try {
    const [googleRes, supabaseRes] = await Promise.all([
      // On utilise une astuce pour construire l'URL avec les params dynamiques
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
        
        // --- LIVRAISON ---
        let shippingCost = 0;
        let shippingLabel = ""; // On laisse vide si on ne sait pas, c'est plus propre
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

    // PLUS BESOIN DE TRIER ICI (Google l'a fait pour nous !)
    
    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}