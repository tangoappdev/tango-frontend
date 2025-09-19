'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';

const rows = [
  { label: 'Play tracks', free: 'Unlimited', pro: 'Unlimited' },
  { label: 'Skip song (within tanda)', free: '— Pro only', pro: 'Unlimited' },
  { label: 'Skip tanda (per hour)', free: '3 per hour', pro: 'Unlimited' },
  { label: 'Shuffle upcoming', free: '— Pro only', pro: 'Yes' },
  { label: 'Tanda length control', free: '— Pro only', pro: '3 or 4 (Tango)' },
  { label: 'Cortinas toggle', free: 'Yes', pro: 'Yes' },
  { label: 'Equalizer', free: '— Pro only', pro: 'Desktop EQ' },
  { label: 'Audio URL expiry', free: '1 hour', pro: '1 hour' },
];

export default function UpgradePage() {
  const { requireAuth } = useAuth();

  const handleUpgrade = () => {
    // Require sign-in, then send to a (future) checkout route.
    requireAuth(() => {
      // TODO: wire to your billing/checkout route when ready.
      // For now, send to a placeholder so the link works.
      window.location.href = '/api/billing/checkout'; 
    });
  };

  const TableRow = ({ label, free, pro }) => (
    <tr className="border-b border-white/10">
      <td className="py-3 pr-4 text-gray-200">{label}</td>
      <td className="py-3 px-4 text-center text-gray-300">{free}</td>
      <td className="py-3 pl-4 text-center text-white">{pro}</td>
    </tr>
  );

  return (
    <div className="min-h-[70vh] w-full px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-4xl bg-[#30333a] rounded-2xl p-6 shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d]">
        <h1 className="text-2xl md:text-3xl font-semibold text-white text-center mb-2">
          Go Pro for the full Milonga experience
        </h1>
        <p className="text-center text-gray-300 mb-8">
          All Pro-only buttons are visible in the player — unlock them by upgrading.
        </p>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left py-3 pl-4 pr-4 text-gray-400 font-medium">Feature</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Free</th>
                <th className="text-center py-3 pl-4 pr-4 text-gray-200 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => <TableRow key={r.label} {...r} />)}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleUpgrade}
            className="px-6 py-3 rounded-full text-black font-semibold bg-gradient-[145deg] from-[#25edda] to-[#23d9c8] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:shadow-[inset_5px_5px_10px_#131417,inset_-5px_-5px_10px_#4d525d]"
          >
            Upgrade to Pro
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-full text-gray-200 border border-white/15 hover:bg-white/5"
          >
            Keep exploring first
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Have questions? <Link href="/contact" className="underline text-[#25edda]">Contact us</Link>
        </p>
      </div>
    </div>
  );
}
