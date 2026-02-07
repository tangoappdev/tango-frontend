import { getFirestore } from '@/lib/firebaseAdmin.server';
import { slugify } from './utils';

export const loadFestivals = async () => {
  const db = getFirestore();
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = await db
    .collection('external_festivals')
    .where('endDate', '>=', today)
    .get();

  const baseFestivals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const overrideIds = baseFestivals.map((festival) => festival.id);
  const overridesMap = new Map();
  if (overrideIds.length) {
    const overridesCollection = db.collection('external_festival_overrides');
    const refs = overrideIds.map((id) => overridesCollection.doc(id));
    const overrideDocs = await db.getAll(...refs);
    overrideDocs.forEach((doc) => {
      if (doc.exists) overridesMap.set(doc.id, doc.data());
    });
  }

  return baseFestivals
    .map((festival) => {
      const override = overridesMap.get(festival.id);
      return {
        ...festival,
        ...(override || {}),
        id: festival.id,
      };
    })
    .filter((festival) => !festival.deleted && festival.status !== 'paused')
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
};

export const buildCountryIndex = (festivals) => {
  const countryMap = new Map();
  festivals.forEach((festival) => {
    if (!festival.country) return;
    const countrySlug = slugify(festival.country);
    if (!countrySlug) return;
    if (!countryMap.has(countrySlug)) {
      countryMap.set(countrySlug, {
        slug: countrySlug,
        name: festival.country,
        cities: new Map(),
      });
    }
    const country = countryMap.get(countrySlug);
    if (festival.city) {
      const citySlug = slugify(festival.city);
      if (citySlug && !country.cities.has(citySlug)) {
        country.cities.set(citySlug, {
          slug: citySlug,
          name: festival.city,
        });
      }
    }
  });

  return Array.from(countryMap.values())
    .map((country) => ({
      slug: country.slug,
      name: country.name,
      cities: Array.from(country.cities.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const filterFestivals = (festivals, countrySlug, citySlug) => {
  let filtered = festivals;
  if (countrySlug) {
    filtered = filtered.filter(
      (festival) => slugify(festival.country) === countrySlug
    );
  }
  if (citySlug) {
    filtered = filtered.filter((festival) => slugify(festival.city) === citySlug);
  }
  return filtered;
};
