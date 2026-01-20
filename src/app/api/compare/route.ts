import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sort = searchParams.get('sort');
  const userLocation = searchParams.get('location') || "Canada";

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

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
    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // --- FONCTION DE PARSING INTELLIGENTE ---
    const parsePrice = (priceInput: any) => {
      if (!priceInput) return 0;
      // On convertit en string et on garde chiffres, points et virgules
      let clean = priceInput.toString().replace(/[^0-9.,]/g, '');
      // On remplace la virgule par un point pour le calcul
      clean = clean.replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
        const priceValue = parsePrice(item.price);
        
        // --- 1. LOGIQUE LIVRAISON STRICTE ---
        let shippingCost = 0;
        let shippingLabel = "?"; // Par défaut, on ne sait pas

        // On récupère le texte brut (ex: "+ 15,00 $ livraison")
        const deliveryText = item.delivery || ""; 

        if (deliveryText) {
            const lowerText = deliveryText.toLowerCase();
            
            if (lowerText.includes('gratuit') || lowerText.includes('free')) {
                // Cas 1 : C'est écrit gratuit explicitement
                shippingCost = 0;
                shippingLabel = "Gratuit";
            } else {
                // Cas 2 : Il y a un texte, on essaie de trouver un prix
                const extractedCost = parsePrice(deliveryText);
                if (extractedCost > 0) {
                    shippingCost = extractedCost;
                    shippingLabel = `+${extractedCost.toFixed(2)}$`;
                } else {
                    // Cas 3 : Il y a du texte mais pas de chiffre clair
                    // On laisse shippingCost à 0 pour le tri, mais on affiche "?"
                    shippingCost = 0; 
                    shippingLabel = "Info sur site"; 
                }
            }
        } else {
            // Cas 4 : Pas d'info de livraison fournie par Google
            shippingLabel = "?";
        }

        // --- 2. CHASSEUR DE LIEN ---
        // On essaie de trouver le lien direct marchand
        // Parfois caché dans 'product_link' ou 'offer_url'
        let finalLink = item.link; // Le lien par défaut (souvent Google)
        
        if (item.product_link) finalLink = item.product_link;
        if (item.offer_url) finalLink = item.offer_url;

        // Calcul du total (Si livraison inconnue, Total = Prix + 0)
        const total = priceValue + shippingCost;

        return {
            id: item.position,
            title: item.title,
            price_display: item.price,
            shipping_display: shippingLabel, // On envoie le texte correct (Gratuit, +15$, ou ?)
            total_price_value: total,
            source: item.source,
            link: finalLink,
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
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}