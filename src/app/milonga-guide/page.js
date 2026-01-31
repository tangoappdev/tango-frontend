import Header from '@/components/Header';
import CityGuide from './CityGuide';
import CitySelect from './CitySelect';
import AutoCityRedirect from './AutoCityRedirect';

const CITIES = [
  { slug: 'new-york', label: 'New York' },
  { slug: 'buenos-aires', label: 'Buenos Aires' },
  { slug: 'san-francisco', label: 'San Francisco' },
  { slug: 'berlin', label: 'Berlin' },
  { slug: 'sao-paulo', label: 'Sao Paulo' },
  { slug: 'athens', label: 'Athens' },
  { slug: 'turkiye', label: 'Turkiye' },
  { slug: 'england', label: 'England' },
  { slug: 'miami', label: 'Miami' },
  { slug: 'paris', label: 'Paris' },
  { slug: 'rome', label: 'Rome' },
  { slug: 'austin', label: 'Austin' },
  { slug: 'barcelona', label: 'Barcelona' },
];

export default async function MilongaGuideIndexPage() {
  const defaultCity = 'new-york';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-6 text-white sm:px-10 sm:py-12">
        <AutoCityRedirect enabled />
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-7 sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
              Milonga Guide
            </p>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
              Upcoming milongas & practicas
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              Curated listings from trusted tango guides. Events update daily and are grouped by date.
            </p>
            <div className="mt-5 sm:mt-6">
              <CitySelect activeSlug={defaultCity} cities={CITIES} />
            </div>
          </header>

          <CityGuide citySlug={defaultCity} />
        </div>
      </main>
    </>
  );
}
