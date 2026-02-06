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
                animation: 'tanda-marquee linear infinite',
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

const TandaCarousel = () => {
  const containerRef = useRef(null);
  const [tandas, setTandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTandas = async () => {
      try {
        const res = await fetch('/api/tandas/featured?limit=24');
        const data = await res.json();
        if (!isMounted) return;
        setTandas(Array.isArray(data?.tandas) ? data.tandas : []);
      } catch (error) {
        if (!isMounted) return;
        setTandas([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTandas();
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
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-56 rounded-full bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
            <div className="h-9 w-9 rounded-full border border-white/10 bg-white/5" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden py-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`tanda-skeleton-${index}`}
              className="h-[300px] min-w-[220px] rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      </section>
    );
  }
if (!tandas.length) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Listen to the Best Tandas to Dance</h2>
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
        className="tanda-scroll flex gap-4 overflow-x-auto overflow-y-visible py-3"
        style={{ scrollbarWidth: 'none' }}
      >
        {tandas.map((tanda) => (
          <article
            key={tanda.id}
            className="group min-w-[220px] max-w-[220px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#2a2d33] transition hover:scale-[1.05] hover:border-white/20"
            onClick={() => {
              window.location.href = `/player?tandaId=${tanda.id}`;
            }}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[#30333a]">
              <img
                src={tanda.artwork_signed || '/default-artwork.png'}
                alt={`${tanda.orchestra || 'Tanda'} artwork`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
                <PlayIcon className="h-10 w-10 text-white transition-transform duration-200 group-hover:scale-150" />
              </div>
            </div>
            <div className="p-4">
              <MarqueeText
                text={tanda.orchestra || 'Unknown Orchestra'}
                className="text-sm font-semibold text-white"
              />
              <div>
                <MarqueeText
                  text={tanda.singer || 'Instrumental'}
                  className="text-xs text-gray-300"
                />
              </div>
            </div>
          </article>
        ))}
      </div>
      <style jsx>{`
        .tanda-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes tanda-marquee {
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

export default TandaCarousel;

