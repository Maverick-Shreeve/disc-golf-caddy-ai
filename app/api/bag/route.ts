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
      'id, user_id, disc_id, nickname, wear_level, in_bag, created_at, disc:discs(*)'
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

  const rawRows = (data ?? []) as any[];

  // Normalize disc field (object vs array) and make it match UserDiscRow
  const bag: UserDiscRow[] = rawRows.map((row) => {
    const rawDisc = row.disc;

    const disc: Disc | null = Array.isArray(rawDisc)
      ? ((rawDisc[0] as Disc | undefined) ?? null)
      : ((rawDisc as Disc | null) ?? null);

    if (!disc) {
      throw new Error('Missing joined disc row for user_discs entry');
    }

    return {
      id: row.id as string,
      user_id: row.user_id as string,
      disc_id: row.disc_id as string,
      nickname: (row.nickname ?? null) as string | null,
      wear_level: (row.wear_level ?? null) as string | null,
      in_bag: Boolean(row.in_bag),
      created_at: row.created_at as string,
      disc,
    };
  });

  return NextResponse.json({ bag });
}

// POST /api/bag
// body: { userId, discId, nickname?, wearLevel? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { userId, discId, nickname, wearLevel } = body as {
    userId?: string;
    discId?: string;
    nickname?: string;
    wearLevel?: string;
  };

  if (!userId || !discId) {
    return NextResponse.json(
      { error: 'Missing userId or discId' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from('user_discs')
    .insert({
      user_id: userId,
      disc_id: discId,
      nickname: nickname || null,
      wear_level: wearLevel || null,
      in_bag: true,
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
