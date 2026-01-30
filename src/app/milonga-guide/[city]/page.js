import Header from '@/components/Header';
import CityGuide from '../CityGuide';
import CitySelect from '../CitySelect';

const CITIES = [
  { slug: 'new-york', label: 'New York' },
  { slug: 'buenos-aires', label: 'Buenos Aires' },
  { slug: 'san-francisco', label: 'San Francisco & No. California' },
  { slug: 'berlin', label: 'Berlin' },
  { slug: 'sao-paulo', label: 'Sao Paulo' },
  { slug: 'athens', label: 'Athens' },
  { slug: 'turkiye', label: 'Turkiye' },
  { slug: 'england', label: 'England' },
  { slug: 'miami', label: 'Miami' },
  { slug: 'paris', label: 'Paris' },
  { slug: 'rome', label: 'Rome' },
  { slug: 'austin', label: 'Austin' },
];

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
              <CitySelect activeSlug={citySlug} cities={CITIES} />
            </div>
          </header>

          <CityGuide citySlug={citySlug} />
        </div>
      </main>
    </>
  );
}
