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

const DISC_API_BASE_URL = getEnv('DISC_API_BASE_URL');
const DISC_API_KEY = getEnv('DISC_API_KEY');

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get('q') || '';
  const q = rawQ.trim();

  // Require at least 2–3 chars so we don't spam the external API
  if (!q || q.length < 2) {
    return NextResponse.json({ discs: [] });
  }

  try {
    // TODO: adjust URL and headers based on the provider you pick.
    const url = `${DISC_API_BASE_URL}?q=${encodeURIComponent(q)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        // Adjust these headers for your provider
        'Authorization': `Bearer ${DISC_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('External disc API error', res.status, text.slice(0, 300));
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

    // This mapping is deliberately defensive because different providers
    // might return `raw.discs`, `raw.results`, or just a bare array.
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
