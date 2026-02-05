'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';

const MarqueeText = ({ text, className }) => {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const [marquee, setMarquee] = useState({ duration: 0, distance: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    const containerWidth = container.offsetWidth;
    const innerWidth = inner.scrollWidth;
    const overflow = innerWidth - containerWidth;
    if (overflow > 6) {
      const distance = overflow + 16;
      const duration = Math.max(6, distance / 35);
      setMarquee({ duration, distance });
    } else {
      setMarquee({ duration: 0, distance: 0 });
    }
  }, [text]);

  return (
    <div ref={containerRef} className="overflow-hidden whitespace-nowrap">
      <span
        ref={innerRef}
        className={className}
        style={
          marquee.duration
            ? {
                transform: 'translateX(0)',
                animation: 'tangotube-marquee linear infinite',
                animationDuration: `${marquee.duration}s`,
                ['--marquee-distance']: `-${marquee.distance}px`,
              }
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
};

const TangoTubeCarousel = () => {
  const containerRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/tangotube/latest?limit=20');
        const data = await res.json();
        if (!isMounted) return;
        setVideos(Array.isArray(data?.videos) ? data.videos : []);
      } catch {
        if (!isMounted) return;
        setVideos([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchVideos();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateScrollState = () => {
    const el = containerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
  };

  const scrollByAmount = (direction) => {
    const el = containerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
        Loading tango videos...
      </section>
    );
  }

  if (!videos.length) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Latest Tango Videos</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            disabled={!canScrollLeft}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:border-white/30 disabled:opacity-40"
            aria-label="Scroll left"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            disabled={!canScrollRight}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:border-white/30 disabled:opacity-40"
            aria-label="Scroll right"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={updateScrollState}
        onMouseEnter={updateScrollState}
        className="tangotube-scroll flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {videos.map((video) => (
          <a
            key={video.id}
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group min-w-[240px] max-w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-[#2a2d33] transition hover:border-white/20"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-[#30333a]">
              <img
                src={video.thumbnail}
                alt={video.title || 'Tango video'}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                {video.duration || 'Video'}
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                <PlayIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <div className="p-4">
              <MarqueeText text={video.title || 'Untitled video'} className="text-sm font-semibold text-white" />
              <div className="mt-1">
                <MarqueeText text={video.channel || 'Unknown channel'} className="text-xs text-gray-300" />
              </div>
              {video.metadata && (
                <p className="mt-2 text-[11px] text-gray-400">{video.metadata}</p>
              )}
            </div>
          </a>
        ))}
      </div>
      <style jsx>{`
        .tangotube-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes tangotube-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(var(--marquee-distance));
          }
        }
      `}</style>
    </section>
  );
};

export default TangoTubeCarousel;
