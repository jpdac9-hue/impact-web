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
    // 1. On interroge la table "Merchant" (Celle avec majuscule !)
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
        let merchantId = null; // Sera 'Amazon', 'Walmart', etc.

        // On cherche si la source Google contient le nom d'un de nos marchands
        const matchedMerchant = merchants.find((m: any) => 
            item.source && item.source.toLowerCase().includes(m.name.toLowerCase())
        );

// ... code précédent ...

        if (matchedMerchant) {
            merchantId = matchedMerchant.id; // On récupère l'ID texte ('Amazon', 'Best Buy')
            
            // Si on a l'URL de recherche spéciale, on l'utilise
            if (matchedMerchant.search_url) {
                
                // --- NETTOYAGE INTELLIGENT DU TITRE ---
                // 1. On enlève les caractères spéciaux qui cassent les recherches (parentheses, crochets, slashs)
                let cleanTitle = item.title.replace(/[\(\)\[\]\/\\,\-]/g, ' ');
                
                // 2. On enlève les espaces multiples créés par le remplacement
                cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

                // 3. On ne garde que les 6 premiers mots (Best Buy déteste les phrases trop longues)
                const words = cleanTitle.split(' ');
                if (words.length > 6) {
                    cleanTitle = words.slice(0, 6).join(' ');
                }
                // ---------------------------------------

                const encodedTitle = encodeURIComponent(cleanTitle);
                finalLink = `${matchedMerchant.search_url}${encodedTitle}${matchedMerchant.affiliate_suffix || ''}`;
            }
        } else {
             // ... reste du code ...
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
            merchant_id: merchantId, // Envoie 'Amazon' ou 'Walmart' à l'app mobile
            image: item.thumbnail,
            rating: item.rating
        };
    }) || [];

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