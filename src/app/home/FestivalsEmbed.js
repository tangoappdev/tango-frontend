'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import MapView from '@/app/tango-festivals-marathons/MapView';
import TopPicksCarousel from '@/app/tango-festivals-marathons/TopPicksCarousel';
import { formatDateRange, slugify } from '@/app/tango-festivals-marathons/utils';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const buildMonthButtons = () => {
  const now = new Date();
  const startMonth = now.getMonth();
  return Array.from({ length: 12 }, (_, index) => {
    const monthIndex = (startMonth + index) % 12;
    return {
      index: monthIndex,
      label: MONTH_NAMES[monthIndex],
    };
  });
};

const getMonthIndex = (dateValue) => {
  if (!dateValue) return null;
  const parts = dateValue.split('-').map(Number);
  if (parts.length < 2) return null;
  const month = parts[1];
  if (!month) return null;
  return month - 1;
};

const resolveCountryFromCoords = async (latitude, longitude) => {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data?.countryName || null;
};

const resolveCountryFromIp = async () => {
  const response = await fetch('https://ipapi.co/json/');
  if (!response.ok) return null;
  const data = await response.json();
  return data?.country_name || null;
};

export default function FestivalsEmbed() {
  const router = useRouter();
  const [festivals, setFestivals] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoStatus, setAutoStatus] = useState('idle');
  const hasAutoLocated = useRef(false);
  const monthButtons = useMemo(() => buildMonthButtons(), []);

  useEffect(() => {
    let isMounted = true;
    const fetchFestivals = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/festivals/list');
        const data = await res.json();
        if (!isMounted) return;
        if (!data?.ok) {
          setError(data?.error || 'Failed to load festivals');
          setFestivals([]);
          setCountries([]);
        } else {
          setFestivals(data.festivals || []);
          setCountries(data.countries || []);
        }
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load festivals');
        setFestivals([]);
        setCountries([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchFestivals();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (hasAutoLocated.current || !countries.length) return;
    hasAutoLocated.current = true;
    setAutoStatus('locating');

    const pickCountry = (countryName) => {
      if (!countryName) {
        setAutoStatus('idle');
        return;
      }
      const slug = slugify(countryName);
      const match = countries.find((country) => country.slug === slug);
      if (match) {
        setSelectedCountry(match.slug);
      }
      setAutoStatus('idle');
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const countryName = await resolveCountryFromCoords(
              position.coords.latitude,
              position.coords.longitude
            );
            pickCountry(countryName);
          } catch (error) {
            setAutoStatus('idle');
          }
        },
        async () => {
          try {
            const countryName = await resolveCountryFromIp();
            pickCountry(countryName);
          } catch (error) {
            setAutoStatus('idle');
          }
        },
        { timeout: 6000 }
      );
    } else {
      resolveCountryFromIp().then(pickCountry).catch(() => setAutoStatus('idle'));
    }
  }, [countries]);

  const countryOptions = useMemo(
    () => [{ name: 'All countries', slug: '' }, ...(countries || [])],
    [countries]
  );

  const selectedCountryEntry = useMemo(() => {
    if (!selectedCountry) return null;
    return countries.find((country) => country.slug === selectedCountry) || null;
  }, [countries, selectedCountry]);

  const cityOptions = useMemo(() => {
    if (!selectedCountryEntry) return [{ name: 'All cities', slug: '' }];
    return [
      { name: 'All cities', slug: '' },
      ...(selectedCountryEntry.cities || []).map((city) => ({
        name: city.name,
        slug: city.slug,
      })),
    ];
  }, [selectedCountryEntry]);

  const filteredFestivals = useMemo(() => {
    let filtered = festivals;
    if (selectedCountry) {
      filtered = filtered.filter(
        (festival) => slugify(festival.country) === selectedCountry
      );
    }
    if (selectedCity) {
      filtered = filtered.filter(
        (festival) => slugify(festival.city) === selectedCity
      );
    }
    if (selectedMonth != null) {
      filtered = filtered.filter((festival) => {
        const monthIndex = getMonthIndex(festival.startDate);
        return monthIndex === selectedMonth;
      });
    }
    return filtered;
  }, [festivals, selectedCountry, selectedCity, selectedMonth]);

  const chronologicalFestivals = useMemo(() => {
    return [...filteredFestivals].sort((a, b) => {
      if (a.startDate && b.startDate && a.startDate !== b.startDate) {
        return a.startDate.localeCompare(b.startDate);
      }
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [filteredFestivals]);

  const topPicks = useMemo(() => {
    if (selectedCountry) return [];
    return filteredFestivals.filter((festival) => festival.topPick);
  }, [filteredFestivals, selectedCountry]);

  const groupedByMonth = useMemo(() => {
    const grouped = new Map();
    filteredFestivals.forEach((festival) => {
      const monthIndex = getMonthIndex(festival.startDate);
      if (monthIndex == null) return;
      if (!grouped.has(monthIndex)) grouped.set(monthIndex, []);
      grouped.get(monthIndex).push(festival);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([monthIndex, items]) => ({
        monthIndex,
        monthName: MONTH_NAMES[monthIndex],
        items,
      }));
  }, [filteredFestivals]);

  return (
    <section className="mt-12">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
          Festivals & Marathons
        </p>
        <h2 className="mt-3 text-xl font-semibold sm:text-3xl">
          Tango festivals & marathons worldwide
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-gray-300">
          Plan your next tango escape with a global calendar of festivals and marathons.
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-6 md:flex-1">
          <div className="flex flex-col gap-2 md:w-full">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(event) => {
                setSelectedCountry(event.target.value);
                setSelectedCity('');
              }}
              className="w-full appearance-none rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2 pr-10 text-sm text-white"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M6 8l4 4 4-4' stroke='%23cbd5f5' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px 16px',
              }}
            >
              {countryOptions.map((option) => (
                <option key={option.slug || 'all'} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 md:w-full">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              City
            </label>
            <select
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              disabled={!selectedCountryEntry}
              className="w-full appearance-none rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2 pr-10 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M6 8l4 4 4-4' stroke='%23cbd5f5' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px 16px',
              }}
            >
              {cityOptions.map((option) => (
                <option key={option.slug || 'all'} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {autoStatus === 'locating' && (
          <p className="text-xs text-gray-400">Detecting your country…</p>
        )}
      </div>

      <div className="relative mt-4 w-full">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-[#30333a] to-transparent md:hidden" />
        <div className="flex w-full gap-2 overflow-x-auto md:flex-nowrap" style={{ scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm transition md:flex-1 ${
              selectedMonth == null
                ? 'border-[#25edda] bg-[#25edda] text-[#1f2126]'
                : 'border-white/10 text-gray-300 hover:border-white/30'
            }`}
          >
            All year
          </button>
          {monthButtons.map((month) => {
            const isActive = selectedMonth === month.index;
            return (
              <button
                key={month.index}
                type="button"
                onClick={() => setSelectedMonth(month.index)}
                className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm transition md:flex-1 ${
                  isActive
                    ? 'border-[#25edda] bg-[#25edda] text-[#1f2126]'
                    : 'border-white/10 text-gray-300 hover:border-white/30'
                }`}
              >
                {month.label.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          Loading festivals…
        </div>
      )}
      {!loading && error && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          {error}
        </div>
      )}
      {!loading && !error && (
        <>
          <MapView events={filteredFestivals} zoomBump={!selectedCountry} />
          <p className="mt-3 text-sm text-gray-300">
            <span className="text-[#25edda]">{filteredFestivals.length}</span> festivals and marathons listed.
          </p>
          {topPicks.length > 0 && (
            <TopPicksCarousel
              topPicks={topPicks}
              onCardClick={(festival) =>
                router.push(
                  `/tango-festivals-marathons/event/${festival.id}/${slugify(festival.title)}`
                )
              }
            />
          )}
          {!selectedCountry && filteredFestivals.length > 0 && (
            <TopPicksCarousel
              topPicks={filteredFestivals}
              title="Upcoming Tango Festivals & Marathons"
              onCardClick={(festival) =>
                router.push(
                  `/tango-festivals-marathons/event/${festival.id}/${slugify(festival.title)}`
                )
              }
            />
          )}
          {selectedCountry && chronologicalFestivals.length > 0 && (
            <TopPicksCarousel
              topPicks={chronologicalFestivals}
              title="Upcoming festivals & marathons"
              onCardClick={(festival) =>
                router.push(
                  `/tango-festivals-marathons/event/${festival.id}/${slugify(festival.title)}`
                )
              }
            />
          )}
          {!selectedCountry && groupedByMonth.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
              No upcoming festivals found yet. Please check back soon.
            </div>
          )}
          {selectedCountry && chronologicalFestivals.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
              No upcoming festivals found yet. Please check back soon.
            </div>
          )}
        </>
      )}
    </section>
  );
}

