'use client';

import { useEffect } from 'react';


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

const AutoCityRedirect = ({ enabled = true }) => {
  useEffect(() => {
    if (!enabled) return;

    const redirect = (coords, list) => {
      const city = closestCity(coords, list);
      if (city?.slug) {
        window.location.replace(`/milonga-guide/${city.countrySlug}/${city.slug}`);
      }
    };

    const resolveCityList = async () => {
      try {
        const res = await fetch('/api/milonga-guide/cities');
        if (!res.ok) return [];
        const data = await res.json();
        const cities = (data?.cities || [])
          .map((city) => ({
            slug: city.slug,
            countrySlug: city.countrySlug,
            lat: city.lat,
            lng: city.lng,
          }))
          .filter((city) => city.slug && city.countrySlug && typeof city.lat === 'number' && typeof city.lng === 'number');
        return cities;
      } catch (error) {
        return [];
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const list = await resolveCityList();
          redirect({ lat: pos.coords.latitude, lng: pos.coords.longitude }, list);
        },
        async () => {
          try {
            const res = await fetch('https://ipapi.co/json/');
            if (!res.ok) return;
            const data = await res.json();
            if (data?.latitude && data?.longitude) {
              const list = await resolveCityList();
              redirect({ lat: data.latitude, lng: data.longitude }, list);
            }
          } catch (error) {
            // ignore
          }
        },
        { timeout: 5000 }
      );
    }
  }, [enabled]);

  return null;
};

export default AutoCityRedirect;
