import { geocodeAddress } from './geocodeAddress';

const normalizeKey = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

const buildEventKey = ({ title, venue, address }) =>
  [normalizeKey(title), normalizeKey(venue), normalizeKey(address)]
    .filter(Boolean)
    .join('|');

const buildStableKey = (event) => {
  if (event?.stableKey) return event.stableKey;
  if (event?.sourceEventId) return `${event.source}:${event.sourceEventId}`;
  const eventKey = event?.eventKey || buildEventKey(event);
  return `${event.source}:key:${eventKey}`;
};

/**
 * Upserts a city document into the `cities` Firestore collection.
 * Only fills in missing fields — never overwrites manually set data.
 */
async function upsertCity(db, { slug, label, country, countryCode, countrySlug, lat, lng, timeZone }) {
  if (!slug || !label) return;
  const ref = db.collection('cities').doc(slug);
  const doc = await ref.get();
  if (doc.exists) {
    const data = doc.data() || {};
    const updates = {};
    if (!data.label) updates.label = label;
    if (!data.country && country) updates.country = country;
    if (!data.countryCode && countryCode) updates.countryCode = countryCode;
    if (!data.countrySlug && countrySlug) updates.countrySlug = countrySlug;
    if (data.lat == null && lat != null) updates.lat = lat;
    if (data.lng == null && lng != null) updates.lng = lng;
    if (!data.timeZone && timeZone) updates.timeZone = timeZone;
    if (Object.keys(updates).length) await ref.update(updates);
  } else {
    await ref.set({
      slug,
      label,
      country: country || null,
      countryCode: countryCode || null,
      countrySlug: countrySlug || null,
      lat: lat ?? null,
      lng: lng ?? null,
      timeZone: timeZone || null,
    });
  }
}

/**
 * Geocodes events from a given source after a sync run.
 *
 * Strategy:
 * - Overrides act as a geocode cache (keyed by stableKey) so API calls only
 *   happen for venues seen for the first time.
 * - On every sync the event docs are recreated fresh (no lat/lng). This function
 *   re-applies cached coords + real citySlug directly onto the event docs so
 *   Firestore queries by citySlug work correctly.
 * - New venues call the Google API, extract locality, upsert the city, then
 *   cache results in overrides for future syncs.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} sourceId
 * @returns {{ geocoded: number, skipped: number }}
 */
export async function geocodeSourceEvents(db, sourceId) {
  const snapshot = await db
    .collection('external_events')
    .where('source', '==', sourceId)
    .get();

  const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const overridesCollection = db.collection('external_event_overrides');
  let geocoded = 0;
  let skipped = 0;

  for (const event of events) {
    const stableKey = buildStableKey(event);
    if (!stableKey) {
      skipped += 1;
      continue;
    }

    // Check override cache first
    const overrideDoc = await overridesCollection.doc(stableKey).get();
    const cached = overrideDoc.exists ? overrideDoc.data() : null;

    if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number') {
      // Re-apply cached data to the freshly synced event doc
      const docUpdate = {
        latitude: cached.latitude,
        longitude: cached.longitude,
      };
      if (cached.citySlug) docUpdate.citySlug = cached.citySlug;
      await db.collection('external_events').doc(event.id).update(docUpdate);
      skipped += 1;
      continue;
    }

    // Not cached — geocode the venue
    const address = event.address || '';
    const city = event.city || event.citySlug || '';
    const fullAddress = [address, city].filter(Boolean).join(', ');
    if (!fullAddress) {
      skipped += 1;
      continue;
    }

    const result = await geocodeAddress(fullAddress);
    if (!result) {
      skipped += 1;
      continue;
    }

    const { lat, lng, cityName, citySlug, country, countryCode, countrySlug, timeZone } = result;

    // Register the city so it gets its own page + dropdown entry
    if (cityName && citySlug) {
      await upsertCity(db, { slug: citySlug, label: cityName, country, countryCode, countrySlug, lat, lng, timeZone });
    }

    // Cache in overrides so future syncs skip the API call
    await overridesCollection.doc(stableKey).set(
      {
        latitude: lat,
        longitude: lng,
        ...(citySlug && { citySlug }),
        geocodedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Update the event doc so citySlug queries work correctly
    const docUpdate = { latitude: lat, longitude: lng };
    if (citySlug) docUpdate.citySlug = citySlug;
    await db.collection('external_events').doc(event.id).update(docUpdate);

    geocoded += 1;
  }

  return { geocoded, skipped };
}
