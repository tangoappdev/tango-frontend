'use client';

const CitySelect = ({ cities, activeSlug }) => {
  return (
    <div className="w-full">
      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
        City
      </label>
      <div className="mt-2 rounded-2xl border border-white/10 bg-[#2a2d33] px-3 py-2">
        <select
          value={activeSlug}
          onChange={(event) => {
            window.location.href = `/milonga-guide/${event.target.value}`;
          }}
          className="w-full bg-transparent text-sm font-semibold text-white outline-none"
        >
          {cities.map((city) => (
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
