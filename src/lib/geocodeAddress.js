/**
 * Shared geocoding utility.
 * Calls the Google Maps Geocode API and returns coordinates + locality data.
 */

export function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractLocalityFromComponents(components) {
  if (!Array.isArray(components)) return null;
  const find = (type) => components.find((c) => Array.isArray(c.types) && c.types.includes(type));
  const locality = find('locality');
  const country = find('country');
  if (!locality || !country) return null;
  return {
    cityName: locality.long_name,
    citySlug: slugify(locality.long_name),
    country: country.long_name,
    countryCode: country.short_name,
    countrySlug: slugify(country.long_name),
  };
}

async function fetchTimeZone(lat, lng, apiKey) {
  const ts = Math.floor(Date.now() / 1000);
  const url =
    `https://maps.googleapis.com/maps/api/timezone/json` +
    `?location=${lat},${lng}&timestamp=${ts}&key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.timeZoneId || null;
  } catch {
    return null;
  }
}

/**
 * Geocodes an address string.
 * @returns {{ lat, lng, cityName, citySlug, country, countryCode, timeZone } | null}
 */
export async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address) return null;

  const geoUrl =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) return null;
    const geoJson = await geoRes.json();
    if (geoJson?.status !== 'OK') return null;

    const result = geoJson.results?.[0];
    if (!result) return null;

    const { lat, lng } = result.geometry.location;
    const localityData = extractLocalityFromComponents(result.address_components);
    const timeZone = localityData ? await fetchTimeZone(lat, lng, apiKey) : null;

    return { lat, lng, ...localityData, timeZone };
  } catch {
    return null;
  }
}
