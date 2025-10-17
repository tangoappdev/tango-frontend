'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import Header from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import useSubscription from '@/hooks/useSubscription';

const formatterCache = new Map();

function formatCurrency(amount, currency = 'usd', locale = 'en-US') {
  if (amount == null) return '--';
  const key = `${locale}-${currency}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
      })
    );
  }
  return formatterCache.get(key).format(amount);
}

function formatDate(timestamp, locale = 'en-US') {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: undefined,
  }).format(date);
}

function StatusPill({ children, tone = 'default' }) {
  const toneClass = {
    default: 'bg-white/10 text-white',
    success: 'bg-emerald-500/20 text-emerald-200',
    warning: 'bg-amber-500/20 text-amber-200',
    danger: 'bg-rose-500/20 text-rose-200',
  }[tone];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toneClass}`}>
      {children}
    </span>
  );
}

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    requireAuth,
    refreshMe,
  } = useAuth();

  const {
    subscription,
    invoices,
    upcomingInvoice,
    planOptions,
    currentPlan,
    isCanceled,
    isPaused,
    loading,
    error,
    mutatingAction,
    changePlan,
    cancelSubscription,
    resumeSubscription,
    pauseSubscription,
    resumePause,
    openBillingPortal,
    updatePaymentMethod,
    refresh,
  } = useSubscription();

  const currentPlanDetails = useMemo(() => {
    if (!currentPlan) {
      return planOptions.find((plan) => plan.id === 'free') ?? null;
    }
    return (
      planOptions.find((plan) => plan.id === currentPlan) ??
      planOptions.find((plan) => plan.priceId === subscription?.priceId) ??
      null
    );
  }, [currentPlan, planOptions, subscription?.priceId]);

  const handleRequireAuth = useCallback(() => {
    requireAuth(() => {
      router.replace('/manage_subscription');
    });
  }, [requireAuth, router]);

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/player');
    }
  }, [router]);

  const handleChangePlan = useCallback(
    async (planId) => {
      try {
        await changePlan(planId);
        await refreshMe();
      } catch (err) {
        console.error(err);
        alert(err?.message || 'Unable to change plan right now.');
      }
    },
    [changePlan, refreshMe]
  );

  const handleCancel = useCallback(async () => {
    if (!window.confirm('Cancel at the end of the current period?')) return;
    try {
      await cancelSubscription({ cancelNow: false });
      await refreshMe();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Unable to cancel subscription.');
    }
  }, [cancelSubscription, refreshMe]);

  const handleResume = useCallback(async () => {
    try {
      await resumeSubscription();
      await refreshMe();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Unable to resume subscription.');
    }
  }, [resumeSubscription, refreshMe]);

  const handlePause = useCallback(async () => {
    if (!window.confirm('Pause billing and access immediately?')) return;
    try {
      await pauseSubscription({ behavior: 'mark_uncollectible' });
      await refreshMe();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Unable to pause subscription.');
    }
  }, [pauseSubscription, refreshMe]);

  const handleResumePause = useCallback(async () => {
    try {
      await resumePause();
      await refreshMe();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Unable to resume billing.');
    }
  }, [resumePause, refreshMe]);

  const handleUpdatePaymentMethod = useCallback(async () => {
    try {
      const result = await openBillingPortal();
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      throw new Error('Billing portal URL missing');
    } catch (err) {
      console.warn('Billing portal fallback to API', err);
      try {
        const fallback = await updatePaymentMethod();
        if (fallback?.portalUrl) {
          window.location.href = fallback.portalUrl;
          return;
        }
        throw err;
      } catch (fallbackError) {
        console.error(fallbackError);
        alert(fallbackError?.message || 'Unable to open the billing portal.');
      }
    }
  }, [openBillingPortal, updatePaymentMethod]);

  const isMutating = Boolean(mutatingAction);

  const actionDisabled = (action) =>
    loading || isMutating || mutatingAction === action;

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#30333a]">
        <Header />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center text-white">
          <p className="text-lg font-medium text-gray-300">Checking your account…</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-[#30333a]">
        <Header />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center text-white">
          <h1 className="text-3xl font-semibold">Sign in to manage your subscription</h1>
          <p className="text-gray-400">
            You need an account to view or update billing details.
          </p>
          <button
            onClick={handleRequireAuth}
            className="rounded-full bg-[#25edda] px-6 py-3 text-base font-semibold text-[#1f2126] transition-colors duration-200 hover:bg-[#23d9c8]"
          >
            Sign in
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#30333a]">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="rounded-full border border-white/15 p-2 text-gray-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Account &amp; Billing</h1>
            <p className="text-gray-400">
              Review your plan, update billing details, and download invoices.
            </p>
          </div>
        </div>

      <section className="grid gap-6 md:grid-cols-[1.75fr_minmax(0,1fr)]">
        <div className="rounded-3xl border border-white/10 bg-[#30333a] p-6 shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">Current Plan</p>
              <h2 className="text-2xl font-semibold">
                {currentPlanDetails?.label || 'Free'}
              </h2>
              {subscription?.amount?.amountDecimal != null && (
                <p className="text-gray-300">
                  {formatCurrency(
                    subscription.amount.amountDecimal,
                    subscription.amount.currency
                  )}{' '}
                  / {subscription?.interval ?? 'lifetime'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {subscription?.isActive ? (
                <StatusPill tone="success">Active</StatusPill>
              ) : (
                <StatusPill tone="warning">{subscription?.status || 'Inactive'}</StatusPill>
              )}
              {isCanceled && <StatusPill tone="danger">Cancels soon</StatusPill>}
              {isPaused && <StatusPill tone="warning">Paused</StatusPill>}
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Renews</dt>
              <dd className="text-base text-white">
                {formatDate(subscription?.currentPeriodEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-400">Trial Ends</dt>
              <dd className="text-base text-white">
                {formatDate(subscription?.trialEnd)}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleUpdatePaymentMethod}
              disabled={actionDisabled('update_payment_method')}
              className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-gray-200 transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutatingAction === 'update_payment_method' || mutatingAction === 'open_billing_portal'
                ? 'Opening…'
                : 'Update payment method'}
            </button>
            {subscription?.isActive ? (
              <>
                {isPaused ? (
                  <button
                    onClick={handleResumePause}
                    disabled={actionDisabled('resume_pause')}
                    className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-gray-200 transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutatingAction === 'resume_pause' ? 'Resuming…' : 'Resume billing'}
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    disabled={actionDisabled('pause')}
                    className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-gray-200 transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutatingAction === 'pause' ? 'Pausing…' : 'Pause billing'}
                  </button>
                )}
                {isCanceled ? (
                  <button
                    onClick={handleResume}
                    disabled={actionDisabled('resume')}
                    className="rounded-full bg-[#25edda] px-5 py-2 text-sm font-semibold text-[#1f2126] transition-colors duration-200 hover:bg-[#23d9c8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutatingAction === 'resume' ? 'Resuming…' : 'Restore subscription'}
                  </button>
                ) : (
                  <button
                    onClick={handleCancel}
                    disabled={actionDisabled('cancel')}
                    className="rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutatingAction === 'cancel' ? 'Cancelling…' : 'Cancel plan'}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => handleChangePlan('pro-monthly')}
                disabled={actionDisabled('change_plan')}
                className="rounded-full bg-[#25edda] px-5 py-2 text-sm font-semibold text-[#1f2126] transition-colors duration-200 hover:bg-[#23d9c8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutatingAction === 'change_plan' ? 'Updating…' : 'Upgrade to Pro'}
              </button>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-rose-300">
              {error?.message || 'Something went wrong. Please try again.'}
            </p>
          )}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-[#30333a] p-6 shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
          <h3 className="text-xl font-semibold">Switch plans</h3>
          <p className="mt-1 text-sm text-gray-400">
            Choose the plan that fits you best. Changes take effect immediately.
          </p>
          <div className="mt-5 space-y-3">
            {planOptions.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const isDisabled =
                actionDisabled('change_plan') || isCurrent || !plan.priceId;
              return (
                <button
                  key={plan.id}
                  onClick={() => handleChangePlan(plan.id)}
                  disabled={isDisabled}
                  className={`flex w-full flex-col rounded-2xl border border-white/10 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed ${
                    isCurrent ? 'bg-[#25edda]/10 text-[#25edda]' : 'text-gray-100'
                  }`}
                >
                  <span className="text-sm font-semibold">{plan.label}</span>
                  <span className="text-xs text-gray-400">
                    {plan.amountDecimal != null
                      ? `${formatCurrency(plan.amountDecimal, plan.currency)}${
                          plan.interval ? ` / ${plan.interval}` : ''
                        }`
                      : 'Free'}
                  </span>
                  {plan.description && (
                    <span className="mt-1 text-xs text-gray-400">{plan.description}</span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => refresh().catch(() => {})}
            disabled={actionDisabled('refresh')}
            className="mt-6 w-full rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-gray-200 transition-colors duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutatingAction === 'refresh' ? 'Refreshing…' : 'Refresh details'}
          </button>
        </aside>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#30333a] p-6 shadow-[inset_3px_3px_8px_#222429,inset_-3px_-3px_8px_#3e424b]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Billing history</h3>
            <p className="text-sm text-gray-400">
              Receipts and invoices from the last year.
            </p>
          </div>
          <button
            onClick={() => refresh().catch(() => {})}
            disabled={actionDisabled('refresh')}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutatingAction === 'refresh' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-100">
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    {loading ? 'Loading invoices…' : 'No invoices yet.'}
                  </td>
                </tr>
              )}
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-4">{formatDate(invoice.created)}</td>
                  <td className="px-4 py-4">
                    <StatusPill
                      tone={
                        invoice.status === 'paid'
                          ? 'success'
                          : invoice.status === 'open'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {invoice.status}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-4">
                    {formatCurrency(
                      invoice.total?.amountDecimal ?? invoice.total?.amount ?? 0,
                      invoice.total?.currency
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-3">
                      {invoice.invoicePdf && (
                        <Link
                          href={invoice.invoicePdf}
                          target="_blank"
                          className="text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                        >
                          PDF
                        </Link>
                      )}
                      {invoice.hostedInvoiceUrl && (
                        <Link
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          className="text-xs font-semibold text-[#25edda] hover:text-[#23d9c8]"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {upcomingInvoice && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
            <p className="font-semibold text-white">Next charge</p>
            <p>
              {formatCurrency(
                upcomingInvoice.total?.amountDecimal ?? upcomingInvoice.total?.amount,
                upcomingInvoice.total?.currency
              )}{' '}
              on {formatDate(upcomingInvoice.periodStart)} for the upcoming period.
            </p>
          </div>
        )}
      </section>
    </main>
  </div>
  );
}
