import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfiguration: No API Key' }, { status: 500 });
  }

  // Configuration de la recherche Google Shopping (Canada/Français)
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google_shopping",
    q: query,
    google_domain: "google.ca", // Recherche au Canada
    gl: "ca",                   // Géolocalisation Canada
    hl: "fr",                   // Langue Française
    num: "20"                   // 20 résultats
  });

  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // On nettoie les données pour ne garder que l'essentiel
    const products = data.shopping_results?.map((item: any) => ({
      id: item.position,
      title: item.title,
      price: item.price,
      source: item.source,
      link: item.link,
      image: item.thumbnail,
      rating: item.rating,
      reviews: item.reviews
    })) || [];

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}