import { getFirestore } from '@/lib/firebaseAdmin.server';
import { slugify } from '@/lib/geocodeAddress';

export const BASE_CITIES = [
  { slug: 'new-york', label: 'New York', country: 'United States', countryCode: 'US', countrySlug: 'united-states', lat: 40.7128, lng: -74.006, timeZone: 'America/New_York' },
  { slug: 'buenos-aires', label: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', countrySlug: 'argentina', lat: -34.6037, lng: -58.3816, timeZone: 'America/Argentina/Buenos_Aires' },
  { slug: 'san-francisco', label: 'San Francisco', country: 'United States', countryCode: 'US', countrySlug: 'united-states', lat: 37.7749, lng: -122.4194, timeZone: 'America/Los_Angeles' },
  { slug: 'berlin', label: 'Berlin', country: 'Germany', countryCode: 'DE', countrySlug: 'germany', lat: 52.52, lng: 13.405, timeZone: 'Europe/Berlin' },
  { slug: 'sao-paulo', label: 'São Paulo', country: 'Brazil', countryCode: 'BR', countrySlug: 'brazil', lat: -23.5558, lng: -46.6396, timeZone: 'America/Sao_Paulo' },
  { slug: 'athens', label: 'Athens', country: 'Greece', countryCode: 'GR', countrySlug: 'greece', lat: 37.9838, lng: 23.7275, timeZone: 'Europe/Athens' },
  { slug: 'turkiye', label: 'Istanbul', country: 'Turkey', countryCode: 'TR', countrySlug: 'turkey', lat: 41.0082, lng: 28.9784, timeZone: 'Europe/Istanbul' },
  { slug: 'england', label: 'London', country: 'United Kingdom', countryCode: 'GB', countrySlug: 'united-kingdom', lat: 51.5074, lng: -0.1278, timeZone: 'Europe/London' },
  { slug: 'miami', label: 'Miami', country: 'United States', countryCode: 'US', countrySlug: 'united-states', lat: 25.7617, lng: -80.1918, timeZone: 'America/New_York' },
  { slug: 'paris', label: 'Paris', country: 'France', countryCode: 'FR', countrySlug: 'france', lat: 48.8566, lng: 2.3522, timeZone: 'Europe/Paris' },
  { slug: 'rome', label: 'Rome', country: 'Italy', countryCode: 'IT', countrySlug: 'italy', lat: 41.9028, lng: 12.4964, timeZone: 'Europe/Rome' },
  { slug: 'austin', label: 'Austin', country: 'United States', countryCode: 'US', countrySlug: 'united-states', lat: 30.2672, lng: -97.7431, timeZone: 'America/Chicago' },
  { slug: 'barcelona', label: 'Barcelona', country: 'Spain', countryCode: 'ES', countrySlug: 'spain', lat: 41.3851, lng: 2.1734, timeZone: 'Europe/Madrid' },
];

const normalizeCityDoc = (doc) => {
  if (!doc?.slug || !doc?.label) return null;
  return {
    slug: doc.slug,
    label: doc.label,
    country: doc.country || null,
    countryCode: doc.countryCode || null,
    countrySlug: doc.countrySlug || (doc.country ? slugify(doc.country) : null),
    lat: doc.lat ?? null,
    lng: doc.lng ?? null,
    timeZone: doc.timeZone || null,
  };
};

const mergeCities = (remoteCities) => {
  const merged = new Map();
  BASE_CITIES.forEach((city) => merged.set(city.slug, { ...city }));
  remoteCities.forEach((city) => {
    if (!city) return;
    const base = merged.get(city.slug) || {};
    merged.set(city.slug, {
      ...base,
      ...city,
      country: city.country || base.country || null,
      countryCode: city.countryCode || base.countryCode || null,
      countrySlug: city.countrySlug || base.countrySlug || null,
      lat: city.lat ?? base.lat ?? null,
      lng: city.lng ?? base.lng ?? null,
      timeZone: city.timeZone || base.timeZone || null,
    });
  });
  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
};

export async function getCities() {
  const db = getFirestore();
  const snapshot = await db.collection('cities').get();
  const remote = snapshot.docs
    .map((doc) => normalizeCityDoc({ slug: doc.id, ...doc.data() }))
    .filter(Boolean);
  if (!remote.length) return BASE_CITIES;
  return mergeCities(remote);
}

export async function getCityBySlug(slug) {
  if (!slug) return null;
  const db = getFirestore();
  const doc = await db.collection('cities').doc(slug).get();
  const remote = doc.exists ? normalizeCityDoc({ slug: doc.id, ...doc.data() }) : null;
  if (!remote) {
    return BASE_CITIES.find((city) => city.slug === slug) || null;
  }
  const base = BASE_CITIES.find((city) => city.slug === slug) || {};
  return {
    ...base,
    ...remote,
    country: remote.country || base.country || null,
    countryCode: remote.countryCode || base.countryCode || null,
    countrySlug: remote.countrySlug || base.countrySlug || null,
    lat: remote.lat ?? base.lat ?? null,
    lng: remote.lng ?? base.lng ?? null,
    timeZone: remote.timeZone || base.timeZone || null,
  };
}

export async function getCountries() {
  const cities = await getCities();
  const countryMap = new Map();
  cities.forEach((city) => {
    const cs = city.countrySlug;
    if (!cs || !city.country) return;
    if (!countryMap.has(cs)) {
      countryMap.set(cs, { slug: cs, label: city.country, countryCode: city.countryCode || null });
    }
  });
  return Array.from(countryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function getCountryBySlug(countrySlug) {
  if (!countrySlug) return null;
  const countries = await getCountries();
  return countries.find((c) => c.slug === countrySlug) || null;
}
