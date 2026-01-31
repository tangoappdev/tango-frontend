'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_CENTER = { lat: 40.73061, lng: -73.935242 };

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

const MapView = ({ events }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);

  const points = useMemo(
    () =>
      (events || [])
        .filter((event) => typeof event.latitude === 'number' && typeof event.longitude === 'number')
        .map((event) => ({
          id: event.id,
          title: event.title,
          lat: event.latitude,
          lng: event.longitude,
        })),
    [events]
  );

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    loadScript(src)
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google) return;
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: points[0] || DEFAULT_CENTER,
        zoom: points.length ? 12 : 4,
        mapTypeControl: false,
        streetViewControl: false,
      });
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    points.forEach((point) => {
      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: mapInstance.current,
        title: point.title,
      });
      markersRef.current.push(marker);
    });

    if (points.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));
      mapInstance.current.fitBounds(bounds);
    } else if (points.length === 1) {
      mapInstance.current.setCenter(points[0]);
      mapInstance.current.setZoom(13);
    }
  }, [ready, points]);

  if (!points.length) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#2a2d33] p-4 text-sm text-gray-300">
        Map view will appear once locations are saved for these events.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
      <div ref={mapRef} className="h-64 w-full" />
    </div>
  );
};

export default MapView;
