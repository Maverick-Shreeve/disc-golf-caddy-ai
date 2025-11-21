import { NextRequest, NextResponse } from 'next/server';

type ExternalDisc = {
  externalId: string;
  brand: string;
  mold: string;
  plastic: string | null;
  type: string | null;
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  stability: string | null;
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[external discs] Missing env var: ${name}`);
  }
  return value;
}

const RAPIDAPI_BASE_URL = getEnv('RAPIDAPI_DISCS_BASE_URL');
const RAPIDAPI_KEY = getEnv('RAPIDAPI_DISCS_KEY');
const RAPIDAPI_HOST = getEnv('RAPIDAPI_DISCS_HOST');

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get('q') || '';
  const q = rawQ.trim();

  // Avoid hammering the API with one-letter searches
  if (!q || q.length < 2) {
    return NextResponse.json({ discs: [] });
  }

  try {
    // Build URL for RapidAPI call
    // Their sample: /discs?limit=50&offset=50
    // Here we start at offset 0 and add a search param.
    // You may need to tweak the param name (e.g. 'name', 'search') to match their docs.
    const url = new URL('/discs', RAPIDAPI_BASE_URL);
    url.searchParams.set('limit', '50');
    url.searchParams.set('offset', '0');

    // If the API supports searching, adjust this key to whatever they expect:
    // e.g. url.searchParams.set('search', q) or url.searchParams.set('name', q)
    url.searchParams.set('search', q);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('RapidAPI disc error', res.status, text.slice(0, 300));
      return NextResponse.json(
        {
          error: 'Error calling external disc API',
          status: res.status,
          details: text.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const raw = (await res.json()) as any;

    const items: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.discs)
      ? raw.discs
      : Array.isArray(raw.results)
      ? raw.results
      : [];

    const discs: ExternalDisc[] = items.map((item: any) => ({
      externalId: String(
        item.id ??
          item.pdga_id ??
          item.slug ??
          item.uuid ??
          item.code ??
          ''
      ),
      brand:
        item.brand ??
        item.manufacturer ??
        item.maker ??
        'Unknown',
      mold:
        item.mold ??
        item.name ??
        item.model ??
        'Unknown',
      plastic:
        item.plastic ??
        item.plastic_type ??
        null,
      type:
        item.type ??
        item.disc_type ??
        item.category ??
        null,
      speed:
        typeof item.speed === 'number'
          ? item.speed
          : Number(item.speed) || null,
      glide:
        typeof item.glide === 'number'
          ? item.glide
          : Number(item.glide) || null,
      turn:
        typeof item.turn === 'number'
          ? item.turn
          : Number(item.turn) || null,
      fade:
        typeof item.fade === 'number'
          ? item.fade
          : Number(item.fade) || null,
      stability:
        item.stability ??
        item.stability_class ??
        null,
    }));

    return NextResponse.json({ discs });
  } catch (err) {
    console.error('Unhandled error in /api/discs/external-search', err);
    return NextResponse.json(
      {
        error: 'Unexpected server error while searching external disc API',
        details: String((err as any)?.message ?? err),
      },
      { status: 500 }
    );
  }
}
