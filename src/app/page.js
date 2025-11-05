'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRightIcon,
  MusicalNoteIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Header from '@/components/Header';

const sellingPoints = [
  {
    icon: SparklesIcon,
    title: 'Smart tandas in seconds',
    description: 'Generate curated tandas tailored to your vibe without spending hours digging through playlists.',
  },
  {
    icon: MusicalNoteIcon,
    title: 'Cortinas ready to go',
    description: 'Keep the energy up with fade-ready cortinas that slot right into your flow.',
  },
  {
    icon: ArrowRightIcon,
    title: 'Designed for live DJs',
    description: 'Stay focused on the floor while Virtual Tango DJ keeps the music seamless behind the scenes.',
  },
];

function SellingPoint({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-left text-gray-200 shadow-lg shadow-black/10 backdrop-blur">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25edda]/10 text-[#25edda]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-300">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const heroMainImage = {
    src: '/vtdj-mockup.png',
    alt: 'Virtual Tango DJ player interface displayed on laptop and phone screens.',
  };

  const productHighlights = [
    {
      title: 'Dial-in every tanda',
      description:
        'Adjust tanda length, orchestra focus, mood, and cortina style in seconds. The detailed settings screen keeps the flow under your control without slowing you down.',
      image: {
        src: '/phone%20settings2.png',
        alt: 'Virtual Tango DJ mobile settings screen highlighting customization options.',
        width: 657,
        height: 1147,
      },
    },
    {
      title: 'Stay ahead of the floor',
      description:
        'Preview upcoming tandas, reshuffle on the fly, and pin favorites. The live playlist view shows exactly what dancers will hear next so there are no surprises.',
      image: {
        src: '/phone%20queue2.png',
        alt: 'Virtual Tango DJ mobile queue management screen.',
        width: 657,
        height: 1159,
      },
    },
  ];

  return (
    <>
      <Header />
      <main
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#1f2126] px-6 py-16 text-center text-white sm:px-8"
        style={{ minHeight: 'calc(100vh - var(--app-header-height, 5rem))' }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[#30333a]" />
        <section className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex w-full max-w-2xl flex-col items-center gap-10 text-center lg:items-start lg:text-left">
            <p className="inline-flex rounded-full border border-[#25edda]/30 bg-[#25edda]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]">
              Virtual Tango DJ
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Your always-ready. <span className="text-[#25edda]">Tango DJ.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-gray-200 sm:text-lg">
              You get uniquely structured tanda playlists without spending hours planning. Every time you press play, it feels like a professional tango DJ built it just for you.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/player"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25edda] px-8 py-3 text-base font-semibold text-[#1f2126] transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25edda]"
              >
                Generate playlist
                <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/40"
              >
                See plans
              </Link>
            </div>
          </div>
          <div className="relative flex w-full max-w-2xl justify-center lg:justify-end">
            <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[2.5rem]">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src={heroMainImage.src}
                  alt={heroMainImage.alt}
                  fill
                  priority
                  className="object-contain"
                  sizes="(min-width: 1280px) 560px, (min-width: 768px) 420px, 90vw"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mt-16 grid w-full max-w-6xl gap-6 sm:grid-cols-3">
          {sellingPoints.map((point) => (
            <SellingPoint key={point.title} {...point} />
          ))}
        </section>

        <section className="relative z-10 mt-24 flex w-full max-w-6xl flex-col gap-16 rounded-[2.5rem] bg-[#30333a] px-8 py-16">
          {productHighlights.map((feature, index) => (
            <div
              key={feature.title}
              className={`flex flex-col-reverse items-center gap-12 lg:flex-row ${
                index % 2 !== 0 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <div className="w-full max-w-xl lg:w-1/2">
                <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur">
                  <Image
                    src={feature.image.src}
                    alt={feature.image.alt}
                    width={feature.image.width}
                    height={feature.image.height}
                    className="w-full h-auto"
                    priority={index === 0}
                  />
                </div>
              </div>
              <div className="w-full max-w-xl text-left lg:w-1/2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#25edda]/70">
                  {index === 0 ? 'Control Panel' : 'Live Playlist'}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white lg:text-3xl">{feature.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-gray-300 lg:text-lg">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
