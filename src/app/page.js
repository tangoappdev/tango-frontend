'use client';

import Header from '@/components/Header';
import TangoPlayer from '@/components/TangoPlayer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main
        className="flex flex-col items-center justify-center p-2 sm:p-8 bg-[#30333a]"
        style={{ minHeight: 'calc(100vh - var(--app-header-height, 5rem))' }}
      >
        <TangoPlayer />
      </main>
    </>
  );
}
