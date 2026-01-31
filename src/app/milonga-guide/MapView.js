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
  const infoWindowRef = useRef(null);
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
          venue: event.venue,
          address: event.address,
          time: event.timeRangeRaw,
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
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#343a43' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#d2d7dd' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#252932' }] },
          { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#454c56' }] },
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#b0b7c1' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#2f343c' }] },
          { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9ea6b0' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#4a515c' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#262b34' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#c3c9d1' }] },
          { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#3a4049' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#2a2f37' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#8e98a6' }] },
        ],
      });
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    const markerIcon = {
      path: 'M12 2C7.589 2 4 5.589 4 10c0 6.1 7.1 13 8 13s8-6.9 8-13c0-4.411-3.589-8-8-8zm0 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z',
      fillColor: '#25edda',
      fillOpacity: 1,
      strokeOpacity: 0,
      strokeWeight: 0,
      scale: 1.15,
      anchor: new window.google.maps.Point(12, 23),
    };

    points.forEach((point) => {
      const directionsUrl = point.address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point.address)}`
        : `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;
      const content = `
        <div style="font-family: Arial, sans-serif; max-width: 240px; color: #111827;">
          <div style="font-weight: 700; margin-bottom: 4px;">${point.title || ''}</div>
          ${point.time ? `<div style="font-size: 12px; color: #374151;">${point.time}</div>` : ''}
          ${point.venue ? `<div style="font-size: 12px; margin-top: 6px; color: #1f2937;">${point.venue}</div>` : ''}
          ${point.address ? `<div style="font-size: 12px; color: #4b5563;">${point.address}</div>` : ''}
          <a href="${directionsUrl}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:8px;font-size:12px;color:#0f766e;text-decoration:none;font-weight:700;">
            Get directions
          </a>
        </div>
      `;
      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: mapInstance.current,
        title: point.title,
        icon: markerIcon,
      });
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapInstance.current, marker);
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
