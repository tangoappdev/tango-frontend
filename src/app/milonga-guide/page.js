import Header from '@/components/Header';
import LocationSelect from './LocationSelect';
import AutoCityRedirect from './AutoCityRedirect';
import { getCities, getCountries } from './cities';

export const metadata = {
  title: 'Milonga Guide | Tango Milongas & Practicas Worldwide',
  description:
    'Find tango milongas and practicas worldwide. Browse by country and city — curated listings updated daily.',
};

export default async function MilongaGuideIndexPage() {
  const [countries, cities] = await Promise.all([getCountries(), getCities()]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-6 text-white sm:px-10 sm:py-12">
        <AutoCityRedirect enabled />
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
              Milonga Guide
            </p>
            <h1 className="mt-3 text-xl font-semibold sm:text-3xl">
              Milongas & Practicas Worldwide
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              Curated listings from trusted tango guides. Select a country and city to get started.
            </p>
            <div className="mt-5 sm:mt-6">
              <LocationSelect
                countries={countries}
                cities={cities}
                activeCountrySlug={countries[0]?.slug || ''}
                activeCitySlug={null}
              />
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => {
              const countryCities = cities.filter((c) => c.countrySlug === country.slug);
              return (
                <a
                  key={country.slug}
                  href={`/milonga-guide/${country.slug}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
                >
                  <div className="text-sm font-semibold text-[#25edda]">{country.label}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {countryCities.map((c) => c.label).join(', ')}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
