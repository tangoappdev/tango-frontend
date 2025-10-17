'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const API_URL = '/api/billing/subscription';

const DEFAULT_STATE = Object.freeze({
  customerId: null,
  subscription: null,
  invoices: [],
  upcomingInvoice: null,
  planOptions: [],
  portalUrl: null,
});

export function useSubscription({ autoFetch = true } = {}) {
  const [data, setData] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [mutatingAction, setMutatingAction] = useState(null);
  const abortRef = useRef(null);

  const fetchState = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to load subscription details');
      }
      setData((prev) => ({ ...prev, ...json }));
      return json;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      setError(err);
      throw err;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  const runAction = useCallback(
    async (action, payload = {}) => {
      setMutatingAction(action);
      setError(null);
      try {
        const res = await fetch(API_URL, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || 'Subscription update failed');
        }
        setData((prev) => ({ ...prev, ...json }));
        return json;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setMutatingAction(null);
      }
    },
    []
  );

  const changePlan = useCallback(
    async (planId, options = {}) => {
      if (!planId) throw new Error('Plan ID is required');
      return runAction('change_plan', { planId, ...options });
    },
    [runAction]
  );

  const cancelSubscription = useCallback(
    async (options = {}) => runAction('cancel', options),
    [runAction]
  );

  const resumeSubscription = useCallback(
    async () => runAction('resume'),
    [runAction]
  );

  const pauseSubscription = useCallback(
    async (options = {}) => runAction('pause', options),
    [runAction]
  );

  const resumePause = useCallback(
    async () => runAction('resume_pause'),
    [runAction]
  );

  const updatePaymentMethod = useCallback(
    async () => runAction('update_payment_method'),
    [runAction]
  );

  const refresh = useCallback(async () => runAction('refresh'), [runAction]);

  useEffect(() => {
    if (!autoFetch) return undefined;
    fetchState().catch(() => {});
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [autoFetch, fetchState]);

  const currentPlan = useMemo(() => data?.subscription?.planId ?? null, [data]);
  const isCanceled = useMemo(
    () => !!data?.subscription?.cancelAtPeriodEnd,
    [data]
  );
  const isPaused = useMemo(
    () => !!data?.subscription?.pauseCollection,
    [data]
  );

  return {
    data,
    subscription: data?.subscription ?? null,
    invoices: data?.invoices ?? [],
    upcomingInvoice: data?.upcomingInvoice ?? null,
    planOptions: data?.planOptions ?? [],
    customerId: data?.customerId ?? null,
    portalUrl: data?.portalUrl ?? null,
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
    updatePaymentMethod,
    refresh,
  };
}

export default useSubscription;
