import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const search = (req.nextUrl.searchParams.get('q') || '').trim();
  const recent = req.nextUrl.searchParams.get('recent');

  try {
    let query = supabaseServer
      .from('discs')
      .select(
        'id, brand, mold, plastic, type, speed, glide, turn, fade, stability, created_at'
      );

    // recent discs: last 5 by created_at (global, not per user)
    if (recent === '1') {
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent discs', error);
        return NextResponse.json(
          { error: 'Error fetching recent discs' },
          { status: 500 }
        );
      }

      return NextResponse.json({ discs: data ?? [] });
    }

    if (search) {
      query = query
        .or(
          `brand.ilike.%${search}%,mold.ilike.%${search}%`
        )
        .order('brand', { ascending: true })
        .order('mold', { ascending: true })
        .limit(50);

      const { data, error } = await query;
      if (error) {
        console.error('Error searching discs', error);
        return NextResponse.json(
          { error: 'Error searching discs' },
          { status: 500 }
        );
      }

      return NextResponse.json({ discs: data ?? [] });
    }

    return NextResponse.json({ discs: [] });
  } catch (err) {
    console.error('Unhandled error in GET /api/discs', err);
    return NextResponse.json(
      {
        error: 'Unexpected server error while fetching discs',
        details: String((err as any)?.message ?? err),
      },
      { status: 500 }
    );
  }
}
