// app/api/bag/add-from-external/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

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

function toIntOrNull(v: number | null): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.round(n); // safe for integer columns
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { userId, disc, nickname, wearLevel } = body as {
    userId?: string;
    disc?: ExternalDisc;
    nickname?: string | null;
    wearLevel?: string | null;
  };

  if (!userId || !disc) {
    return NextResponse.json(
      { error: 'Missing userId or disc in body' },
      { status: 400 }
    );
  }

  const {
    externalId, // currently unused, but we may add a column later
    brand,
    mold,
    plastic,
    type,
    speed,
    glide,
    turn,
    fade,
    stability,
  } = disc;

  if (!brand || !mold) {
    return NextResponse.json(
      { error: 'Disc must include brand and mold' },
      { status: 400 }
    );
  }

  try {
    // 1) Try to find an existing disc with same brand + mold
    const { data: existing, error: existingError } = await supabaseServer
      .from('discs')
      .select(
        'id, brand, mold, plastic, type, speed, glide, turn, fade, stability'
      )
      .eq('brand', brand)
      .eq('mold', mold)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking discs table', existingError);
    }

    let discId: string | null = existing?.id ?? null;

    // 2) If not found, insert new disc
    if (!discId) {
      const insertPayload: any = {
        brand,
        mold,
        plastic,
        type,
        // If your columns are INTEGER in Postgres/Supabase, this keeps them valid:
        speed: toIntOrNull(speed),
        glide: toIntOrNull(glide),
        turn: toIntOrNull(turn),
        fade: toIntOrNull(fade),
        stability,
      };

      const { data: inserted, error: insertError } = await supabaseServer
        .from('discs')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        console.error(
          'Error inserting new disc from external',
          insertError
        );
        return NextResponse.json(
          {
            error: 'Error saving disc from external source',
            details: insertError.message ?? String(insertError),
          },
          { status: 500 }
        );
      }

      discId = inserted.id;
    }

    if (!discId) {
      return NextResponse.json(
        { error: 'Unable to resolve disc id' },
        { status: 500 }
      );
    }

    // 3) Insert into user_discs
    const { data: userDiscRow, error: userDiscError } = await supabaseServer
      .from('user_discs')
      .insert({
        user_id: userId,
        disc_id: discId,
        nickname: nickname ?? null,
        wear_level: wearLevel ?? 'new',
        in_bag: true,
      })
      .select('id')
      .single();

    if (userDiscError) {
      console.error('Error inserting user_disc', userDiscError);
      return NextResponse.json(
        { error: 'Error adding disc to bag' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userDiscId: userDiscRow.id,
      discId,
    });
  } catch (err) {
    console.error('Unhandled error in POST /api/bag/add-from-search', err);
    return NextResponse.json(
      {
        error: 'Unexpected server error while adding external disc to bag',
        details: String((err as any)?.message ?? err),
      },
      { status: 500 }
    );
  }
}
