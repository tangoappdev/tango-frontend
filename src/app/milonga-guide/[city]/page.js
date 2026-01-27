import Header from '@/components/Header';
import Link from 'next/link';
import CityGuide from '../CityGuide';

const CITIES = [
  { slug: 'new-york', label: 'New York' },
  { slug: 'buenos-aires', label: 'Buenos Aires' },
];

function CityTabs({ activeSlug }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CITIES.map((city) => {
        const isActive = city.slug === activeSlug;
        return (
          <Link
            key={city.slug}
            href={`/milonga-guide/${city.slug}`}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              isActive
                ? 'bg-[#25edda] text-[#1f2126]'
                : 'border border-white/15 text-gray-200 hover:bg-white/5 hover:text-white'
            }`}
          >
            {city.label}
          </Link>
        );
      })}
    </div>
  );
}

export default async function MilongaGuideCityPage({ params }) {
  const citySlug = CITIES.some((city) => city.slug === params.city)
    ? params.city
    : 'new-york';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-12 text-white sm:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
              Milonga Guide
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Upcoming milongas & practicas</h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              Curated listings from trusted tango guides. Events update daily and are grouped by date.
            </p>
            <div className="mt-6">
              <CityTabs activeSlug={citySlug} />
            </div>
          </header>

          <CityGuide citySlug={citySlug} />
        </div>
      </main>
    </>
  );
}
