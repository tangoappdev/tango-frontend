import Header from '@/components/Header';
import CityGuide from '../CityGuide';
import CitySelect from '../CitySelect';

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

const buildTitle = (cityLabel) => `Milonga Guide | ${cityLabel}`;

export async function generateMetadata({ params }) {
  const { city } = await params;
  const cityEntry = CITIES.find((item) => item.slug === city);
  if (!cityEntry) {
    return {
      title: 'Milonga Guide | Upcoming milongas & practicas',
      description:
        'Find upcoming tango milongas and practicas by city. Curated listings from trusted tango guides, updated daily.',
    };
  }
  return {
    title: buildTitle(cityEntry.label),
    description: `Upcoming milongas and practicas in ${cityEntry.label}, updated daily.`,
  };
}

export default async function MilongaGuideCityPage({ params }) {
  const { city } = await params;
  const citySlug = CITIES.some((item) => item.slug === city) ? city : 'new-york';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-6 text-white sm:px-10 sm:py-12">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
              Milonga Guide
            </p>
            <h1 className="mt-3 text-xl font-semibold sm:text-3xl">
              Milongas & Practicas in {CITIES.find((item) => item.slug === citySlug)?.label || 'your city'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              Curated listings from trusted tango guides. Events update daily and are grouped by date.
            </p>
            <div className="mt-5 sm:mt-6">
              <CitySelect activeSlug={citySlug} cities={CITIES} />
            </div>
          </header>

          <CityGuide citySlug={citySlug} />
        </div>
      </main>
    </>
  );
}
