import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Disc = {
  id: string;
  brand: string;
  mold: string;
  plastic: string | null;
  type: string | null;
  speed: number;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  stability: string | null;
  created_at: string;
};

type UserDiscRow = {
  id: string;
  user_id: string;
  disc_id: string;
  nickname: string | null;
  wear_level: string | null;
  in_bag: boolean;
  created_at: string;
  weight_grams: number | null;
  disc: Disc;
};

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId query parameter' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from('user_discs')
    .select(
      'id, user_id, disc_id, nickname, wear_level, in_bag, created_at, weight_grams, disc:discs(*)'
    )
    .eq('user_id', userId)
    .eq('in_bag', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching bag', error);
    return NextResponse.json(
      { error: 'Error fetching bag' },
      { status: 500 }
    );
  }

  // Cast through unknown to satisfy TS (disc comes back as any[])
  const bag = (data ?? []) as unknown as UserDiscRow[];

  return NextResponse.json({ bag });
}

// POST /api/bag
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const {
    userId,
    discId,
    nickname,
    wearLevel,
    weight_grams,
  } = body as {
    userId?: string;
    discId?: string;
    nickname?: string | null;
    wearLevel?: string | null;
    weight_grams?: number | null;
  };

  if (!userId || !discId) {
    return NextResponse.json(
      { error: 'Missing userId or discId' },
      { status: 400 }
    );
  }

  // Duplicate check
  const { data: existing, error: existingError } = await supabaseServer
    .from('user_discs')
    .select('id')
    .eq('user_id', userId)
    .eq('disc_id', discId)
    .eq('in_bag', true)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing user_disc', existingError);
  }

  if (existing) {
    return NextResponse.json(
      { error: 'That disc is already in your bag.' },
      { status: 400 }
    );
  }

  const cleanWeight =
    typeof weight_grams === 'number' && !Number.isNaN(weight_grams)
      ? weight_grams
      : null;

  const { data, error } = await supabaseServer
    .from('user_discs')
    .insert({
      user_id: userId,
      disc_id: discId,
      nickname: nickname || null,
      wear_level: wearLevel || null,
      in_bag: true,
      weight_grams: cleanWeight,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error adding disc to bag', error);
    return NextResponse.json(
      { error: 'Error adding disc to bag' },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data?.id });
}

// DELETE /api/bag
// body: { userDiscId, userId }
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { userDiscId, userId } = body as {
    userDiscId?: string;
    userId?: string;
  };

  if (!userDiscId || !userId) {
    return NextResponse.json(
      { error: 'Missing userDiscId or userId' },
      { status: 400 }
    );
  }

  const { error } = await supabaseServer
    .from('user_discs')
    .delete()
    .eq('id', userDiscId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing disc from bag', error);
    return NextResponse.json(
      { error: 'Error removing disc from bag' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
