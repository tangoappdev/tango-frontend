import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import CityGuide from '../../CityGuide';
import LocationSelect from '../../LocationSelect';
import { getCities, getCountries, getCityBySlug } from '../../cities';

export const revalidate = 86400;

export async function generateStaticParams() {
  const cities = await getCities();
  return cities
    .filter((c) => c.countrySlug)
    .map((c) => ({ city: c.countrySlug, subcity: c.slug }));
}

export async function generateMetadata({ params }) {
  const { subcity: citySlug } = await params;
  const cityEntry = await getCityBySlug(citySlug);
  if (!cityEntry) {
    return {
      title: 'Milonga Guide | Tango Milongas & Practicas',
      description: 'Find tango milongas and practicas worldwide.',
    };
  }
  const location = cityEntry.country
    ? `${cityEntry.label}, ${cityEntry.country}`
    : cityEntry.label;
  return {
    title: `Tango Milongas & Practicas in ${cityEntry.label} | Virtual Tango DJ`,
    description: `Find upcoming tango milongas and practicas in ${location}. Curated listings updated daily — dates, venues, and times.`,
  };
}

export default async function CityPage({ params }) {
  const { city: countrySlug, subcity: citySlug } = await params;

  const [countries, cities, cityEntry] = await Promise.all([
    getCountries(),
    getCities(),
    getCityBySlug(citySlug),
  ]);

  if (!cityEntry) notFound();

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
              Milongas & Practicas in {cityEntry.label}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              Curated listings from trusted tango guides. Events update daily and are grouped by date.
            </p>
            <div className="mt-5 sm:mt-6">
              <LocationSelect
                countries={countries}
                cities={cities}
                activeCountrySlug={countrySlug}
                activeCitySlug={citySlug}
              />
            </div>
          </header>

          <CityGuide citySlug={citySlug} />
        </div>
      </main>
    </>
  );
}
