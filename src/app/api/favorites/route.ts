import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const sort = searchParams.get('sort');
    const userLocation = searchParams.get('location') || "Canada";

    const minPriceRaw = searchParams.get('min_price');
    const maxPriceRaw = searchParams.get('max_price');
    const condition = searchParams.get('condition');
    const tbsParam = searchParams.get('tbs');

    const minPrice = minPriceRaw ? parseFloat(minPriceRaw) : 0;
    const maxPrice = maxPriceRaw ? parseFloat(maxPriceRaw) : Infinity;

    const apiKey = process.env.SERPAPI_KEY;

    // Récupère les marchands depuis NestJS au lieu de Supabase
    const merchantsRes = await fetch(`${API_URL}/merchants`);
    const merchants = await merchantsRes.json();

    const params: any = {
      api_key: apiKey || '',
      engine: "google_shopping",
      q: query,
      google_domain: "google.ca",
      gl: "ca",
      hl: "fr",
      location: userLocation,
      num: "50",
    };

    let tbsArray = ["vw:g", "mr:1"];

    if (tbsParam) {
      params.tbs = tbsParam;
    } else {
      if (minPriceRaw || maxPriceRaw) {
        tbsArray.push('price:1');
        if (minPriceRaw) tbsArray.push(`ppr_min:${minPriceRaw}`);
        if (maxPriceRaw) tbsArray.push(`ppr_max:${maxPriceRaw}`);
      }
      if (condition === 'new') tbsArray.push('new:1');
      if (condition === 'used') tbsArray.push('used:1');
      params.tbs = tbsArray.join(',');
    }

    if (sort === 'price_low') params.sort = 'price_low';
    else if (sort === 'price_high') params.sort = 'price_high';
    else if (sort === 'review_score') params.sort = 'review_score';

    const googleRes = await fetch(
      `https://serpapi.com/search.json?${new URLSearchParams(params).toString()}`
    );
    const data = await googleRes.json();

    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });

    const parsePrice = (priceInput: any) => {
      if (!priceInput) return 0;
      const clean = priceInput.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
      const result = parseFloat(clean);
      return isNaN(result) ? 0 : result;
    };

    let products = data.shopping_results?.map((item: any) => {
      const priceValue = parsePrice(item.price);

      let shippingCost = 0;
      let shippingLabel = "";
      const deliveryText = item.delivery || "";

      if (deliveryText) {
        const lowerText = deliveryText.toLowerCase();
        if (lowerText.includes('gratuit') || lowerText.includes('free')) {
          shippingCost = 0;
          shippingLabel = "Livraison Gratuite";
        } else {
          const extractedCost = parsePrice(deliveryText);
          if (extractedCost > 0) {
            shippingCost = extractedCost;
            shippingLabel = `+ ${extractedCost.toFixed(2)}$ Livraison`;
          }
        }
      }

      let finalLink = item.link;
      let merchantId = item.source || "Autre";

      // Matching avec les marchands NestJS (camelCase)
      const matchedMerchant = merchants.find((m: any) =>
        item.source && item.source.toLowerCase().includes(m.name.toLowerCase())
      );

      if (matchedMerchant) {
        merchantId = matchedMerchant.id;
        if (matchedMerchant.searchUrl) {
          let cleanTitle = item.title.replace(/[\(\)\[\]\/\\,\-]/g, ' ');
          cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
          const words = cleanTitle.split(' ');
          if (words.length > 6) cleanTitle = words.slice(0, 6).join(' ');
          finalLink = `${matchedMerchant.searchUrl}${encodeURIComponent(cleanTitle)}${matchedMerchant.affiliateSuffix || ''}`;
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
        price_raw: priceValue,
        source: item.source,
        link: finalLink,
        merchant_id: merchantId,
        image: item.thumbnail,
        rating: item.rating,
        reviews: item.reviews,
      };
    }) || [];

    if (minPriceRaw || maxPriceRaw) {
      products = products.filter((p: any) => {
        if (p.price_raw < minPrice) return false;
        if (p.price_raw > maxPrice) return false;
        return true;
      });
    }

    if (sort === 'price_low') {
      products.sort((a: any, b: any) => a.total_price_value - b.total_price_value);
    } else if (sort === 'price_high') {
      products.sort((a: any, b: any) => b.total_price_value - a.total_price_value);
    } else if (sort === 'review_score') {
      products.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    }

    return NextResponse.json({ products, filters: data.filters || [] });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}