import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { getFirestore } from '@/lib/firebaseAdmin.server';
import { slugify, formatMinutes } from '../../../utils';
import ShareButtons from './ShareButtons';

const buildStableKey = (event) => {
  if (event?.stableKey) return event.stableKey;
  if (event?.sourceEventId) return `${event.source}:${event.sourceEventId}`;
  const normalizeKey = (value) =>
    (value || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-');
  const eventKey = [event?.title, event?.venue, event?.address]
    .map(normalizeKey)
    .filter(Boolean)
    .join('|');
  return `${event.source}:key:${eventKey}`;
};

const formatTimeRange = (event) => {
  const start = formatMinutes(event.startTimeMinutes);
  const end = formatMinutes(event.endTimeMinutes);
  if (start && end) return `${start} - ${end}`;
  return start || end || event.timeRangeRaw || null;
};

const buildDirectionsUrl = (event) => {
  if (event.latitude && event.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
  }
  if (event.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      event.address
    )}`;
  }
  return null;
};

const buildMapEmbedUrl = (event) => {
  if (event.latitude && event.longitude) {
    return `https://maps.google.com/maps?q=${event.latitude},${event.longitude}&z=14&output=embed`;
  }
  if (event.address) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(event.address)}&z=14&output=embed`;
  }
  return null;
};

const toIsoTime = (minutes) => {
  if (minutes === null || minutes === undefined) return null;
  const hrs24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
};

export async function generateMetadata({ params }) {
  const { id } = await params;
  const db = getFirestore();
  const doc = await db.collection('external_events').doc(id).get();
  if (!doc.exists) return {};
  const event = doc.data();
  const title = event?.title ? `${event.title} | Milonga Guide` : 'Milonga Guide Event';
  const description = event?.address
    ? `${event.title} at ${event.address}`
    : `Details for ${event?.title || 'this event'}.`;
  return { title, description };
}

export default async function MilongaEventPage({ params }) {
  const { id } = await params;
  const db = getFirestore();
  const doc = await db.collection('external_events').doc(id).get();
  if (!doc.exists) return notFound();
  const baseEvent = { id: doc.id, ...doc.data() };
  if (baseEvent.status === 'paused') return notFound();
  const stableKey = buildStableKey(baseEvent);
  let mergedEvent = baseEvent;

  if (stableKey) {
    const overrideDoc = await db.collection('external_event_overrides').doc(stableKey).get();
    if (overrideDoc.exists) {
      const override = overrideDoc.data();
      mergedEvent = {
        ...baseEvent,
        ...(override || {}),
        stableKey,
      };
    } else {
      mergedEvent = { ...baseEvent, stableKey };
    }
  }

  const mapUrl = buildMapEmbedUrl(mergedEvent);
  const directionsUrl = buildDirectionsUrl(mergedEvent);
  const timeRange = formatTimeRange(mergedEvent);
  const citySlug = mergedEvent.citySlug || 'milonga-guide';
  const slug = slugify(mergedEvent.title || 'event');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const canonicalUrl = `${siteUrl}/milonga-guide/event/${id}/${slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: mergedEvent.title,
    startDate: mergedEvent.date
      ? toIsoTime(mergedEvent.startTimeMinutes)
        ? `${mergedEvent.date}T${toIsoTime(mergedEvent.startTimeMinutes)}`
        : mergedEvent.date
      : undefined,
    endDate: mergedEvent.date
      ? toIsoTime(mergedEvent.endTimeMinutes)
        ? `${mergedEvent.date}T${toIsoTime(mergedEvent.endTimeMinutes)}`
        : mergedEvent.date
      : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: mergedEvent.venue || mergedEvent.title,
      address: {
        '@type': 'PostalAddress',
        ...(mergedEvent.address ? { streetAddress: mergedEvent.address } : {}),
      },
    },
    ...(mergedEvent.imageUrl ? { image: [mergedEvent.imageUrl] } : {}),
    ...(canonicalUrl ? { url: canonicalUrl } : {}),
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-6 text-white sm:px-10 sm:py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <div className="mx-auto w-full max-w-4xl">
          <Link
            href={`/milonga-guide/${citySlug}`}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#25edda]/80"
          >
            Back to Milonga Guide
          </Link>

          <div className="mt-4 rounded-3xl border border-white/10 bg-[#2a2d33] p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              {mergedEvent.imageUrl && (
                <div className="h-[140px] w-[140px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img
                    src={mergedEvent.imageUrl}
                    alt={`${mergedEvent.title} logo`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {timeRange && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-gray-200">
                      {timeRange}
                    </span>
                  )}
                  {mergedEvent.eventType && (
                    <span className="rounded-full border border-[#25edda]/30 px-3 py-1 text-[#25edda]">
                      {mergedEvent.eventType}
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-white">{mergedEvent.title}</h1>
                {mergedEvent.venue && (
                  <p className="mt-2 text-sm font-medium text-gray-200">
                    {mergedEvent.venue}
                  </p>
                )}
                {mergedEvent.address && (
                  <p className="mt-1 text-sm text-gray-300">{mergedEvent.address}</p>
                )}
                {mergedEvent.descriptionRaw && (
                  <p className="mt-3 whitespace-pre-line text-sm text-gray-300">
                    {mergedEvent.descriptionRaw}
                  </p>
                )}
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                  >
                    Get directions
                  </a>
                )}
                <ShareButtons url={canonicalUrl || ''} />
              </div>
            </div>
            {mapUrl && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  title="Event location map"
                  src={mapUrl}
                  className="h-64 w-full"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
