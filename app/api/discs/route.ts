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

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

  // Base query
  let query = supabaseServer
    .from('discs')
    .select('*')
    .order('brand', { ascending: true })
    .order('mold', { ascending: true });

  // Optional simple search 
  if (q) {
    query = query.ilike('brand', `%${q}%`).ilike('mold', `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching discs', error);
    return NextResponse.json(
      { error: 'Error fetching discs' },
      { status: 500 }
    );
  }

  const discs = (data ?? []) as Disc[];

  return NextResponse.json({ discs });
}
