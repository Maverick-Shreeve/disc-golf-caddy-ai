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
  const rawQ = req.nextUrl.searchParams.get('q') || '';
  const q = rawQ.trim();

  let query = supabaseServer
    .from('discs')
    .select('*')
    .order('brand', { ascending: true })
    .order('mold', { ascending: true });

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `brand.ilike.${pattern},mold.ilike.${pattern}`
    );
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
