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
  const overlayRef = useRef(null);
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
          timeRangeRaw: event.timeRangeRaw,
          startTimeMinutes: event.startTimeMinutes,
          endTimeMinutes: event.endTimeMinutes,
        })),
    [events]
  );

  const formatMinutes = (minutes) => {
    if (minutes === null || minutes === undefined) return null;
    const hrs24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const meridiem = hrs24 >= 12 ? 'pm' : 'am';
    const hrs12 = hrs24 % 12 || 12;
    return `${hrs12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${meridiem}`;
  };

  const formatTimeRange = (point) => {
    if (point.startTimeMinutes == null && point.endTimeMinutes == null) {
      return point.timeRangeRaw || null;
    }
    const start = formatMinutes(point.startTimeMinutes);
    const end = formatMinutes(point.endTimeMinutes);
    if (start && end) return `${start} - ${end}`;
    return start || end || point.timeRangeRaw || null;
  };

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

    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const markerIcon = {
      path: 'M12 2C7.589 2 4 5.589 4 10c0 6.1 7.1 13 8 13s8-6.9 8-13c0-4.411-3.589-8-8-8zm0 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z',
      fillColor: '#25edda',
      fillOpacity: 1,
      strokeOpacity: 0,
      strokeWeight: 0,
      scale: 1.15,
      anchor: new window.google.maps.Point(12, 23),
    };

    const closeOverlay = () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };

    const openOverlay = (point) => {
      closeOverlay();

      const timeLabel = formatTimeRange(point);
      const directionsUrl = point.address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point.address)}`
        : `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;

      const content = `
        <div style="position:relative; font-family: Arial, sans-serif; max-width: 240px; color: #111827; background: #ffffff; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.25); padding: 12px 14px 12px 14px;">
          <button data-close="true" style="position:absolute; top:10px; right:12px; border:0; background:transparent; color:#6b7280; font-size:16px; line-height:1; cursor:pointer;">×</button>
          <div style="font-weight: 700; font-size: 15px; margin: 2px 32px 2px 0;">${point.title || ''}</div>
          ${timeLabel ? `<div style="font-size: 12px; color: #374151; margin-top: 2px;">${timeLabel}</div>` : ''}
          ${point.venue ? `<div style="font-size: 12px; margin-top: 4px; color: #1f2937;">${point.venue}</div>` : ''}
          ${point.address ? `<div style="font-size: 12px; color: #4b5563;">${point.address}</div>` : ''}
          <a href="${directionsUrl}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:8px;font-size:12px;color:#0f766e;text-decoration:none;font-weight:700;">
            Get directions
          </a>
          <div style="position:absolute; left:50%; bottom:-10px; width:0; height:0; transform:translateX(-50%); border-left:10px solid transparent; border-right:10px solid transparent; border-top:10px solid #ffffff;"></div>
        </div>
      `;

      class MilongaOverlay extends window.google.maps.OverlayView {
        constructor(position, html, map) {
          super();
          this.position = position;
          this.html = html;
          this.div = null;
          this.setMap(map);
        }

        onAdd() {
          const div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.transform = 'translate(-50%, -125%)';
          div.style.zIndex = '100';
          div.innerHTML = this.html;
          div.addEventListener('click', (event) => {
            const target = event.target;
            if (target && target.getAttribute && target.getAttribute('data-close') === 'true') {
              event.preventDefault();
              closeOverlay();
            }
          });
          this.div = div;
          const panes = this.getPanes();
          panes?.floatPane.appendChild(div);
        }

        draw() {
          if (!this.div) return;
          const projection = this.getProjection();
          if (!projection) return;
          const point = projection.fromLatLngToDivPixel(this.position);
          if (!point) return;
          this.div.style.left = `${point.x}px`;
          this.div.style.top = `${point.y}px`;
        }

        onRemove() {
          if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
          }
          this.div = null;
        }
      }

      overlayRef.current = new MilongaOverlay(
        new window.google.maps.LatLng(point.lat, point.lng),
        content,
        mapInstance.current
      );
    };

    points.forEach((point) => {
      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: mapInstance.current,
        title: point.title,
        icon: markerIcon,
      });
      marker.addListener('click', () => {
        openOverlay(point);
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
