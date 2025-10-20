'use client';

import Header from '@/components/Header';
import TangoPlayer from '../../components/TangoPlayer';

export default function PlayerPage() {
  return (
    <>
      <Header />
      <div
        className="relative flex items-center justify-center bg-[#30333a] p-2 sm:p-8"
        style={{ minHeight: 'calc(100vh - var(--app-header-height, 5rem))' }}
      >
        <TangoPlayer />
      </div>
    </>
  );
}
