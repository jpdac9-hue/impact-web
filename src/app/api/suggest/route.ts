import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) return NextResponse.json({ suggestions: [] });

  try {
    // On utilise l'API publique de suggestion de Google (client=chrome est très rapide)
    const url = `http://google.com/complete/search?client=chrome&hl=fr&q=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Google renvoie : ["query", ["sugg1", "sugg2", ...], ...]
    // On veut juste la liste des suggestions (l'index 1)
    const suggestions = data[1] || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ suggestions: [] });
  }
}