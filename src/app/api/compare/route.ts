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

    // Fonction de nettoyage (inchangée mais robuste)
    const parsePrice = (priceInput: any) => {
      if (typeof priceInput === 'number') return priceInput;
      if (!priceInput) return 0;
      let clean = priceInput.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
        const priceValue = parsePrice(item.price);
        
        // --- AMÉLIORATION LIVRAISON ---
        let shippingCost = 0;
        // On regarde 'delivery' ET 'extracted_price' si dispo
        const deliveryText = item.delivery || ""; 
        
        // Si le texte contient "gratuit" ou "free", c'est 0.
        if (deliveryText.toLowerCase().includes('gratuit') || deliveryText.toLowerCase().includes('free')) {
            shippingCost = 0;
        } else {
            // Sinon on essaie d'extraire le chiffre
            shippingCost = parsePrice(deliveryText);
        }

        // --- AMÉLIORATION LIEN ---
        // On cherche le lien partout où il pourrait se cacher
        const finalLink = item.link || item.product_link || item.offer_url || item.inline_shopping_results?.[0]?.link || "";

        return {
            id: item.position,
            title: item.title,
            price_display: item.price,
            // Si le parse a échoué (0) mais que le texte n'était pas "gratuit", on affiche "?" pour être honnête
            shipping_display: (shippingCost === 0 && !deliveryText.toLowerCase().includes('gratuit') && deliveryText !== "") ? "?" : (shippingCost === 0 ? "Gratuit" : `+${shippingCost.toFixed(2)}$`),
            total_price_value: priceValue + shippingCost,
            source: item.source,
            link: finalLink, // On utilise le lien trouvé
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
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}