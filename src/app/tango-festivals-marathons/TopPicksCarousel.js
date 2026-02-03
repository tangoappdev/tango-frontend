'use client';

import { useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatDateRange } from './utils';

const TopPicksCarousel = ({ topPicks, showHeader = true, title }) => {
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = containerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
  };

  const handleScroll = () => {
    updateScrollState();
  };

  const handleInit = () => {
    updateScrollState();
  };

  const scrollByAmount = (direction) => {
    const el = containerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <section className={showHeader ? 'mt-8' : 'mt-3'}>
      <div className="mb-4 flex items-center justify-between">
        {showHeader && (
          <h2 className="text-lg font-semibold text-white">
            {title || 'Top Pick Festivals & Marathons Worldwide'}
          </h2>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            disabled={!canScrollLeft}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:border-white/30 disabled:opacity-40"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            disabled={!canScrollRight}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:border-white/30 disabled:opacity-40"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onLoad={handleInit}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
        onMouseEnter={handleInit}
      >
        {topPicks.map((festival) => (
          <article
            key={festival.id}
            className="min-w-[240px] max-w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-[#2a2d33]"
          >
            {festival.imageUrl ? (
              <div className="aspect-[16/10] w-full overflow-hidden bg-white/5">
                <img
                  src={festival.imageUrl}
                  alt={`${festival.title} cover`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="aspect-[16/10] w-full bg-[#30333a]" />
            )}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white">{festival.title}</h3>
              {(festival.city || festival.country) && (
                <p className="mt-1 text-xs text-gray-300">
                  {[festival.city, festival.country].filter(Boolean).join(', ')}
                </p>
              )}
              {formatDateRange(
                festival.startDate,
                festival.endDate,
                festival.dateText
              ) && (
                <p className="mt-2 text-xs text-gray-400">
                  {formatDateRange(
                    festival.startDate,
                    festival.endDate,
                    festival.dateText
                  )}
                </p>
              )}
              {festival.website && (
                <a
                  href={festival.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                >
                  Visit website
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default TopPicksCarousel;
