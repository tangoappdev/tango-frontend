'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This component will automatically redirect from /admin to /admin/dashboard
export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  // Render a loading state while the redirect happens
  return (
    <div className="min-h-screen bg-[#222429] flex items-center justify-center">
      <p className="text-white">Redirecting to dashboard...</p>
    </div>
  );
}
