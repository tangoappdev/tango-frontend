import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import FestivalPageClient from '../../FestivalPageClient';
import { buildCountryIndex, filterFestivals, loadFestivals } from '../../data';

const buildTitle = (countryName, cityName) =>
  `Tango festivals & marathons in ${cityName}, ${countryName}`;

export async function generateMetadata({ params }) {
  const countrySlug = params?.country;
  const citySlug = params?.city;
  if (!countrySlug || !citySlug) return {};
  const festivals = await loadFestivals();
  const countries = buildCountryIndex(festivals);
  const country = countries.find((item) => item.slug === countrySlug);
  const city = country?.cities?.find((item) => item.slug === citySlug);
  if (!country || !city) return {};
  return {
    title: buildTitle(country.name, city.name),
    description: `Upcoming tango festivals and marathons in ${city.name}, ${country.name}.`,
  };
}

export default async function TangoFestivalsCityPage({ params }) {
  const countrySlug = params?.country;
  const citySlug = params?.city;
  if (!countrySlug || !citySlug) return notFound();

  const festivals = await loadFestivals();
  const countries = buildCountryIndex(festivals);
  const country = countries.find((item) => item.slug === countrySlug);
  const city = country?.cities?.find((item) => item.slug === citySlug);
  if (!country || !city) return notFound();

  const filtered = filterFestivals(festivals, countrySlug, citySlug);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-6 text-white sm:px-10 sm:py-12">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-7 sm:mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
              Tango Guide
            </p>
            <h1 className="mt-3 text-xl font-semibold sm:text-3xl">
              Tango Festivals & Marathons in {city.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              See upcoming festivals and marathons around {city.name}, {country.name}.
            </p>
          </header>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
              No upcoming festivals found yet. Please check back soon.
            </div>
          ) : (
            <FestivalPageClient
              festivals={filtered}
              countries={countries}
              currentCountrySlug={countrySlug}
              currentCitySlug={citySlug}
              countLabelSuffix={`festivals and marathons listed in ${city.name}.`}
            />
          )}
        </div>
      </main>
    </>
  );
}
