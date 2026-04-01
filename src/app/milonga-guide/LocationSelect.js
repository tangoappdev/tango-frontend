'use client';

const LocationSelect = ({ countries, cities, activeCountrySlug, activeCitySlug }) => {
  const citiesInCountry = activeCountrySlug
    ? cities.filter((c) => c.countrySlug === activeCountrySlug)
    : cities;

  const handleCountryChange = (e) => {
    window.location.href = `/milonga-guide/${e.target.value}`;
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    if (!val) {
      window.location.href = `/milonga-guide/${activeCountrySlug}`;
    } else {
      window.location.href = `/milonga-guide/${activeCountrySlug}/${val}`;
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="w-full sm:w-1/3">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
          Country
        </label>
        <div className="mt-2 rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2">
          <select
            value={activeCountrySlug || ''}
            onChange={handleCountryChange}
            className="w-full bg-transparent text-sm font-semibold text-white outline-none"
          >
            {countries.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-[#2a2d33] text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full sm:w-1/3">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
          City
        </label>
        <div className="mt-2 rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2">
          <select
            value={activeCitySlug || ''}
            onChange={handleCityChange}
            className="w-full bg-transparent text-sm font-semibold text-white outline-none"
          >
            <option value="" className="bg-[#2a2d33] text-white">
              All cities
            </option>
            {citiesInCountry.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-[#2a2d33] text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default LocationSelect;
