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
          <MilongaGuideEmbed />
          <TandaCarousel />
          <FestivalsEmbed />
          <TangoTubeCarousel />
        </div>
      </main>
    </>
  );
}




