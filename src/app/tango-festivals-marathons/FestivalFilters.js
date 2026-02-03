'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from './utils';

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

const FestivalFilters = ({
  countries,
  currentCountrySlug,
  currentCitySlug,
  enableAutoLocate = false,
  basePath = '/tango-festivals-marathons',
}) => {
  const router = useRouter();
  const [autoStatus, setAutoStatus] = useState('idle');
  const hasAutoLocated = useRef(false);

  const countryOptions = useMemo(
    () => [{ name: 'All countries', slug: '' }, ...(countries || [])],
    [countries]
  );

  const selectedCountry = useMemo(() => {
    if (!currentCountrySlug) return null;
    return countries.find((country) => country.slug === currentCountrySlug) || null;
  }, [countries, currentCountrySlug]);

  const cityOptions = useMemo(() => {
    if (!selectedCountry) return [{ name: 'All cities', slug: '' }];
    return [
      { name: 'All cities', slug: '' },
      ...(selectedCountry.cities || []).map((city) => ({
        name: city.name,
        slug: city.slug,
      })),
    ];
  }, [selectedCountry]);

  const handleCountryChange = (event) => {
    const slug = event.target.value;
    if (!slug) {
      sessionStorage.setItem('festivalCountryOverride', 'all');
      router.push(basePath);
      return;
    }
    sessionStorage.setItem('festivalCountryOverride', slug);
    router.push(`${basePath}/${slug}`);
  };

  const handleCityChange = (event) => {
    const slug = event.target.value;
    if (!selectedCountry) return;
    if (!slug) {
      router.push(`${basePath}/${selectedCountry.slug}`);
      return;
    }
    router.push(`${basePath}/${selectedCountry.slug}/${slug}`);
  };

  useEffect(() => {
    if (!enableAutoLocate || hasAutoLocated.current || currentCountrySlug) return;
    if (sessionStorage.getItem('festivalCountryOverride') === 'all') return;
    hasAutoLocated.current = true;
    setAutoStatus('locating');

    const navigateToCountry = (countryName) => {
      if (!countryName) {
        setAutoStatus('idle');
        return;
      }
      const slug = slugify(countryName);
      const match = countries.find((country) => country.slug === slug);
      if (match) {
        router.replace(`${basePath}/${match.slug}`);
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
            navigateToCountry(countryName);
          } catch (error) {
            setAutoStatus('idle');
          }
        },
        async () => {
          try {
            const countryName = await resolveCountryFromIp();
            navigateToCountry(countryName);
          } catch (error) {
            setAutoStatus('idle');
          }
        },
        { timeout: 6000 }
      );
    } else {
      resolveCountryFromIp().then(navigateToCountry).catch(() => setAutoStatus('idle'));
    }
  }, [enableAutoLocate, currentCountrySlug, countries, router, basePath]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Country
          </label>
          <select
            value={currentCountrySlug || ''}
            onChange={handleCountryChange}
            className="w-full min-w-[220px] rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2 text-sm text-white md:w-64"
          >
            {countryOptions.map((option) => (
              <option key={option.slug || 'all'} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            City
          </label>
          <select
            value={currentCitySlug || ''}
            onChange={handleCityChange}
            disabled={!selectedCountry}
            className="w-full min-w-[220px] rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 md:w-64"
          >
            {cityOptions.map((option) => (
              <option key={option.slug || 'all'} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {enableAutoLocate && autoStatus === 'locating' && (
        <p className="text-xs text-gray-400">Detecting your country…</p>
      )}
    </div>
  );
};

export default FestivalFilters;
