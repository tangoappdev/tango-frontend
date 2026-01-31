'use client';

import { useEffect } from 'react';

const CITY_COORDS = [
  { slug: 'new-york', lat: 40.7128, lng: -74.006 },
  { slug: 'buenos-aires', lat: -34.6037, lng: -58.3816 },
  { slug: 'san-francisco', lat: 37.7749, lng: -122.4194 },
  { slug: 'berlin', lat: 52.52, lng: 13.405 },
  { slug: 'sao-paulo', lat: -23.5558, lng: -46.6396 },
  { slug: 'athens', lat: 37.9838, lng: 23.7275 },
  { slug: 'turkiye', lat: 41.0082, lng: 28.9784 },
  { slug: 'england', lat: 51.5074, lng: -0.1278 },
  { slug: 'miami', lat: 25.7617, lng: -80.1918 },
  { slug: 'paris', lat: 48.8566, lng: 2.3522 },
  { slug: 'rome', lat: 41.9028, lng: 12.4964 },
  { slug: 'austin', lat: 30.2672, lng: -97.7431 },
  { slug: 'barcelona', lat: 41.3851, lng: 2.1734 },
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
  let best = CITY_COORDS[0];
  let bestDist = Number.POSITIVE_INFINITY;
  CITY_COORDS.forEach((city) => {
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

    const redirect = (coords) => {
      const city = closestCity(coords);
      if (city?.slug) {
        window.location.replace(`/milonga-guide/${city.slug}`);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          redirect({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        async () => {
          try {
            const res = await fetch('https://ipapi.co/json/');
            if (!res.ok) return;
            const data = await res.json();
            if (data?.latitude && data?.longitude) {
              redirect({ lat: data.latitude, lng: data.longitude });
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
