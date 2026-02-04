'use client';

import { useState } from 'react';

const ShareButtons = ({ url }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      setCopied(false);
    }
  };

  const encoded = encodeURIComponent(url);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full border border-white/10 px-4 py-2 text-xs text-gray-200 hover:border-white/30"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <a
        href={`https://wa.me/?text=${encoded}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-white/10 px-4 py-2 text-xs text-gray-200 hover:border-white/30"
      >
        WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-white/10 px-4 py-2 text-xs text-gray-200 hover:border-white/30"
      >
        Facebook
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encoded}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-white/10 px-4 py-2 text-xs text-gray-200 hover:border-white/30"
      >
        X / Twitter
      </a>
    </div>
  );
};

export default ShareButtons;

