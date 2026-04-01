'use client';

import { useEffect, useMemo, useState } from 'react';
import DayTabs from '@/app/milonga-guide/DayTabs';
import RecurringEvents from '@/app/milonga-guide/RecurringEvents';

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

const closestCity = (coords, list) => {
  if (!list?.length) return null;
  let best = list[0];
  let bestDist = Number.POSITIVE_INFINITY;
  list.forEach((city) => {
    const dist = distanceKm(coords, city);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  });
  return best;
};

const SelectBox = ({ label, value, onChange, children }) => (
  <div className="w-full sm:w-auto sm:min-w-[160px]">
    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
      {label}
    </label>
    <div className="mt-2 rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-semibold text-white outline-none"
      >
        {children}
      </select>
    </div>
  </div>
);

export default function MilongaGuideEmbed() {
  const [cities, setCities] = useState([]);
  const [activeCountry, setActiveCountry] = useState('');
  const [activeCity, setActiveCity] = useState('new-york');
  const [loading, setLoading] = useState(false);
  const [groupedEvents, setGroupedEvents] = useState([]);
  const [recurringEvents, setRecurringEvents] = useState([]);
  const [error, setError] = useState(null);

  // Derive sorted country list from cities
  const countries = useMemo(() => {
    const map = new Map();
    cities.forEach((c) => {
      if (c.countrySlug && c.country && !map.has(c.countrySlug)) {
        map.set(c.countrySlug, { slug: c.countrySlug, label: c.country });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [cities]);

  // Cities filtered by selected country
  const citiesInCountry = useMemo(
    () => (activeCountry ? cities.filter((c) => c.countrySlug === activeCountry) : cities),
    [cities, activeCountry]
  );

  // Load city list from API
  useEffect(() => {
    let isMounted = true;
    const loadCities = async () => {
      try {
        const res = await fetch('/api/milonga-guide/cities');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data?.ok || !Array.isArray(data.cities)) return;
        if (data.cities.length) setCities(data.cities);
      } catch {
        // ignore
      }
    };
    loadCities();
    return () => { isMounted = false; };
  }, []);

  // When cities load, set the default country from the default city
  useEffect(() => {
    if (!cities.length) return;
    const city = cities.find((c) => c.slug === activeCity);
    if (city?.countrySlug) setActiveCountry(city.countrySlug);
  }, [cities]);

  // Geolocation: pick closest city
  useEffect(() => {
    if (!cities.length) return;
    const select = (coords) => {
      const city = closestCity(coords, cities.filter(
        (c) => typeof c.lat === 'number' && typeof c.lng === 'number'
      ));
      if (city?.slug) {
        setActiveCity(city.slug);
        if (city.countrySlug) setActiveCountry(city.countrySlug);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => select({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        async () => {
          try {
            const res = await fetch('https://ipapi.co/json/');
            if (!res.ok) return;
            const data = await res.json();
            if (data?.latitude && data?.longitude) {
              select({ lat: data.latitude, lng: data.longitude });
            }
          } catch {
            // ignore
          }
        },
        { timeout: 5000 }
      );
    }
  }, [cities]);

  // Fetch events when active city changes
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
      } catch {
        if (!isMounted) return;
        setError('Failed to load events');
        setGroupedEvents([]);
        setRecurringEvents([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchEvents();
    return () => { isMounted = false; };
  }, [activeCity]);

  const handleCountryChange = (countrySlug) => {
    setActiveCountry(countrySlug);
    // Switch to first city in new country
    const first = cities.find((c) => c.countrySlug === countrySlug);
    if (first) setActiveCity(first.slug);
  };

  const handleCityChange = (citySlug) => {
    if (!citySlug) {
      // "All cities" → navigate to country page
      window.location.href = `/milonga-guide/${activeCountry}`;
      return;
    }
    setActiveCity(citySlug);
  };

  const activeLabel = useMemo(
    () => cities.find((c) => c.slug === activeCity)?.label || 'your city',
    [activeCity, cities]
  );
  const activeTimeZone = useMemo(
    () => cities.find((c) => c.slug === activeCity)?.timeZone || null,
    [activeCity, cities]
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
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:mt-6">
          <SelectBox label="Country" value={activeCountry} onChange={handleCountryChange}>
            {countries.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-[#2a2d33] text-white">
                {c.label}
              </option>
            ))}
          </SelectBox>

          <SelectBox label="City" value={activeCity} onChange={handleCityChange}>
            <option value="" className="bg-[#2a2d33] text-white">All cities</option>
            {citiesInCountry.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-[#2a2d33] text-white">
                {c.label}
              </option>
            ))}
          </SelectBox>
        </div>
      </header>

      {loading && (
        <div className="mt-6 animate-pulse space-y-6">
          <div className="flex items-center gap-3 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 w-20 rounded-full border border-white/10 bg-white/5" />
            ))}
          </div>
          <div className="h-[260px] w-full rounded-2xl border border-white/10 bg-white/5" />
          <div className="h-5 w-48 rounded-full bg-white/10" />
          <div className="flex gap-6 overflow-hidden pb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[170px] min-w-[394px] rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
        </div>
      )}
      {!loading && error && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          {error}
        </div>
      )}
      {!loading && !error && groupedEvents.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          No upcoming events found yet. Please check back soon.
        </div>
      )}
      {!loading && !error && groupedEvents.length > 0 && (
        <>
          <DayTabs groupedEvents={groupedEvents} citySlug={activeCity} timeZone={activeTimeZone} />
          <RecurringEvents events={recurringEvents} />
        </>
      )}
    </section>
  );
}
