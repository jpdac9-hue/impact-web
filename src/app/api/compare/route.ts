import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const sort = searchParams.get('sort');
  const postalCode = searchParams.get('zip');

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_KEY;
  
  // Configuration pour le Canada (Français)
  const params = new URLSearchParams({
    api_key: apiKey || '',
    engine: "google_shopping",
    q: query,
    google_domain: "google.ca",
    gl: "ca",
    hl: "fr", 
    location: postalCode ? `Canada postal code ${postalCode}` : "Canada",
    num: "20"
  });

  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // --- LE SECRÉT MATHÉMATIQUE ---
    const parsePrice = (priceInput: any) => {
      if (typeof priceInput === 'number') return priceInput;
      if (!priceInput) return 0;

      // Convertit en texte
      let clean = priceInput.toString();
      
      // Enlève tout ce qui n'est pas chiffre, point ou virgule
      // Ex: "1 129,00 $" -> "1129,00"
      clean = clean.replace(/[^0-9.,]/g, '');

      // Remplace la virgule par un point (Format informatique)
      // "1129,00" -> "1129.00"
      clean = clean.replace(',', '.');

      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
      // Nettoyage du prix principal
      const priceValue = parsePrice(item.price);
      
      // Nettoyage de la livraison
      let shippingCost = 0;
      const deliveryText = item.delivery || ""; 
      
      if (deliveryText.toLowerCase().includes('gratuit') || deliveryText.toLowerCase().includes('free')) {
        shippingCost = 0;
      } else {
        shippingCost = parsePrice(deliveryText);
      }

      return {
        id: item.position,
        title: item.title,
        price_display: item.price, // On garde le beau texte pour l'affichage
        shipping_display: shippingCost === 0 ? "Gratuit" : `+${shippingCost.toFixed(2)}$`,
        
        // C'EST CE CHAMP QUI MANQUAIT :
        total_price_value: priceValue + shippingCost, 
        
        source: item.source,
        link: item.link,
        image: item.thumbnail,
        rating: item.rating
      };
    }) || [];

    // TRI DU TOTAL
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