import { NextRequest, NextResponse } from 'next/server';

//return to frontend
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

const BASE_URL = getEnv('RAPIDAPI_DISCS_BASE_URL');
const API_KEY = getEnv('RAPIDAPI_DISCS_API_KEY');
const API_HOST = getEnv('RAPIDAPI_DISCS_HOST');

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get('q') ?? '';
  const q = rawQ.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ discs: [] });
  }

  try {
    const url = `${BASE_URL}/discs?limit=20&offset=0&search=${encodeURIComponent(
      q
    )}`;

    const apiRes = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST,
      },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => '');
      console.error('RapidAPI discs error', apiRes.status, text);
      return NextResponse.json(
        {
          error: 'Error searching external disc database',
          status: apiRes.status,
          details: text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const json = await apiRes.json();

    const rawList: any[] = Array.isArray(json)
      ? json
      : Array.isArray(json.discs)
      ? json.discs
      : [];

    const discs: ExternalDisc[] = rawList.map((d: any): ExternalDisc => {
      const brand = d.brand || d.manufacturer || '';
      const mold = d.mold || d.name || '';
      const plastic = d.plastic || null;
      const type = d.type || d.disc_type || null;

      return {
        externalId: String(d.id ?? `${brand}-${mold}`),
        brand,
        mold,
        plastic,
        type,
        speed:
          typeof d.speed === 'number'
            ? d.speed
            : d.speed
            ? Number(d.speed) || null
            : null,
        glide:
          typeof d.glide === 'number'
            ? d.glide
            : d.glide
            ? Number(d.glide) || null
            : null,
        turn:
          typeof d.turn === 'number'
            ? d.turn
            : d.turn
            ? Number(d.turn) || null
            : null,
        fade:
          typeof d.fade === 'number'
            ? d.fade
            : d.fade
            ? Number(d.fade) || null
            : null,
        stability: (d.stability as string) ?? null,
      };
    });

    return NextResponse.json({ discs });
  } catch (err) {
    console.error('Unhandled error in GET /api/discs/disc-search', err);
    return NextResponse.json(
      {
        error: 'Unexpected server error while searching discs',
        details: String((err as any)?.message ?? err),
      },
      { status: 500 }
    );
  }
}
