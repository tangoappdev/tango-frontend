import { NextResponse } from 'next/server';
import { getCities } from '@/app/milonga-guide/cities';

export async function GET() {
  try {
    const cities = await getCities();
    return NextResponse.json({ ok: true, cities });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to load cities' },
      { status: 500 }
    );
  }
}

