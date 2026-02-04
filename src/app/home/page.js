import Header from '@/components/Header';
import Link from 'next/link';

export const metadata = {
  title: 'TangoApp | Your Tango Events Hub',
  description:
    'Discover milongas, practicas, festivals, and marathons worldwide with TangoApp.',
};

export default function TangoAppHomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-10 text-white sm:px-10 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/80">
              TangoApp
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Your tango events hub
            </h1>
            <p className="mt-4 max-w-2xl text-base text-gray-300">
              Find milongas, practicas, festivals, and marathons across the world. Stay
              updated with curated listings and plan your next tango experience.
            </p>
          </header>

          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/milonga-guide"
              className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6 transition hover:border-white/20"
            >
              <h2 className="text-xl font-semibold text-white">Milonga Guide</h2>
              <p className="mt-2 text-sm text-gray-300">
                Daily listings of milongas and practicas by city, with map view and
                directions.
              </p>
              <span className="mt-4 inline-flex text-xs font-semibold text-[#25edda]">
                Explore milongas →
              </span>
            </Link>

            <Link
              href="/tango-festivals-marathons"
              className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6 transition hover:border-white/20"
            >
              <h2 className="text-xl font-semibold text-white">Festivals & Marathons</h2>
              <p className="mt-2 text-sm text-gray-300">
                Upcoming tango festivals and marathons, grouped by month with top picks.
              </p>
              <span className="mt-4 inline-flex text-xs font-semibold text-[#25edda]">
                Explore festivals →
              </span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

