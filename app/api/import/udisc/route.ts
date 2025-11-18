import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

type Row = Record<string, string>;


// Split a CSV line into fields, handling quoted values and escaped quotes.
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Toggle inQuotes, but handle escaped quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\s+/g, '');
}

function parseCsv(text: string): { headers: string[]; rows: Row[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV appears to have no data rows');
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.trim());

  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

// Safely convert a raw date string to ISO, or null if unparsable.
function toIsoOrNull(raw: string | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    // Can't parse this date format, so just ignore it.
    return null;
  }
  return d.toISOString();
}

// --- Main handler -----------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          error: 'Content-Type must be multipart/form-data',
          details: { contentType },
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const userId = (formData.get('userId') as string | null)?.trim();
    const targetPlayerName = (formData.get('playerName') as string | null)?.trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing CSV file or file is not a File' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId field' },
        { status: 400 }
      );
    }

    // Read raw CSV text
    const csvText = await file.text();

    let parsed;
    try {
      parsed = parseCsv(csvText);
    } catch (parseErr: any) {
      return NextResponse.json(
        {
          error: 'CSV parse error',
          details: String(parseErr?.message ?? parseErr),
        },
        { status: 400 }
      );
    }

    const { headers, rows } = parsed;

    if (!headers || headers.length === 0) {
      return NextResponse.json(
        { error: 'CSV appears to have no headers' },
        { status: 400 }
      );
    }

    // Try to detect relevant columns by looking at normalized headers.
    const playerHeader =
      headers.find((h) => normalizeHeader(h).startsWith('playername')) ??
      headers.find((h) => normalizeHeader(h).startsWith('player')) ??
      'Player Name';

    const courseHeader =
      headers.find((h) => normalizeHeader(h).startsWith('coursename')) ??
      'Course Name';

    const layoutHeader =
      headers.find((h) => normalizeHeader(h).startsWith('layoutname')) ??
      'Layout Name';

    const startHeader =
      headers.find((h) => normalizeHeader(h).startsWith('startdate')) ??
      'Start Date';

    const endHeader =
      headers.find((h) => normalizeHeader(h).startsWith('enddate')) ??
      'End Date';

    const totalHeader =
      headers.find((h) => normalizeHeader(h) === 'total') ?? 'Total';

    // Header might literally be "+/-" or something similar.
    const scoreHeader =
      headers.find((h) => normalizeHeader(h).includes('+/-')) ??
      headers.find((h) => normalizeHeader(h).includes('scorevspar')) ??
      '+/-';

    const ratingHeader =
      headers.find((h) => normalizeHeader(h).startsWith('roundrating')) ??
      'Round Rating';

    // Hole columns: headers starting with "hole" (case-insensitive)
    const holeHeaders = headers.filter((h) =>
      normalizeHeader(h).startsWith('hole')
    );

    if (holeHeaders.length === 0) {
      return NextResponse.json(
        {
          error: 'No hole columns found in CSV',
          details: { headers },
        },
        { status: 400 }
      );
    }

    // Find Par row (PlayerName = "Par")
    const parRow = rows.find(
      (r) => (r[playerHeader] || '').toLowerCase() === 'par'
    );

    // Find target player row
    let playerRow: Row | undefined;
    if (targetPlayerName) {
      playerRow = rows.find(
        (r) =>
          (r[playerHeader] || '').toLowerCase() ===
          targetPlayerName.toLowerCase()
      );
      if (!playerRow) {
        return NextResponse.json(
          {
            error: `No row found for player "${targetPlayerName}"`,
            details: { playerHeader, headers },
          },
          { status: 400 }
        );
      }
    } else {
      // Default: first non-Par row with a non-empty player name
      playerRow = rows.find((r) => {
        const name = r[playerHeader] || '';
        return name.length > 0 && name.toLowerCase() !== 'par';
      });
      if (!playerRow) {
        return NextResponse.json(
          { error: 'No player row found in CSV' },
          { status: 400 }
        );
      }
    }

    const playerName = playerRow[playerHeader] || 'Unknown player';
    const courseName = playerRow[courseHeader] || 'Unknown course';
    const layoutName = playerRow[layoutHeader] || null;

    const startRaw = playerRow[startHeader] || '';
    const endRaw = playerRow[endHeader] || '';

    const startTime = toIsoOrNull(startRaw);
    const endTime = toIsoOrNull(endRaw);

    const totalStrokes = playerRow[totalHeader]
      ? parseInt(playerRow[totalHeader], 10)
      : null;

    const scoreVsPar = playerRow[scoreHeader]
      ? parseInt(playerRow[scoreHeader], 10)
      : null;

    const roundRating = playerRow[ratingHeader]
      ? Number(playerRow[ratingHeader])
      : null;

    const holesCount = holeHeaders.length;

    // --- Insert round into Supabase ----------------------------------------
    let roundInsertResult;
    try {
      roundInsertResult = await supabaseServer
        .from('rounds')
        .insert([
          {
            user_id: userId,
            course_name: courseName,
            layout_name: layoutName,
            start_time: startTime,
            end_time: endTime,
            total_strokes: totalStrokes,
            score_vs_par: scoreVsPar,
            round_rating: roundRating,
            holes_count: holesCount,
            source: 'udisc',
            source_ref: (file as File).name,
          },
        ])
        .select('*')
        .single();
    } catch (supabaseErr: any) {
      return NextResponse.json(
        {
          error: 'Supabase insert error (round)',
          details: String(supabaseErr?.message ?? supabaseErr),
        },
        { status: 500 }
      );
    }

    const { data: round, error: roundError } = roundInsertResult;

    if (roundError || !round) {
      return NextResponse.json(
        {
          error: 'Error creating round from UDisc CSV',
          details: String(roundError?.message ?? roundError),
        },
        { status: 500 }
      );
    }

    // --- Build hole results -------------------------------------------------
    const holeInserts = holeHeaders
      .map((h, index) => {
        const label = h.replace(/hole/i, '').trim() || String(index + 1);
        const parVal =
          parRow && parRow[h] ? parseInt(parRow[h], 10) : null;
        const strokesRaw = playerRow ? playerRow[h] : '';
        if (!strokesRaw) {
          // If no strokes for that hole, skip
          return null;
        }
        const strokesVal = parseInt(strokesRaw, 10);
        if (isNaN(strokesVal)) {
          return null;
        }

        return {
          round_id: round.id,
          play_order: index + 1,
          hole_label: label,
          par: parVal,
          strokes: strokesVal,
          ob: false,
          notes: '',
        };
      })
      .filter(Boolean) as any[];

    if (holeInserts.length > 0) {
      const { error: holesError } = await supabaseServer
        .from('round_hole_results')
        .insert(holeInserts);

      if (holesError) {
        // Non-fatal: we created the round, but hole inserts failed.
        return NextResponse.json(
          {
            error: 'Round created, but error inserting hole results',
            details: String(holesError?.message ?? holesError),
            round,
            attemptedHoles: holeInserts.length,
          },
          { status: 500 }
        );
      }
    }

    // Success
    return NextResponse.json({
      ok: true,
      round,
      holesInserted: holeInserts.length,
      playerName,
      debug: {
        playerHeader,
        courseHeader,
        layoutHeader,
        startHeader,
        endHeader,
        totalHeader,
        scoreHeader,
        ratingHeader,
        holeHeaders,
      },
    });
  } catch (err: any) {
    console.error('Unhandled error in POST /api/import/udisc', err);
    return NextResponse.json(
      {
        error: 'Unexpected server error while importing UDisc CSV',
        details: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
