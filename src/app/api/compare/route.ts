import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sort = searchParams.get('sort');
  
  // NOUVEAU : On récupère la "location" (Ville) envoyée par l'app
  // Si aucune ville n'est fournie, on utilise "Canada" par défaut.
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
    // C'EST ICI QUE ÇA CHANGE : On passe directement la ville
    location: userLocation, 
    num: "20"
  });

  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // ... (Le reste du code de nettoyage des prix reste identique) ...
    // ... Copiez-collez votre fonction parsePrice et le map des products d'avant ...
    
    // Pour gagner de la place ici, je ne remets pas tout le bloc parsePrice 
    // car il ne change pas, mais assurez-vous de le garder !

    const parsePrice = (priceInput: any) => {
      if (typeof priceInput === 'number') return priceInput;
      if (!priceInput) return 0;
      let clean = priceInput.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
        const priceValue = parsePrice(item.price);
        let shippingCost = 0;
        const deliveryText = item.delivery || ""; 
        if (!deliveryText.toLowerCase().includes('gratuit') && !deliveryText.toLowerCase().includes('free')) {
            shippingCost = parsePrice(deliveryText);
        }

        return {
            id: item.position,
            title: item.title,
            price_display: item.price,
            shipping_display: shippingCost === 0 ? "Gratuit" : `+${shippingCost.toFixed(2)}$`,
            total_price_value: priceValue + shippingCost,
            source: item.source,
            link: item.link,
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