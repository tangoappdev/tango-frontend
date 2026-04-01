import { NextResponse } from 'next/server';
import { getEventsByCity } from '@/app/milonga-guide/data';
import { getCities } from '@/app/milonga-guide/cities';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'new-york';
  try {
    const cities = await getCities();
    const citySlug = cities.some((item) => item.slug === city) ? city : 'new-york';
    const data = await getEventsByCity(citySlug);
    return NextResponse.json({ ok: true, citySlug, ...data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to load events' },
      { status: 500 }
    );
  }
}
