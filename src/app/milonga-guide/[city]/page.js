import { redirect, notFound } from 'next/navigation';
import Header from '@/components/Header';
import LocationSelect from '../LocationSelect';
import CountryGuide from '../CountryGuide';
import { getCities, getCountries, getCountryBySlug } from '../cities';

export const revalidate = 86400;

export async function generateStaticParams() {
  const countries = await getCountries();
  return countries.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }) {
  const { city: segment } = await params;
  const country = await getCountryBySlug(segment);
  if (!country) {
    return {
      title: 'Milonga Guide | Tango Milongas & Practicas',
      description: 'Find tango milongas and practicas worldwide.',
    };
  }
  return {
    title: `Tango Milongas & Practicas in ${country.label} | Virtual Tango DJ`,
    description: `Find upcoming tango milongas and practicas across ${country.label}. Curated listings updated daily.`,
  };
}

export default async function CountryPage({ params }) {
  const { city: segment } = await params;
  const [countries, cities] = await Promise.all([getCountries(), getCities()]);

  // Check if this is a known country slug
  const country = countries.find((c) => c.slug === segment);

  if (!country) {
    // Check if it's an old city slug → 301 redirect to new hierarchical URL
    const cityEntry = cities.find((c) => c.slug === segment);
    if (cityEntry?.countrySlug) {
      redirect(`/milonga-guide/${cityEntry.countrySlug}/${cityEntry.slug}`);
    }
    notFound();
  }

  const citiesInCountry = cities.filter((c) => c.countrySlug === segment);

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
              Milongas & Practicas in {country.label}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              Curated listings from trusted tango guides. Events update daily and are grouped by date.
            </p>
            <div className="mt-5 sm:mt-6">
              <LocationSelect
                countries={countries}
                cities={cities}
                activeCountrySlug={segment}
                activeCitySlug={null}
              />
            </div>
          </header>

          {citiesInCountry.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {citiesInCountry.map((c) => (
                <a
                  key={c.slug}
                  href={`/milonga-guide/${segment}/${c.slug}`}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                >
                  {c.label}
                </a>
              ))}
            </div>
          )}

          <CountryGuide countrySlug={segment} />
        </div>
      </main>
    </>
  );
}
