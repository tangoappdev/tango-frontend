import Header from '@/components/Header';
import FestivalPageClient from './FestivalPageClient';
import { buildCountryIndex, loadFestivals } from './data';
import { buildFestivalSchema } from './schema';

export default async function TangoFestivalsMarathonsPage() {
  const festivals = await loadFestivals();
  const countries = buildCountryIndex(festivals);
  const schema = buildFestivalSchema(festivals);
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
              Tango Festivals & Marathons
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              Plan your next tango escape with a global calendar of festivals and marathons.
            </p>
          </header>

          {festivals.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
              No upcoming festivals found yet. Please check back soon.
            </div>
          ) : (
            <FestivalPageClient
              festivals={festivals}
              countries={countries}
              currentCountrySlug=""
              currentCitySlug=""
              enableAutoLocate
            />
          )}
        </div>
      </main>
    </>
  );
}
