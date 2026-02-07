'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import Header from '@/components/Header';
import { auth } from '@/lib/firebaseClient';
import { useAuth } from '@/components/AuthProvider';
import { CheckCircleIcon, ExclamationCircleIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

const toMinutes = (timeValue) => {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(':').map((val) => parseInt(val, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const WEEKDAY_OPTIONS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const MONTHLY_WEEK_OPTIONS = [
  { label: '1st', value: 1 },
  { label: '2nd', value: 2 },
  { label: '3rd', value: 3 },
  { label: '4th', value: 4 },
  { label: '5th', value: 5 },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, emailVerified, sendEmailVerification, sendVerificationState } = useAuth();
  const avatarInputRef = useRef(null);
  const milongaImageInputRef = useRef(null);
  const festivalImageInputRef = useRef(null);
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    organizer: false,
    teacher: false,
    tangoDj: false,
    photoURL: '',
    emailVerified: false,
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [resetState, setResetState] = useState({ sending: false, message: '' });
  const [myEvents, setMyEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [activePanel, setActivePanel] = useState('');
  const [organizerMode, setOrganizerMode] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [milongaForm, setMilongaForm] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    eventType: 'milonga',
    frequencyType: 'one-time',
    weeklyDays: [],
    monthlyRules: [],
    venue: '',
    address: '',
    city: '',
    imageUrl: '',
    signedImageUrl: '',
    descriptionRaw: '',
  });
  const [festivalForm, setFestivalForm] = useState({
    title: '',
    city: '',
    country: '',
    startDate: '',
    endDate: '',
    dateText: '',
    eventType: 'festival',
    website: '',
    imageUrl: '',
    signedImageUrl: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState({
    milonga: false,
    festival: false,
  });

  const isOrganizer = profile.organizer === true;
  const canBeOrganizer = emailVerified;

  useEffect(() => {
    if (!user) return;
    let isActive = true;
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/account/profile', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load profile.');
        if (!isActive) return;
        setProfile({
          displayName: data?.profile?.displayName || '',
          email: data?.profile?.email || user?.email || '',
          organizer: !!data?.profile?.organizer,
          teacher: !!data?.profile?.teacher,
          tangoDj: !!data?.profile?.tangoDj,
          photoURL: data?.profile?.photoURL || user?.photoURL || '',
          emailVerified: !!data?.profile?.emailVerified,
        });
      } catch (error) {
        if (!isActive) return;
        setStatus({ type: 'error', message: error?.message || 'Failed to load profile.' });
      }
    };
    loadProfile();
    return () => {
      isActive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isActive = true;
    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await fetch('/api/organizer/events', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load events.');
        if (!isActive) return;
        setMyEvents(data?.events || []);
      } catch (error) {
        if (!isActive) return;
        setStatus({ type: 'error', message: error?.message || 'Failed to load events.' });
      } finally {
        if (isActive) setEventsLoading(false);
      }
    };
    loadEvents();
    return () => {
      isActive = false;
    };
  }, [user]);

  const handleProfileSave = async () => {
    setSavingProfile(true);
    setStatus({ type: '', message: '' });
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          organizer: profile.organizer,
          teacher: profile.teacher,
          tangoDj: profile.tangoDj,
          photoURL: profile.photoURL,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update profile.');
      setStatus({ type: 'success', message: 'Profile updated.' });
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setStatus({ type: '', message: '' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/account/upload-avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to upload avatar.');
      setProfile((prev) => ({ ...prev, photoURL: data?.photoURL || prev.photoURL }));
      if (auth.currentUser && data?.photoURL) {
        await updateProfile(auth.currentUser, { photoURL: data.photoURL });
      }
      setStatus({ type: 'success', message: 'Profile photo updated.' });
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Failed to upload avatar.' });
    }
  };

  const handleResetPassword = async () => {
    setResetState({ sending: true, message: '' });
    try {
      if (!user?.email) throw new Error('Your account is missing an email.');
      await sendPasswordResetEmail(auth, user.email);
      setResetState({ sending: false, message: 'Password reset email sent.' });
    } catch (error) {
      setResetState({
        sending: false,
        message: error?.message || 'Failed to send reset email.',
      });
    }
  };

  const handleSubmitMilonga = async () => {
    setSubmitting((prev) => ({ ...prev, milonga: true }));
    setStatus({ type: '', message: '' });
    try {
      const recurrence =
        milongaForm.frequencyType === 'weekly'
          ? { type: 'weekly', weeklyDays: milongaForm.weeklyDays }
          : milongaForm.frequencyType === 'monthly'
            ? { type: 'monthly', monthlyRules: milongaForm.monthlyRules }
            : null;
      const payload = {
        title: milongaForm.title.trim(),
        date: milongaForm.date,
        startTimeMinutes: toMinutes(milongaForm.startTime),
        endTimeMinutes: toMinutes(milongaForm.endTime),
        eventType: milongaForm.eventType,
        venue: milongaForm.venue.trim(),
        address: milongaForm.address.trim(),
        city: milongaForm.city.trim(),
        imageUrl: milongaForm.imageUrl.trim(),
        signedImageUrl: milongaForm.signedImageUrl.trim(),
        descriptionRaw: milongaForm.descriptionRaw.trim(),
        recurrence,
      };
      const res = editTarget
        ? await fetch('/api/organizer/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editTarget.id, kind: editTarget.kind, action: 'update', payload }),
          })
        : await fetch('/api/organizer/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'milonga', payload }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to submit milonga.');
      setStatus({
        type: 'success',
        message: editTarget ? 'Milonga updated.' : 'Milonga submitted. It will be posted after review.',
      });
      setMilongaForm({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        eventType: 'milonga',
        frequencyType: 'one-time',
        weeklyDays: [],
        monthlyRules: [],
        venue: '',
        address: '',
        city: '',
        imageUrl: '',
        signedImageUrl: '',
        descriptionRaw: '',
      });
      setEditTarget(null);
      setOrganizerMode('');
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Failed to submit milonga.' });
    } finally {
      setSubmitting((prev) => ({ ...prev, milonga: false }));
    }
  };

  const handleSubmitFestival = async () => {
    setSubmitting((prev) => ({ ...prev, festival: true }));
    setStatus({ type: '', message: '' });
    try {
      const payload = {
        title: festivalForm.title.trim(),
        city: festivalForm.city.trim(),
        country: festivalForm.country.trim(),
        startDate: festivalForm.startDate,
        endDate: festivalForm.endDate,
        dateText: festivalForm.dateText.trim(),
        website: festivalForm.website.trim(),
        imageUrl: festivalForm.imageUrl.trim(),
        signedImageUrl: festivalForm.signedImageUrl.trim(),
        description: festivalForm.description.trim(),
        eventType: festivalForm.eventType,
      };
      const res = editTarget
        ? await fetch('/api/organizer/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editTarget.id, kind: editTarget.kind, action: 'update', payload }),
          })
        : await fetch('/api/organizer/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'festival', payload }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to submit festival.');
      setStatus({
        type: 'success',
        message: editTarget ? 'Festival updated.' : 'Festival submitted. It will be posted after review.',
      });
      setFestivalForm({
        title: '',
        city: '',
        country: '',
        startDate: '',
        endDate: '',
        dateText: '',
        eventType: 'festival',
        website: '',
        imageUrl: '',
        signedImageUrl: '',
        description: '',
      });
      setEditTarget(null);
      setOrganizerMode('');
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Failed to submit festival.' });
    } finally {
      setSubmitting((prev) => ({ ...prev, festival: false }));
    }
  };

  const handleOrganizerImageUpload = async (file, type) => {
    if (!file) return;
    setStatus({ type: '', message: '' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/organizer/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to upload image.');
      if (type === 'milonga') {
        setMilongaForm((prev) => ({ ...prev, imageUrl: data?.imageUrl || prev.imageUrl }));
      } else {
        setFestivalForm((prev) => ({ ...prev, imageUrl: data?.imageUrl || prev.imageUrl }));
      }
      setStatus({ type: 'success', message: 'Image uploaded. It will be attached to your submission.' });
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Failed to upload image.' });
    }
  };

  const handlePauseToggle = async (eventItem) => {
    if (!eventItem || eventItem.kind === 'submission') return;
    setStatus({ type: '', message: '' });
    try {
      const action = eventItem.status === 'paused' ? 'resume' : 'pause';
      const res = await fetch('/api/organizer/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventItem.id, kind: eventItem.kind, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update event.');
      const updated = await fetch('/api/organizer/events', { cache: 'no-store' });
      const updatedData = await updated.json();
      if (updated.ok) setMyEvents(updatedData?.events || []);
      setStatus({ type: 'success', message: action === 'pause' ? 'Event paused.' : 'Event resumed.' });
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Failed to update event.' });
    }
  };

  const openEdit = (eventItem) => {
    if (!eventItem) return;
    setEditTarget({ id: eventItem.id, kind: eventItem.kind });
    const isFestivalSubmission =
      eventItem.kind === 'submission' && eventItem.submissionType === 'festival';
    if (eventItem.kind === 'milonga' || (eventItem.kind === 'submission' && !isFestivalSubmission)) {
      const startTime = typeof eventItem.startTimeMinutes === 'number'
        ? `${String(Math.floor(eventItem.startTimeMinutes / 60)).padStart(2, '0')}:${String(eventItem.startTimeMinutes % 60).padStart(2, '0')}`
        : '';
      const endTime = typeof eventItem.endTimeMinutes === 'number'
        ? `${String(Math.floor(eventItem.endTimeMinutes / 60)).padStart(2, '0')}:${String(eventItem.endTimeMinutes % 60).padStart(2, '0')}`
        : '';
      setMilongaForm((prev) => ({
        ...prev,
        title: eventItem.title || '',
        date: eventItem.date || '',
        startTime,
        endTime,
        eventType: eventItem.eventType || 'milonga',
        frequencyType: eventItem.recurrence?.type || 'one-time',
        weeklyDays: eventItem.recurrence?.weeklyDays || [],
        monthlyRules: eventItem.recurrence?.monthlyRules || [],
        venue: eventItem.venue || '',
        address: eventItem.address || '',
        city: eventItem.city || '',
        imageUrl: eventItem.imageUrl || '',
        signedImageUrl: '',
        descriptionRaw: eventItem.descriptionRaw || '',
      }));
      setOrganizerMode('milonga');
      setActivePanel('organizer');
      return;
    }
    setFestivalForm((prev) => ({
      ...prev,
      title: eventItem.title || '',
      city: eventItem.city || '',
      country: eventItem.country || '',
      startDate: eventItem.date || '',
      endDate: eventItem.endDate || '',
      dateText: '',
      eventType: eventItem.eventType || 'festival',
      website: eventItem.website || '',
      imageUrl: eventItem.imageUrl || '',
      signedImageUrl: '',
      description: eventItem.description || '',
    }));
    setOrganizerMode('festival');
    setActivePanel('organizer');
  };

  const statusTone =
    status.type === 'success'
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
      : 'border-rose-400/40 bg-rose-500/10 text-rose-100';

  const canSubmitMilonga = useMemo(() => {
    const hasRecurrence =
      milongaForm.frequencyType === 'weekly'
        ? milongaForm.weeklyDays.length > 0
        : milongaForm.frequencyType === 'monthly'
          ? milongaForm.monthlyRules.length > 0
          : true;
    return (
      milongaForm.title.trim() &&
      milongaForm.date &&
      milongaForm.eventType &&
      hasRecurrence &&
      canBeOrganizer &&
      profile.organizer
    );
  }, [
    milongaForm.title,
    milongaForm.date,
    milongaForm.eventType,
    milongaForm.frequencyType,
    milongaForm.weeklyDays,
    milongaForm.monthlyRules,
    canBeOrganizer,
    profile.organizer,
  ]);

  const canSubmitFestival = useMemo(() => {
    return (
      festivalForm.title.trim() &&
      (festivalForm.startDate || festivalForm.dateText.trim()) &&
      canBeOrganizer &&
      profile.organizer
    );
  }, [
    festivalForm.title,
    festivalForm.startDate,
    festivalForm.dateText,
    canBeOrganizer,
    profile.organizer,
  ]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#30333a] px-6 py-10 text-white sm:px-10">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-gray-300">Loading account...</p>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#30333a] px-6 py-10 text-white sm:px-10">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            <h1 className="text-3xl font-semibold">Account</h1>
            <p className="text-gray-300">Please sign in to manage your TangoApp account.</p>
            <button
              onClick={() => router.push('/login?next=/account')}
              className="rounded-full border border-[#25edda] px-5 py-2 text-sm font-semibold text-[#25edda]"
            >
              Sign in
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#30333a] px-6 py-10 text-white sm:px-10">
        <div className="mx-auto w-full max-w-5xl space-y-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#25edda]/80">
              Account
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Manage your TangoApp account</h1>
          </div>

          {status.message && (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone}`}>
              {status.message}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            <button
              onClick={() => setActivePanel('profile')}
              className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6 text-left transition hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Personal information</h2>
                  <p className="mt-2 text-sm text-gray-300">
                    Manage your name, photo, and organizer status.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
                  Edit
                </span>
              </div>
            </button>
            <button
              onClick={() => setActivePanel('password')}
              className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6 text-left transition hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Password</h2>
                  <p className="mt-2 text-sm text-gray-300">
                    Send a reset email to update your password.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
                  Edit
                </span>
              </div>
            </button>
            <button
              onClick={() => setActivePanel('billing')}
              className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6 text-left transition hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Payment & subscriptions</h2>
                  <p className="mt-2 text-sm text-gray-300">
                    Manage billing details and subscription status.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
                  {profile.organizer ? 'Open' : 'Locked'}
                </span>
              </div>
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#25edda]/80">
              Organizer
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <button
                onClick={() => {
                  if (!profile.organizer) return;
                  setEditTarget(null);
                  setOrganizerMode('');
                  setActivePanel('organizer');
                }}
                className={`rounded-3xl border border-white/10 bg-[#2a2d33] p-6 text-left transition ${
                  profile.organizer ? 'hover:border-white/20' : 'opacity-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Create a new event</h2>
                    <p className="mt-2 text-sm text-gray-300">
                      {profile.organizer
                        ? 'Submit milongas or festivals for approval.'
                        : 'Enable organizer to unlock submissions.'}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
                    Open
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActivePanel('submissions')}
                className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6 text-left transition hover:border-white/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">My events</h2>
                    <p className="mt-2 text-sm text-gray-300">
                      View your live and pending events.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
                    View
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="hidden">

          <section className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6">
            <h2 className="text-lg font-semibold">Personal information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-300">
                Display name
                <input
                  value={profile.displayName}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-2 text-white"
                />
              </label>
              <label className="text-sm text-gray-300">
                Email
                <input
                  value={profile.email}
                  disabled
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-2 text-gray-400"
                />
              </label>
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={profile.organizer}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, organizer: event.target.checked }))
                }
                className="h-4 w-4 accent-[#25edda]"
              />
              I am an organizer and want to submit events.
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleProfileSave}
                disabled={savingProfile}
                className="rounded-full bg-[#25edda] px-5 py-2 text-sm font-semibold text-[#1f232b] disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6">
            <h2 className="text-lg font-semibold">Password</h2>
            <p className="mt-2 text-sm text-gray-300">
              Send yourself a password reset email to update your login credentials.
            </p>
            <button
              onClick={handleResetPassword}
              disabled={resetState.sending}
              className="mt-4 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200"
            >
              {resetState.sending ? 'Sending...' : 'Send password reset email'}
            </button>
            {resetState.message && (
              <p className="mt-3 text-sm text-gray-300">{resetState.message}</p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6">
            <h2 className="text-lg font-semibold">Payment & subscriptions</h2>
            <p className="mt-2 text-sm text-gray-300">
              Manage billing details and subscription status.
            </p>
            <button
              onClick={() => router.push('/manage_subscription')}
              className="mt-4 rounded-full border border-[#25edda] px-4 py-2 text-sm font-semibold text-[#25edda]"
            >
              Go to billing portal
            </button>
          </section>

          {isOrganizer && (
            <section className="rounded-3xl border border-white/10 bg-[#2a2d33] p-6">
            <h2 className="text-lg font-semibold">Create a new event</h2>
              <p className="mt-2 text-sm text-gray-300">
                Submit new events. Each submission is reviewed before it appears publicly.
              </p>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#1f232b] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#25edda]/80">
                    Milonga / Practica
                  </h3>
                  <div className="mt-4 grid gap-3">
                    <input
                      placeholder="Title"
                      value={milongaForm.title}
                      onChange={(event) =>
                        setMilongaForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="date"
                        value={milongaForm.date}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, date: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <select
                        value={milongaForm.eventType}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, eventType: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      >
                        <option value="milonga">Milonga</option>
                        <option value="practica">Practica</option>
                      </select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="time"
                        value={milongaForm.startTime}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, startTime: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <input
                        type="time"
                        value={milongaForm.endTime}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, endTime: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                    </div>
                    <input
                      placeholder="Venue"
                      value={milongaForm.venue}
                      onChange={(event) =>
                        setMilongaForm((prev) => ({ ...prev, venue: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <input
                      placeholder="Address"
                      value={milongaForm.address}
                      onChange={(event) =>
                        setMilongaForm((prev) => ({ ...prev, address: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <input
                      placeholder="City"
                      value={milongaForm.city}
                      onChange={(event) =>
                        setMilongaForm((prev) => ({ ...prev, city: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <input
                      placeholder="Image URL"
                      value={milongaForm.imageUrl}
                      onChange={(event) =>
                        setMilongaForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <input
                      placeholder="Signed Image URL (we'll download it)"
                      value={milongaForm.signedImageUrl}
                      onChange={(event) =>
                        setMilongaForm((prev) => ({ ...prev, signedImageUrl: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <textarea
                      placeholder="Description"
                      rows={4}
                      value={milongaForm.descriptionRaw}
                      onChange={(event) =>
                        setMilongaForm((prev) => ({ ...prev, descriptionRaw: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSubmitMilonga}
                    disabled={!canSubmitMilonga || submitting.milonga}
                    className="mt-4 rounded-full bg-[#25edda] px-4 py-2 text-sm font-semibold text-[#1f232b] disabled:opacity-60"
                  >
                    {submitting.milonga ? 'Submitting...' : 'Submit milonga'}
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#1f232b] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#25edda]/80">
                    Festival / Marathon
                  </h3>
                  <div className="mt-4 grid gap-3">
                    <input
                      placeholder="Title"
                      value={festivalForm.title}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        placeholder="City"
                        value={festivalForm.city}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, city: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <input
                        placeholder="Country"
                        value={festivalForm.country}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, country: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="date"
                        value={festivalForm.startDate}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, startDate: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={festivalForm.endDate}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, endDate: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                    </div>
                    <input
                      placeholder="Date text (optional)"
                      value={festivalForm.dateText}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, dateText: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <input
                      placeholder="Website"
                      value={festivalForm.website}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, website: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <input
                      placeholder="Image URL"
                      value={festivalForm.imageUrl}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <input
                      placeholder="Signed Image URL (we'll download it)"
                      value={festivalForm.signedImageUrl}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, signedImageUrl: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                    <textarea
                      placeholder="Description"
                      rows={4}
                      value={festivalForm.description}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSubmitFestival}
                    disabled={!canSubmitFestival || submitting.festival}
                    className="mt-4 rounded-full bg-[#25edda] px-4 py-2 text-sm font-semibold text-[#1f232b] disabled:opacity-60"
                  >
                    {submitting.festival ? 'Submitting...' : 'Submit festival'}
                  </button>
                </div>
              </div>
            </section>
          )}
          </div>
        </div>
      </main>
      {activePanel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#2a2d33] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {activePanel === 'profile' && 'Personal information'}
                {activePanel === 'password' && 'Password'}
                {activePanel === 'billing' && 'Payment & subscriptions'}
                {activePanel === 'organizer' && 'Create a new event'}
                {activePanel === 'submissions' && 'My events'}
              </h2>
              <button
                onClick={() => setActivePanel('')}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 hover:text-white"
              >
                Close
              </button>
            </div>

            {activePanel === 'profile' && (
              <div className="mt-5 space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative">
                    <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      {profile.photoURL ? (
                        <img
                          src={profile.photoURL}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-400">
                          {(profile.displayName || profile.email || '?')[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#1f232b] text-white hover:text-[#25edda]"
                      title="Edit profile photo"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
                      className="hidden"
                    />
                    <div className="absolute -top-1 -left-1">
                      {emailVerified ? (
                        <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <ExclamationCircleIcon className="h-6 w-6 text-amber-400" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">
                      {emailVerified ? 'Verified account' : 'Unverified account'}
                    </p>
                    {!emailVerified && (
                      <button
                        onClick={() => sendEmailVerification?.()}
                        disabled={sendVerificationState?.sending}
                        className="mt-2 rounded-full border border-amber-400/60 px-3 py-1 text-xs font-semibold text-amber-200"
                      >
                        {sendVerificationState?.sending ? 'Sending...' : 'Verify account'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-gray-300">
                    Display name
                    <input
                      value={profile.displayName}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, displayName: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-2 text-white"
                    />
                  </label>
                  <label className="text-sm text-gray-300">
                    Email
                    <input
                      value={profile.email}
                      disabled
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-2 text-gray-400"
                    />
                  </label>
                </div>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">Organizer</p>
                      <p className="text-xs text-gray-400">Submit milongas and festivals.</p>
                    </div>
                    <button
                      type="button"
                      disabled={!canBeOrganizer}
                      onClick={() =>
                        setProfile((prev) => ({ ...prev, organizer: !prev.organizer }))
                      }
                      className={`h-7 w-12 rounded-full border border-white/10 p-1 transition ${
                        profile.organizer ? 'bg-[#25edda]' : 'bg-[#14161b]'
                      } ${!canBeOrganizer ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-white transition ${
                          profile.organizer ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">Teacher</p>
                      <p className="text-xs text-gray-400">Coming soon.</p>
                    </div>
                    <button
                      type="button"
                      disabled={!canBeOrganizer}
                      onClick={() =>
                        setProfile((prev) => ({ ...prev, teacher: !prev.teacher }))
                      }
                      className={`h-7 w-12 rounded-full border border-white/10 p-1 transition ${
                        profile.teacher ? 'bg-[#25edda]' : 'bg-[#14161b]'
                      } ${!canBeOrganizer ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-white transition ${
                          profile.teacher ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">Tango DJ</p>
                      <p className="text-xs text-gray-400">Coming soon.</p>
                    </div>
                    <button
                      type="button"
                      disabled={!canBeOrganizer}
                      onClick={() =>
                        setProfile((prev) => ({ ...prev, tangoDj: !prev.tangoDj }))
                      }
                      className={`h-7 w-12 rounded-full border border-white/10 p-1 transition ${
                        profile.tangoDj ? 'bg-[#25edda]' : 'bg-[#14161b]'
                      } ${!canBeOrganizer ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-white transition ${
                          profile.tangoDj ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {!canBeOrganizer && (
                  <p className="text-xs text-amber-200">
                    Verify your email to become an organizer.
                  </p>
                )}
                <button
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="rounded-full bg-[#25edda] px-5 py-2 text-sm font-semibold text-[#1f232b] disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}

            {activePanel === 'password' && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-gray-300">
                  Send yourself a password reset email to update your login credentials.
                </p>
                <button
                  onClick={handleResetPassword}
                  disabled={resetState.sending}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200"
                >
                  {resetState.sending ? 'Sending...' : 'Send password reset email'}
                </button>
                {resetState.message && (
                  <p className="text-sm text-gray-300">{resetState.message}</p>
                )}
              </div>
            )}

            {activePanel === 'billing' && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-gray-300">
                  Manage billing details and subscription status.
                </p>
                <button
                  onClick={() => router.push('/manage_subscription')}
                  className="rounded-full border border-[#25edda] px-4 py-2 text-sm font-semibold text-[#25edda]"
                >
                  Go to billing portal
                </button>
              </div>
            )}

            {activePanel === 'organizer' && (
              <div className="mt-5 space-y-6">
                {!canBeOrganizer && (
                  <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Verify your account to submit events.
                  </div>
                )}
                {!profile.organizer && (
                  <div className="rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-3 text-sm text-gray-300">
                    Mark yourself as an organizer in Personal information to enable submissions.
                  </div>
                )}
                {organizerMode === '' ? (
                  <div className="rounded-2xl border border-white/10 bg-[#1f232b] p-5">
                    <p className="text-sm text-gray-300">Choose the type of event to create.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget(null);
                          setOrganizerMode('milonga');
                        }}
                        disabled={!profile.organizer || !canBeOrganizer}
                        className={`rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3 text-sm font-semibold text-white hover:border-white/30 ${
                          !profile.organizer || !canBeOrganizer ? 'opacity-50' : ''
                        }`}
                      >
                        Create a new milonga / practica
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget(null);
                          setOrganizerMode('festival');
                        }}
                        disabled={!profile.organizer || !canBeOrganizer}
                        className={`rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3 text-sm font-semibold text-white hover:border-white/30 ${
                          !profile.organizer || !canBeOrganizer ? 'opacity-50' : ''
                        }`}
                      >
                        Create a new festival / marathon
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#1f232b] px-4 py-3 text-sm text-gray-300">
                    <span>
                      {editTarget ? 'Editing event details.' : 'Fill out the details below.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOrganizerMode('');
                        setEditTarget(null);
                      }}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200"
                    >
                      Change type
                    </button>
                  </div>
                )}
                {organizerMode === 'milonga' && (
                  <div className="rounded-2xl border border-white/10 bg-[#1f232b] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#25edda]/80">
                      Milonga / Practica
                    </h3>
                    <div className="mt-4 grid gap-3">
                      <input
                        placeholder="Title"
                        value={milongaForm.title}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="date"
                          value={milongaForm.date}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, date: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        />
                        <select
                          value={milongaForm.eventType}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, eventType: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        >
                          <option value="milonga">Milonga</option>
                          <option value="practica">Practica</option>
                        </select>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={milongaForm.frequencyType}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({
                              ...prev,
                              frequencyType: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        >
                          <option value="one-time">One-time event</option>
                          <option value="weekly">Weekly recurrence</option>
                          <option value="monthly">Monthly recurrence</option>
                        </select>
                        <div className="flex items-center text-xs text-gray-400">
                          Upcoming dates are generated from the start date.
                        </div>
                      </div>
                      {milongaForm.frequencyType === 'weekly' && (
                        <div className="rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Weekly days
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {WEEKDAY_OPTIONS.map((day) => {
                              const active = milongaForm.weeklyDays.includes(day.value);
                              return (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() =>
                                    setMilongaForm((prev) => ({
                                      ...prev,
                                      weeklyDays: active
                                        ? prev.weeklyDays.filter((val) => val !== day.value)
                                        : [...prev.weeklyDays, day.value],
                                    }))
                                  }
                                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                    active
                                      ? 'border-[#25edda] bg-[#25edda]/10 text-[#25edda]'
                                      : 'border-white/10 text-gray-300'
                                  }`}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {milongaForm.frequencyType === 'monthly' && (
                        <div className="rounded-2xl border border-white/10 bg-[#14161b] px-4 py-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Monthly rules
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setMilongaForm((prev) => ({
                                  ...prev,
                                  monthlyRules: [
                                    ...prev.monthlyRules,
                                    { week: 1, day: 5 },
                                  ],
                                }))
                              }
                              className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200"
                            >
                              Add rule
                            </button>
                          </div>
                          <div className="mt-3 space-y-2">
                            {milongaForm.monthlyRules.length === 0 && (
                              <p className="text-xs text-gray-400">
                                Add a rule like 1st Saturday.
                              </p>
                            )}
                            {milongaForm.monthlyRules.map((rule, index) => (
                              <div key={`${rule.week}-${rule.day}-${index}`} className="flex flex-wrap gap-2">
                                <select
                                  value={rule.week}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setMilongaForm((prev) => ({
                                      ...prev,
                                      monthlyRules: prev.monthlyRules.map((item, idx) =>
                                        idx === index ? { ...item, week: value } : item
                                      ),
                                    }));
                                  }}
                                  className="rounded-2xl border border-white/10 bg-[#0f1115] px-3 py-1 text-xs text-gray-200"
                                >
                                  {MONTHLY_WEEK_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={rule.day}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setMilongaForm((prev) => ({
                                      ...prev,
                                      monthlyRules: prev.monthlyRules.map((item, idx) =>
                                        idx === index ? { ...item, day: value } : item
                                      ),
                                    }));
                                  }}
                                  className="rounded-2xl border border-white/10 bg-[#0f1115] px-3 py-1 text-xs text-gray-200"
                                >
                                  {WEEKDAY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMilongaForm((prev) => ({
                                      ...prev,
                                      monthlyRules: prev.monthlyRules.filter((_, idx) => idx !== index),
                                    }))
                                  }
                                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="time"
                          value={milongaForm.startTime}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, startTime: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        />
                        <input
                          type="time"
                          value={milongaForm.endTime}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, endTime: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        />
                      </div>
                      <input
                        placeholder="Venue"
                        value={milongaForm.venue}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, venue: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <input
                        placeholder="Address"
                        value={milongaForm.address}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, address: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <input
                        placeholder="City"
                        value={milongaForm.city}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, city: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <input
                        placeholder="Image URL"
                        value={milongaForm.imageUrl}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-400">Upload image</span>
                        <button
                          type="button"
                          onClick={() => milongaImageInputRef.current?.click()}
                          disabled={!canBeOrganizer}
                          className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200 disabled:opacity-60"
                        >
                          Upload
                        </button>
                      </div>
                      <input
                        ref={milongaImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleOrganizerImageUpload(event.target.files?.[0], 'milonga')
                        }
                        className="hidden"
                      />
                      <input
                        placeholder="Signed Image URL (we'll download it)"
                        value={milongaForm.signedImageUrl}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({
                            ...prev,
                            signedImageUrl: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <textarea
                        placeholder="Description"
                        rows={4}
                        value={milongaForm.descriptionRaw}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, descriptionRaw: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleSubmitMilonga}
                      disabled={!canSubmitMilonga || submitting.milonga}
                      className="mt-4 rounded-full bg-[#25edda] px-4 py-2 text-sm font-semibold text-[#1f232b] disabled:opacity-60"
                    >
                      {submitting.milonga ? 'Submitting...' : 'Submit milonga'}
                    </button>
                  </div>
                )}

                {organizerMode === 'festival' && (
                  <div className="rounded-2xl border border-white/10 bg-[#1f232b] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#25edda]/80">
                      Festival / Marathon
                    </h3>
                    <div className="mt-4 grid gap-3">
                      <input
                        placeholder="Title"
                        value={festivalForm.title}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <select
                        value={festivalForm.eventType}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, eventType: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      >
                        <option value="festival">Festival</option>
                        <option value="marathon">Marathon</option>
                      </select>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          placeholder="City"
                          value={festivalForm.city}
                          onChange={(event) =>
                            setFestivalForm((prev) => ({ ...prev, city: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        />
                        <input
                          placeholder="Country"
                          value={festivalForm.country}
                          onChange={(event) =>
                            setFestivalForm((prev) => ({ ...prev, country: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="date"
                          value={festivalForm.startDate}
                          onChange={(event) =>
                            setFestivalForm((prev) => ({ ...prev, startDate: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        />
                        <input
                          type="date"
                          value={festivalForm.endDate}
                          onChange={(event) =>
                            setFestivalForm((prev) => ({ ...prev, endDate: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                        />
                      </div>
                      <input
                        placeholder="Date text (optional)"
                        value={festivalForm.dateText}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, dateText: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <input
                        placeholder="Website"
                        value={festivalForm.website}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, website: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <input
                        placeholder="Image URL"
                        value={festivalForm.imageUrl}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-400">Upload image</span>
                        <button
                          type="button"
                          onClick={() => festivalImageInputRef.current?.click()}
                          disabled={!canBeOrganizer}
                          className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200 disabled:opacity-60"
                        >
                          Upload
                        </button>
                      </div>
                      <input
                        ref={festivalImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleOrganizerImageUpload(event.target.files?.[0], 'festival')
                        }
                        className="hidden"
                      />
                      <input
                        placeholder="Signed Image URL (we'll download it)"
                        value={festivalForm.signedImageUrl}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({
                            ...prev,
                            signedImageUrl: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                      <textarea
                        placeholder="Description"
                        rows={4}
                        value={festivalForm.description}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-[#14161b] px-4 py-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleSubmitFestival}
                      disabled={!canSubmitFestival || submitting.festival}
                      className="mt-4 rounded-full bg-[#25edda] px-4 py-2 text-sm font-semibold text-[#1f232b] disabled:opacity-60"
                    >
                      {submitting.festival ? 'Submitting...' : 'Submit festival'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activePanel === 'submissions' && (
              <div className="mt-5">
                {eventsLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-[#1f232b] p-4 text-gray-300">
                    Loading events...
                  </div>
                ) : myEvents.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#1f232b] p-4 text-gray-300">
                    No events yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myEvents.map((eventItem) => {
                      const isFestival =
                        eventItem.kind === 'festival' ||
                        (eventItem.kind === 'submission' && eventItem.submissionType === 'festival');
                      const typeLabel = isFestival
                        ? eventItem.eventType === 'marathon'
                          ? 'Marathon'
                          : 'Festival'
                        : eventItem.eventType === 'practica'
                          ? 'Practica'
                          : 'Milonga';
                      const typeTone = isFestival
                        ? 'border-emerald-400/40 text-emerald-200'
                        : 'border-[#25edda]/50 text-[#25edda]';
                      const statusLabel =
                        eventItem.status || (eventItem.kind === 'submission' ? 'pending' : 'active');
                      const locationParts = [
                        eventItem.city,
                        isFestival ? eventItem.country : eventItem.address || eventItem.venue,
                      ]
                        .filter(Boolean)
                        .join(', ');
                      return (
                        <div
                          key={`${eventItem.kind}-${eventItem.id}`}
                          className="rounded-2xl border border-white/10 bg-[#1f232b] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-[#14161b]">
                                {eventItem.imageUrl ? (
                                  <img
                                    src={eventItem.imageUrl}
                                    alt={eventItem.title || 'Event'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-white">
                                    {eventItem.title || 'Untitled'}
                                  </p>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${typeTone}`}
                                  >
                                    {typeLabel}
                                  </span>
                                </div>
                                {locationParts && (
                                  <p className="text-xs text-gray-400">{locationParts}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                                {statusLabel}
                              </span>
                              {eventItem.kind !== 'submission' && (
                                <button
                                  type="button"
                                  onClick={() => handlePauseToggle(eventItem)}
                                  className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-gray-200"
                                >
                                  {eventItem.status === 'paused' ? 'Resume' : 'Pause'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEdit(eventItem)}
                                className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-gray-200"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
