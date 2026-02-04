import { NextResponse } from 'next/server';
import { buildCountryIndex, loadFestivals } from '@/app/tango-festivals-marathons/data';

export async function GET() {
  try {
    const festivals = await loadFestivals();
    const countries = buildCountryIndex(festivals);
    return NextResponse.json({ ok: true, festivals, countries });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to load festivals' },
      { status: 500 }
    );
  }
}
