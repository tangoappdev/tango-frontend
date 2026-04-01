'use client';

const CitySelect = ({ cities, activeSlug, onChange }) => {
  // Group cities by country when country data is available
  const grouped = cities.reduce((acc, city) => {
    const key = city.country || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(city);
    return acc;
  }, {});

  const countries = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  const useGroups = countries.length > 1;

  return (
    <div className="w-full sm:w-1/2">
      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
        City
      </label>
      <div className="mt-2 rounded-full border border-white/10 bg-[#2a2d33] px-4 py-2">
        <select
          value={activeSlug}
          onChange={(event) => {
            if (onChange) {
              onChange(event.target.value);
              return;
            }
            window.location.href = `/milonga-guide/${event.target.value}`;
          }}
          className="w-full bg-transparent text-sm font-semibold text-white outline-none"
        >
          {useGroups
            ? countries.map((country) => (
                <optgroup key={country} label={country}>
                  {grouped[country].map((city) => (
                    <option key={city.slug} value={city.slug} className="bg-[#2a2d33] text-white">
                      {city.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : cities.map((city) => (
                <option key={city.slug} value={city.slug} className="bg-[#2a2d33] text-white">
                  {city.label}
                </option>
              ))}
        </select>
      </div>
    </div>
  );
};

export default CitySelect;
