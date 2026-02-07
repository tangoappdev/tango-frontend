import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { getFirestore } from '@/lib/firebaseAdmin.server';
import { slugify } from '../../../utils';
import ShareButtons from './ShareButtons';

const buildDirectionsUrl = (event) => {
  if (event.latitude && event.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
  }
  if (event.city || event.country) {
    const destination = [event.city, event.country].filter(Boolean).join(', ');
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  }
  return null;
};

const buildMapEmbedUrl = (event) => {
  if (event.latitude && event.longitude) {
    return `https://maps.google.com/maps?q=${event.latitude},${event.longitude}&z=5&output=embed`;
  }
  if (event.city || event.country) {
    const query = [event.city, event.country].filter(Boolean).join(', ');
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=5&output=embed`;
  }
  return null;
};

export async function generateMetadata({ params }) {
  const { id } = await params;
  const db = getFirestore();
  const doc = await db.collection('external_festivals').doc(id).get();
  if (!doc.exists) return {};
  const event = doc.data();
  const title = event?.title ? `${event.title} | Tango Festivals` : 'Tango Festival';
  const description = event?.city
    ? `${event.title} in ${event.city}, ${event.country || ''}`.trim()
    : `Details for ${event?.title || 'this event'}.`;
  return { title, description };
}

export default async function FestivalEventPage({ params }) {
  const { id } = await params;
  const db = getFirestore();
  const doc = await db.collection('external_festivals').doc(id).get();
  if (!doc.exists) return notFound();
  const baseEvent = { id: doc.id, ...doc.data() };

  const overrideDoc = await db.collection('external_festival_overrides').doc(id).get();
  const override = overrideDoc.exists ? overrideDoc.data() : null;
  const event = { ...baseEvent, ...(override || {}) };
  if (event.status === 'paused') return notFound();

  const mapUrl = buildMapEmbedUrl(event);
  const directionsUrl = buildDirectionsUrl(event);
  const slug = slugify(event.title || 'event');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const canonicalUrl = `${siteUrl}/tango-festivals-marathons/event/${id}/${slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startDate || event.dateText || undefined,
    endDate: event.endDate || event.startDate || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.city || event.country || event.title,
      address: {
        '@type': 'PostalAddress',
        ...(event.city ? { addressLocality: event.city } : {}),
        ...(event.country ? { addressCountry: event.country } : {}),
      },
    },
    ...(event.imageUrl ? { image: [event.imageUrl] } : {}),
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
            href="/tango-festivals-marathons"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#25edda]/80"
          >
            Back to Festivals & Marathons
          </Link>

          <div className="mt-4 rounded-3xl border border-white/10 bg-[#2a2d33] p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              {event.imageUrl && (
                <div className="h-[140px] w-[140px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img
                    src={event.imageUrl}
                    alt={`${event.title} cover`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {event.startDate && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-gray-200">
                      {event.endDate && event.endDate !== event.startDate
                        ? `${event.startDate} - ${event.endDate}`
                        : event.startDate}
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-white">{event.title}</h1>
                {(event.city || event.country) && (
                  <p className="mt-2 text-sm font-medium text-gray-200">
                    {[event.city, event.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {event.description && (
                  <p className="mt-3 whitespace-pre-line text-sm text-gray-300">
                    {event.description}
                  </p>
                )}
                {(event.website || directionsUrl) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {event.website && (
                      <a
                        href={event.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                      >
                        Visit website
                      </a>
                    )}
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                      >
                        Get directions
                      </a>
                    )}
                  </div>
                )}
                <ShareButtons url={canonicalUrl || ''} />
              </div>
            </div>
            {mapUrl && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  title="Festival location map"
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
