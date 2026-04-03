import { NextResponse } from 'next/server';
import { recordClick } from '@/src/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { merchant_id, product_title } = body;

    // Le token JWT vient du header Authorization envoyé par le client
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!merchant_id) {
      return NextResponse.json({ error: 'merchant_id requis' }, { status: 400 });
    }

    const result = await recordClick(token, merchant_id, product_title);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    );
  }
}