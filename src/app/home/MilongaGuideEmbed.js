'use client';

import { useEffect, useMemo, useState } from 'react';
import CitySelect from '@/app/milonga-guide/CitySelect';
import DayTabs from '@/app/milonga-guide/DayTabs';
import RecurringEvents from '@/app/milonga-guide/RecurringEvents';

const CITIES = [
  { slug: 'new-york', label: 'New York', lat: 40.7128, lng: -74.006 },
  { slug: 'buenos-aires', label: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { slug: 'san-francisco', label: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { slug: 'berlin', label: 'Berlin', lat: 52.52, lng: 13.405 },
  { slug: 'sao-paulo', label: 'Sao Paulo', lat: -23.5558, lng: -46.6396 },
  { slug: 'athens', label: 'Athens', lat: 37.9838, lng: 23.7275 },
  { slug: 'turkiye', label: 'Turkiye', lat: 41.0082, lng: 28.9784 },
  { slug: 'england', label: 'England', lat: 51.5074, lng: -0.1278 },
  { slug: 'miami', label: 'Miami', lat: 25.7617, lng: -80.1918 },
  { slug: 'paris', label: 'Paris', lat: 48.8566, lng: 2.3522 },
  { slug: 'rome', label: 'Rome', lat: 41.9028, lng: 12.4964 },
  { slug: 'austin', label: 'Austin', lat: 30.2672, lng: -97.7431 },
  { slug: 'barcelona', label: 'Barcelona', lat: 41.3851, lng: 2.1734 },
];

const toRad = (value) => (value * Math.PI) / 180;
const distanceKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * 6371 * Math.asin(Math.sqrt(hav));
};

const closestCity = (coords) => {
  let best = CITIES[0];
  let bestDist = Number.POSITIVE_INFINITY;
  CITIES.forEach((city) => {
    const dist = distanceKm(coords, city);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  });
  return best;
};

export default function MilongaGuideEmbed() {
  const [activeCity, setActiveCity] = useState('new-york');
  const [loading, setLoading] = useState(false);
  const [groupedEvents, setGroupedEvents] = useState([]);
  const [recurringEvents, setRecurringEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const selectCity = (coords) => {
      const city = closestCity(coords);
      if (city?.slug) {
        setActiveCity(city.slug);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          selectCity({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        async () => {
          try {
            const res = await fetch('https://ipapi.co/json/');
            if (!res.ok) return;
            const data = await res.json();
            if (data?.latitude && data?.longitude) {
              selectCity({ lat: data.latitude, lng: data.longitude });
            }
          } catch (err) {
            // ignore
          }
        },
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/milonga-guide?city=${activeCity}`);
        const data = await res.json();
        if (!isMounted) return;
        if (!data?.ok) {
          setError(data?.error || 'Failed to load events');
          setGroupedEvents([]);
          setRecurringEvents([]);
        } else {
          setGroupedEvents(data.groupedEvents || []);
          setRecurringEvents(data.recurringEvents || []);
        }
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load events');
        setGroupedEvents([]);
        setRecurringEvents([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      isMounted = false;
    };
  }, [activeCity]);

  const activeLabel = useMemo(
    () => CITIES.find((city) => city.slug === activeCity)?.label || 'your city',
    [activeCity]
  );

  return (
    <section>
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
          Milonga Guide
        </p>
        <h2 className="mt-3 text-xl font-semibold sm:text-3xl">
          Milongas & Practicas in {activeLabel}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-gray-300">
          Curated listings from trusted tango guides. Events update daily and are grouped by date.
        </p>
        <div className="mt-5 sm:mt-6">
          <CitySelect
            activeSlug={activeCity}
            cities={CITIES.map(({ slug, label }) => ({ slug, label }))}
            onChange={(value) => setActiveCity(value)}
          />
        </div>
      </header>

      {loading && (
        <div className="mt-6 animate-pulse space-y-6">
          <div className="flex items-center gap-3 overflow-hidden">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={`day-skeleton-${index}`}
                className="h-10 w-20 rounded-full border border-white/10 bg-white/5"
              />
            ))}
          </div>
          <div className="h-[260px] w-full rounded-2xl border border-white/10 bg-white/5" />
          <div className="h-5 w-48 rounded-full bg-white/10" />
          <div className="flex gap-6 overflow-hidden pb-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`milonga-card-skeleton-${index}`}
                className="h-[170px] min-w-[394px] rounded-2xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        </div>
      )}
      {!loading && error && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          {error}
        </div>
      )}
      {!loading && !error && groupedEvents.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          No upcoming events found yet. Please check back soon.
        </div>
      ) : null}
      {!loading && !error && groupedEvents.length > 0 && (
        <>
          <DayTabs groupedEvents={groupedEvents} citySlug={activeCity} />
          <RecurringEvents events={recurringEvents} />
        </>
      )}
    </section>
  );
}

