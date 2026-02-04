import { NextResponse } from 'next/server';
import { getEventsByCity } from '@/app/milonga-guide/data';

const VALID_CITIES = new Set([
  'new-york',
  'buenos-aires',
  'san-francisco',
  'berlin',
  'sao-paulo',
  'athens',
  'turkiye',
  'england',
  'miami',
  'paris',
  'rome',
  'austin',
  'barcelona',
]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'new-york';
  const citySlug = VALID_CITIES.has(city) ? city : 'new-york';
  try {
    const data = await getEventsByCity(citySlug);
    return NextResponse.json({ ok: true, citySlug, ...data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to load events' },
      { status: 500 }
    );
  }
}
