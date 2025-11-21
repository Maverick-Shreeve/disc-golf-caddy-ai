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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { userId, disc, nickname, wearLevel, weight_grams } = body as {
    userId?: string;
    disc?: ExternalDisc;
    nickname?: string | null;
    wearLevel?: string | null;
    weight_grams?: number | null;
  };

  if (!userId || !disc) {
    return NextResponse.json(
      { error: 'Missing userId or disc in body' },
      { status: 400 }
    );
  }

  const {
    externalId,
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
    const { data: existing, error: existingError } = await supabaseServer
      .from('discs')
      .select(
        'id, brand, mold, plastic, type, speed, glide, turn, fade, stability, external_id'
      )
      .eq('brand', brand)
      .eq('mold', mold)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking discs table', existingError);
    }

    let discId: string | null = existing?.id ?? null;

    // 2) If not found, insert new disc in discs
    if (!discId) {
      const { data: inserted, error: insertError } = await supabaseServer
        .from('discs')
        .insert({
          brand,
          mold,
          plastic,
          type,
          speed,
          glide,
          turn,
          fade,
          stability,
          external_id: externalId ?? null,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting new disc from external', insertError);
        return NextResponse.json(
          { error: 'Error saving disc from external source' },
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

    // duplicate check 
    const { data: existingUserDisc, error: existingUserDiscError } =
      await supabaseServer
        .from('user_discs')
        .select('id')
        .eq('user_id', userId)
        .eq('disc_id', discId)
        .eq('in_bag', true)
        .maybeSingle();

    if (
      existingUserDiscError &&
      existingUserDiscError.code !== 'PGRST116'
    ) {
      console.error(
        'Error checking user_discs for duplicate',
        existingUserDiscError
      );
    }

    if (existingUserDisc) {
      return NextResponse.json(
        { error: 'That disc is already in your bag.' },
        { status: 400 }
      );
    }

    const cleanWeight =
      typeof weight_grams === 'number' && !Number.isNaN(weight_grams)
        ? weight_grams
        : null;

    // 4) Insert into user_discs
    const { data: userDiscRow, error: userDiscError } = await supabaseServer
      .from('user_discs')
      .insert({
        user_id: userId,
        disc_id: discId,
        nickname: nickname ?? null,
        wear_level: wearLevel ?? null,
        in_bag: true,
        weight_grams: cleanWeight,
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
