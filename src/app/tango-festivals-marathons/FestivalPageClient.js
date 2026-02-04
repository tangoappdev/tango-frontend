'use client';

import { useMemo, useState } from 'react';
import FestivalFilters from './FestivalFilters';
import MapView from './MapView';
import TopPicksCarousel from './TopPicksCarousel';
import { formatDateRange, slugify } from './utils';
import { useRouter } from 'next/navigation';

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

const FestivalPageClient = ({
  festivals,
  countries,
  currentCountrySlug,
  currentCitySlug,
  enableAutoLocate,
  countLabelSuffix = 'festivals and marathons listed.',
}) => {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const monthButtons = useMemo(() => buildMonthButtons(), []);

  const filteredFestivals = useMemo(() => {
    if (selectedMonth == null) return festivals;
    return festivals.filter((festival) => {
      const monthIndex = getMonthIndex(festival.startDate);
      return monthIndex === selectedMonth;
    });
  }, [festivals, selectedMonth]);

  const topPicks = useMemo(() => {
    if (currentCountrySlug) return [];
    return filteredFestivals.filter((festival) => festival.topPick);
  }, [filteredFestivals, currentCountrySlug]);

  const chronologicalFestivals = useMemo(() => {
    return [...filteredFestivals].sort((a, b) => {
      if (a.startDate && b.startDate && a.startDate !== b.startDate) {
        return a.startDate.localeCompare(b.startDate);
      }
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [filteredFestivals]);

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
    <>
      <FestivalFilters
        countries={countries}
        currentCountrySlug={currentCountrySlug}
        currentCitySlug={currentCitySlug}
        enableAutoLocate={enableAutoLocate}
      />
      <div className="relative mt-4 w-full">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-[#30333a] to-transparent md:hidden" />
        <div
          className="flex w-full gap-2 overflow-x-auto md:flex-nowrap"
          style={{ scrollbarWidth: 'none' }}
        >
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
      <MapView events={filteredFestivals} zoomBump={!currentCountrySlug} />
      <p className="mt-3 text-sm text-gray-300">
        <span className="text-[#25edda]">{filteredFestivals.length}</span> {countLabelSuffix}
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
      {currentCountrySlug && chronologicalFestivals.length > 0 && (
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
      {!currentCountrySlug && groupedByMonth.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">
            Festivals & Marathons by Month
          </h2>
          <div className="mt-4 space-y-8">
            {groupedByMonth.map((group) => (
              <TopPicksCarousel
                key={group.monthIndex}
                topPicks={group.items}
                title={group.monthName}
                onCardClick={(festival) =>
                  router.push(
                    `/tango-festivals-marathons/event/${festival.id}/${slugify(
                      festival.title
                    )}`
                  )
                }
              />
            ))}
          </div>
        </section>
      )}
      {currentCountrySlug && chronologicalFestivals.length === 0 && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          No upcoming festivals found yet. Please check back soon.
        </div>
      )}
      {!currentCountrySlug && groupedByMonth.length === 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredFestivals.map((festival) => (
          <article
            key={festival.id}
            className="cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#30333a] transition hover:border-white/20"
            onClick={() =>
              router.push(
                `/tango-festivals-marathons/event/${festival.id}/${slugify(festival.title)}`
              )
            }
          >
              <div className="flex flex-col">
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
                  <div className="aspect-[16/10] w-full bg-[#2a2d33]">
                    <div className="flex h-full w-full items-center justify-center text-[#25edda]/80">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-12 w-12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      >
                        <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
                        <path d="M7 3.5v4M17 3.5v4M3.5 9h17" />
                        <rect x="7" y="12" width="2" height="2" fill="currentColor" stroke="none" />
                        <rect x="11" y="12" width="2" height="2" fill="currentColor" stroke="none" />
                        <rect x="15" y="12" width="2" height="2" fill="currentColor" stroke="none" />
                        <rect x="7" y="16" width="2" height="2" fill="currentColor" stroke="none" />
                        <rect x="11" y="16" width="2" height="2" fill="currentColor" stroke="none" />
                        <rect x="15" y="16" width="2" height="2" fill="currentColor" stroke="none" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    {formatDateRange(
                      festival.startDate,
                      festival.endDate,
                      festival.dateText
                    ) && (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-gray-200">
                        {formatDateRange(
                          festival.startDate,
                          festival.endDate,
                          festival.dateText
                        )}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-white">{festival.title}</h3>
                  {(festival.city || festival.country) && (
                    <p className="text-sm text-gray-300">
                      {[festival.city, festival.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                {festival.website && (
                  <a
                    href={festival.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Visit website
                  </a>
                )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
};

export default FestivalPageClient;
