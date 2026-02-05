import Header from '@/components/Header';
import MilongaGuideEmbed from './MilongaGuideEmbed';
import FestivalsEmbed from './FestivalsEmbed';
import TandaCarousel from './TandaCarousel';
import TangoTubeCarousel from './TangoTubeCarousel';

export const metadata = {
  title: 'TangoApp | Tango Made Easy',
  description:
    'Find milongas, practicas, festivals, marathons, and teachers worldwide, plus listen to tandas with Virtual Tango DJ.',
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
              Tango Made Easy
            </h1>
            <p className="mt-4 max-w-3xl text-base text-gray-300">
              Find milongas and festivals around the world and enjoy the best tandas with Virtual Tango DJ.
            </p>
          </header>

          <MilongaGuideEmbed />
          <div className="mt-14">
            <TandaCarousel />
          </div>
          <FestivalsEmbed />
          <TangoTubeCarousel />
        </div>
      </main>
    </>
  );
}




