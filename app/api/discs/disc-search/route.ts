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

// DiscIt public base URL
const DISCIT_BASE_URL =
  process.env.DISCIT_BASE_URL || 'https://discit-api.fly.dev';

function slugifyForDiscIt(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') 
    .replace(/\s+/g, '-'); 
}

function normalizeType(category: string | null | undefined): string | null {
  if (!category) return null;
  const c = category.toLowerCase();

  if (c.includes('putter')) return 'putter';
  if (c.includes('mid')) return 'midrange';
  if (c.includes('fairway')) return 'fairway';
  if (c.includes('driver') || c.includes('distance')) return 'distance';

  return category;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get('q') ?? '';
  const q = rawQ.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ discs: [] });
  }

  const slug = slugifyForDiscIt(q);

  try {
    // DiscIt: GET /disc?name=<slug>
    const url = `${DISCIT_BASE_URL}/disc?name=${encodeURIComponent(slug)}`;
    const apiRes = await fetch(url, { method: 'GET' });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => '');
      console.error('DiscIt API error', apiRes.status, text);
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
      : Array.isArray((json as any).discs)
      ? (json as any).discs
      : [];

    const discs: ExternalDisc[] = rawList
      .map((d: any): ExternalDisc | null => {
        const brand = d.brand ?? '';
        const mold = d.name ?? '';
        if (!brand || !mold) return null;

        const category = d.category ?? null;

        return {
          externalId: String(d.id ?? `${brand}-${mold}`),
          brand,
          mold,
          plastic: null, // DiscIt doesn't expose plastic
          type: normalizeType(category),
          speed: toNumberOrNull(d.speed),
          glide: toNumberOrNull(d.glide),
          turn: toNumberOrNull(d.turn),
          fade: toNumberOrNull(d.fade),
          stability: typeof d.stability === 'string'
            ? d.stability.toLowerCase()
            : null,
        };
      })
      .filter(Boolean) as ExternalDisc[];

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
