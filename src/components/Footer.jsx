'use client';

import Link from 'next/link';

const primaryLinks = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/help', label: 'Help' },
];

const secondaryLinks = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/dmca', label: 'DMCA Policy' },
  { href: '/licensing', label: 'Licensing Info' },
];

export default function Footer() {
  const renderLinkRow = (links) => (
    <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-gray-400">
      {links.map((link, index) => (
        <span key={link.label} className="flex items-center gap-3">
          <Link
            href={link.href}
            className="transition-colors duration-200 hover:text-[#25edda]"
          >
            {link.label}
          </Link>
          {index < links.length - 1 && <span className="text-gray-600">|</span>}
        </span>
      ))}
    </div>
  );

  return (
    <footer className="w-full bg-[#2b2e34] border-t border-white/10 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        {renderLinkRow(primaryLinks)}
        {renderLinkRow(secondaryLinks)}
      </div>
    </footer>
  );
}

