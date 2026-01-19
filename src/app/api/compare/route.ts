import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sort = searchParams.get('sort'); // 'asc' ou 'desc'
  const postalCode = searchParams.get('zip'); // Code postal

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_KEY;

  // Configuration de la recherche avec localisation
  const params = new URLSearchParams({
    api_key: apiKey || '',
    engine: "google_shopping",
    q: query,
    google_domain: "google.ca",
    gl: "ca",
    hl: "fr",
    location: postalCode ? `Canada postal code ${postalCode}` : "Canada", // Tentative de localisation
    num: "20"
  });

  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // Fonction pour nettoyer le prix (enlever le '$', les espaces, etc.)
    const parsePrice = (priceStr: string) => {
      if (!priceStr) return 0;
      // Garde seulement les chiffres et le point
      const clean = priceStr.replace(/[^0-9.]/g, ''); 
      return parseFloat(clean);
    };

    let products = data.shopping_results?.map((item: any) => {
      const priceValue = item.extracted_price || parsePrice(item.price);
      
      // Extraction du coût de livraison
      let shippingCost = 0;
      const deliveryText = item.delivery || ""; // Ex: "+ $15.00 delivery"
      
      if (deliveryText.toLowerCase().includes('free') || deliveryText.toLowerCase().includes('gratuit')) {
        shippingCost = 0;
      } else {
        // Tente d'extraire un chiffre du texte de livraison
        shippingCost = parsePrice(deliveryText);
      }

      return {
        id: item.position,
        title: item.title,
        price_display: item.price, // Texte affiché (ex: 1 200 $)
        shipping_display: shippingCost === 0 ? "Gratuit" : `+${shippingCost}$`,
        total_price_value: priceValue + shippingCost, // Pour le tri
        source: item.source,
        link: item.link,
        image: item.thumbnail,
        rating: item.rating,
        reviews: item.reviews
      };
    }) || [];

    // TRI LOGIQUE (Croissant ou Décroissant sur le TOTAL)
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