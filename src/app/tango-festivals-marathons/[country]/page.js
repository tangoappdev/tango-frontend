import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import FestivalPageClient from '../FestivalPageClient';
import { buildCountryIndex, filterFestivals, loadFestivals } from '../data';
import { buildFestivalSchema } from '../schema';

const buildTitle = (countryName) => `Tango festivals & marathons in ${countryName}`;

export async function generateMetadata({ params }) {
  const countrySlug = params?.country;
  if (!countrySlug) return {};
  const festivals = await loadFestivals();
  const countries = buildCountryIndex(festivals);
  const country = countries.find((item) => item.slug === countrySlug);
  if (!country) return {};
  return {
    title: buildTitle(country.name),
    description: `Upcoming tango festivals and marathons in ${country.name}.`,
  };
}

export default async function TangoFestivalsCountryPage({ params }) {
  const countrySlug = params?.country;
  if (!countrySlug) return notFound();

  const festivals = await loadFestivals();
  const countries = buildCountryIndex(festivals);
  const country = countries.find((item) => item.slug === countrySlug);
  if (!country) return notFound();

  const filtered = filterFestivals(festivals, countrySlug, '');
  const schema = buildFestivalSchema(filtered);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-6 text-white sm:px-10 sm:py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-7 sm:mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
              Tango Guide
            </p>
            <h1 className="mt-3 text-xl font-semibold sm:text-3xl">
              Tango Festivals & Marathons in {country.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              Explore upcoming events across {country.name} and plan your next tango trip.
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
              currentCitySlug=""
              countLabelSuffix={`listed in ${country.name}.`}
            />
          )}
        </div>
      </main>
    </>
  );
}
