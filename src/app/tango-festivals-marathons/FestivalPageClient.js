'use client';

import { useMemo, useState } from 'react';
import FestivalFilters from './FestivalFilters';
import MapView from './MapView';
import TopPicksCarousel from './TopPicksCarousel';
import { formatDateRange } from './utils';

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

  const groupedByMonth = useMemo(() => {
    const grouped = new Map();
    filteredFestivals
      .filter((festival) => !festival.topPick)
      .forEach((festival) => {
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
      <div className="mt-4 flex w-full flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedMonth(null)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            selectedMonth == null
              ? 'border-[#25edda] bg-[#25edda] text-[#1f2126]'
              : 'border-white/10 text-gray-300 hover:border-white/30'
          }`}
        >
          All months
        </button>
        {monthButtons.map((month) => {
          const isActive = selectedMonth === month.index;
          return (
            <button
              key={month.index}
              type="button"
              onClick={() => setSelectedMonth(month.index)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
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
      <MapView events={filteredFestivals} />
      <p className="mt-3 text-sm text-gray-300">
        <span className="text-[#25edda]">{filteredFestivals.length}</span> {countLabelSuffix}
      </p>
      {topPicks.length > 0 && (
        <TopPicksCarousel topPicks={topPicks} />
      )}
      {groupedByMonth.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">
            Festivals & Marathons by Month
          </h2>
          <div className="mt-4 space-y-6">
            {groupedByMonth.map((group) => (
              <div key={group.monthIndex}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
                  {group.monthName}
                </h3>
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((festival) => (
                    <article
                      key={festival.id}
                      className="overflow-hidden rounded-2xl border border-white/5 bg-[#30333a]"
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
                          <div className="aspect-[16/10] w-full bg-[#2a2d33]" />
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
                            >
                              Visit website
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {groupedByMonth.length === 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFestivals.map((festival) => (
            <article
              key={festival.id}
              className="overflow-hidden rounded-2xl border border-white/5 bg-[#30333a]"
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
                  <div className="aspect-[16/10] w-full bg-[#2a2d33]" />
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
