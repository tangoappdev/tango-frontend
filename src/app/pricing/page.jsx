'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/solid';
import Header from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';

const plans = [
  {
    id: 'free',
    name: 'Free DJ',
    price: '$0',
    cadence: 'forever',
    description: 'Spin tandas, explore orchestras, and play full milongas with our core feature set.',
    features: [
      'Unlimited playback of public tandas',
      'Manual queue and reorder tools',
      'Auto-curated cortinas with every tanda',
      'Track metadata & orchestra histories',
    ],
    cta: 'Start for Free',
    secondary: 'Browse the player',
    secondaryHref: '/player',
  },
  {
    id: 'pro-monthly',
    name: 'Pro Monthly',
    price: '$7.99',
    cadence: 'per month',
    description: 'Unlock every control the player offers and keep the party flowing without limits.',
    features: [
      'Unlimited tanda skips & backtracks',
      'Desktop equalizer & advanced audio tweaks',
      'Shuffle upcoming tandas and instant play next',
      'Priority access to new cortinas and tandas',
    ],
    cta: 'Upgrade Monthly',
    highlight: true,
    tag: 'Most popular',
  },
  {
    id: 'pro-yearly',
    name: 'Pro Yearly',
    price: '$6.65',
    cadence: 'per month (billed $79.9 yearly)',
    description: 'Best value for resident DJs—everything in Pro with a 30% annual discount.',
    features: [
      'All Pro Monthly benefits included',
      '30% savings compared to monthly billing',
      'Early feature previews & feedback sessions',
      'Priority support for live events',
    ],
    cta: 'Upgrade Yearly',
    tag: '30% off',
  },
];

export default function PricingPage() {
  const { requireAuth } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [selectedPlanId]
  );

  const handleSelectPlan = (planId) => {
    if (planId === 'free') {
      window.location.href = '/signup';
      return;
    }
    requireAuth(() => {
      setCheckoutError(null);
      setSelectedPlanId(planId);
      setDialogOpen(true);
    }, 'upgrade');
  };

  const handleCloseDialog = () => {
    if (isRedirecting) return;
    setDialogOpen(false);
    setSelectedPlanId(null);
    setCheckoutError(null);
  };

  const handleConfirmCheckout = () => {
    if (!selectedPlan || isRedirecting) return;
    setIsRedirecting(true);
    setCheckoutError(null);
    fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: selectedPlan.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to start checkout.');
        }
        return res.json();
      })
      .then((data) => {
        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error('Checkout URL missing in response.');
        }
      })
      .catch((error) => {
        console.error('Failed to create checkout session', error);
        setCheckoutError(error.message || 'Something went wrong. Please try again.');
        setIsRedirecting(false);
      });
  };

  const renderPlan = (plan) => {
    const isHighlight = plan.highlight;
    const cardClasses = [
      'relative overflow-hidden rounded-3xl p-8 flex flex-col gap-6 shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] transition-transform duration-300 hover:-translate-y-1',
      isHighlight ? 'border-2 border-[#25edda]/60 shadow-[0_20px_45px_rgba(37,237,218,0.2)]' : '',
    ]
      .join(' ')
      .trim();

    return (
      <article key={plan.id} className={cardClasses}>
        {plan.tag && (
          <span className="absolute top-5 right-5 text-xs font-semibold uppercase tracking-wide bg-[#25edda] text-[#30333a] px-3 py-1 rounded-full">
            {plan.tag}
          </span>
        )}
        <header className="flex flex-col gap-2 text-left">
          <div className="flex items-center gap-2 text-[#25edda] uppercase text-xs tracking-widest">
            <SparklesIcon className="h-4 w-4" />
            PLAN
          </div>
          <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{plan.description}</p>
        </header>
        <div className="flex items-baseline gap-2 text-white">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-sm text-gray-400">/{plan.cadence}</span>
        </div>
        <ul className="mt-2 flex-1 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-gray-200">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#25edda]/10 text-[#25edda]">
                <CheckIcon className="h-4 w-4" />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSelectPlan(plan.id)}
            className={`w-full rounded-full px-6 py-3 font-semibold transition-all duration-200 ${
              isHighlight
                ? 'bg-gradient-[145deg] from-[#25edda] to-[#23d9c8] text-[#25edda] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] hover:shadow-[inset_5px_5px_10px_#131417,inset_-5px_-5px_10px_#4d525d]'
                : 'bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            {plan.cta}
          </button>
          {plan.secondary && plan.secondaryHref && (
            <Link
              href={plan.secondaryHref}
              className="w-full rounded-full px-6 py-3 text-center text-sm text-gray-300 border border-white/10 hover:bg-white/5"
            >
              {plan.secondary}
            </Link>
          )}
        </div>
      </article>
    );
  };

  return (
    <>
      <Header />
      <div className="min-h-[80vh] w-full px-4 py-12 md:py-5 flex flex-col items-center bg-[#30333a] text-white">
        <section className="w-full max-w-5xl text-center mb-12">
          <h1 className="mt-6 text-3xl md:text-4xl font-semibold text-white">
            Choose the plan that fits your Milonga
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-300 max-w-3xl mx-auto">
            Stay in tune with the dance floor. Start free, then unlock Pro features when you need unlimited skips,
            deeper controls, and premium support.
          </p>
        </section>
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
          {plans.map(renderPlan)}
        </div>
        <p className="mt-12 text-sm text-gray-400">
          Need a studio or event partnership?{' '}
          <Link href="/contact" className="text-[#25edda] underline hover:text-[#1fd2c1]">
            Contact us
          </Link>
        </p>
      </div>
      {dialogOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#282b31] p-6 shadow-[0_15px_50px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#25edda]">Confirm plan</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{selectedPlan.name}</h2>
              </div>
              <button
                onClick={handleCloseDialog}
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                disabled={isRedirecting}
              >
                Close
              </button>
            </div>
            <div className="mt-5 space-y-4 text-sm text-gray-300">
              <p>
                You’re about to unlock full Milonga controls with the{' '}
                <span className="font-semibold text-[#25edda]">{selectedPlan.name}</span> plan.
              </p>
              <div className="rounded-2xl border border-white/10 bg-[#30333a] p-4">
                <div className="flex items-center justify-between text-white">
                  <span>Billing</span>
                  <span className="text-lg font-semibold">
                    {selectedPlan.price}
                    <span className="ml-1 text-xs text-gray-400">/{selectedPlan.cadence}</span>
                  </span>
                </div>
                {selectedPlan.tag && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-[#25edda]">
                    {selectedPlan.tag}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-2">You’ll get</p>
                <ul className="space-y-2 text-gray-200">
                  {selectedPlan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#25edda]/20 text-[#25edda]">
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-gray-400">
                You’ll be redirected to our secure checkout. Once completed, your account upgrades
                instantly and your remaining free trial time is preserved.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {checkoutError && (
                <div className="sm:mr-auto sm:max-w-sm">
                  <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {checkoutError}
                  </p>
                </div>
              )}
              <button
                onClick={handleCloseDialog}
                className="rounded-full border border-white/10 px-5 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                disabled={isRedirecting}
              >
                Not now
              </button>
              <button
                onClick={handleConfirmCheckout}
                className="rounded-full bg-gradient-[145deg] from-[#25edda] to-[#23d9c8] px-6 py-2 text-sm font-semibold text-[#30333a] shadow-[3px_3px_5px_#131417,-3px_-3px_5px_#4d525d] transition-all duration-200 hover:shadow-[inset_5px_5px_10px_#131417,inset_-5px_-5px_10px_#4d525d] disabled:opacity-60"
                disabled={isRedirecting}
              >
                {isRedirecting ? 'Redirecting…' : <span className="text-[#25edda]">Proceed to checkout</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
