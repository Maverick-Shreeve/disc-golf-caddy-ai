import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

// returns all rounds for a given user, newest first.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId query param' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseServer
      .from('rounds')
      .select('*')
      .eq('user_id', userId)
      //order by start time
      .order('start_time', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rounds', error);
      return NextResponse.json(
        { error: 'Error fetching rounds' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rounds: data ?? [] });
  } catch (err) {
    console.error('Unhandled error in GET /api/rounds', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

// Creates a simple manual round 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, courseName, layoutName } = body;

    if (!userId || !courseName) {
      return NextResponse.json(
        { error: 'userId and courseName are required' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseServer
      .from('rounds')
      .insert([
        {
          user_id: userId,
          course_name: courseName.trim(),
          layout_name: layoutName ?? null,
          start_time: nowIso,
          source: 'manual',
        },
      ])
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating round', error);
      return NextResponse.json(
        { error: 'Error creating round' },
        { status: 500 }
      );
    }

    return NextResponse.json({ round: data }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/rounds', err);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
