'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import Header from '@/components/Header';
import { auth } from '@/lib/firebaseClient';
import { useAuth } from '@/components/AuthProvider';
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/solid';

const toMinutes = (timeValue) => {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(':').map((val) => parseInt(val, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const WEEKDAY_OPTIONS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

const MONTHLY_WEEK_OPTIONS = [
  { label: '1st', value: 1 },
  { label: '2nd', value: 2 },
  { label: '3rd', value: 3 },
  { label: '4th', value: 4 },
  { label: '5th', value: 5 },
];

const NEO_CARD = 'shadow-[3px_3px_5px_#181a1d,-3px_-3px_5px_#484d57]';
const NEO_INSET = 'shadow-[inset_3px_3px_5px_#1f2126,inset_-3px_-3px_5px_#41454e]';
const SELECT_STYLE = 'account-select';

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
    classBefore: false,
    classStartTime: '',
    classEndTime: '',
    eventType: 'milonga',
    frequencyType: 'weekly',
    weeklyDays: [],
    monthlyRules: [{ week: 1, day: 5 }],
    venue: '',
    address: '',
    city: '',
    stateRegion: '',
    country: '',
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
        classBefore: milongaForm.classBefore,
        classStartTimeMinutes: milongaForm.classBefore
          ? toMinutes(milongaForm.classStartTime)
          : null,
        classEndTimeMinutes: milongaForm.classBefore
          ? toMinutes(milongaForm.classEndTime)
          : null,
        eventType: milongaForm.eventType,
        venue: milongaForm.venue.trim(),
        address: milongaForm.address.trim(),
        city: milongaForm.city.trim(),
        stateRegion: milongaForm.stateRegion.trim(),
        country: milongaForm.country.trim(),
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
        classBefore: false,
        classStartTime: '',
        classEndTime: '',
        eventType: 'milonga',
        frequencyType: 'weekly',
        weeklyDays: [],
        monthlyRules: [{ week: 1, day: 5 }],
        venue: '',
        address: '',
        city: '',
        stateRegion: '',
        country: '',
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
        classBefore: !!eventItem.classBefore,
        classStartTime:
          typeof eventItem.classStartTimeMinutes === 'number'
            ? `${String(Math.floor(eventItem.classStartTimeMinutes / 60)).padStart(2, '0')}:${String(eventItem.classStartTimeMinutes % 60).padStart(2, '0')}`
            : '',
        classEndTime:
          typeof eventItem.classEndTimeMinutes === 'number'
            ? `${String(Math.floor(eventItem.classEndTimeMinutes / 60)).padStart(2, '0')}:${String(eventItem.classEndTimeMinutes % 60).padStart(2, '0')}`
            : '',
        eventType: eventItem.eventType || 'milonga',
        frequencyType: eventItem.recurrence?.type || 'weekly',
        weeklyDays: eventItem.recurrence?.weeklyDays || [],
        monthlyRules: eventItem.recurrence?.monthlyRules?.length
          ? eventItem.recurrence.monthlyRules
          : [{ week: 1, day: 5 }],
        venue: eventItem.venue || '',
        address: eventItem.address || '',
        city: eventItem.city || '',
        stateRegion: eventItem.stateRegion || eventItem.region || '',
        country: eventItem.country || '',
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
      <style jsx global>{`
        .account-modal input[type='date']::-webkit-calendar-picker-indicator,
        .account-modal input[type='time']::-webkit-calendar-picker-indicator,
        .account-create-event input[type='date']::-webkit-calendar-picker-indicator,
        .account-create-event input[type='time']::-webkit-calendar-picker-indicator {
          filter: invert(78%) sepia(34%) saturate(682%) hue-rotate(122deg) brightness(97%)
            contrast(92%);
        }
        .account-select {
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M5.25 7.5L10 12.25L14.75 7.5'/></svg>");
          background-repeat: no-repeat;
          background-position: right 0.9rem center;
          background-size: 0.8rem;
          padding-right: 2.5rem;
        }
      `}</style>
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
              className={`rounded-3xl  bg-[#30333a] p-6 text-left transition hover:border-white/20 ${NEO_CARD}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Personal information</h2>
                  <p className="mt-2 text-sm text-gray-300">
                    Manage your name, photo, and organizer status.
                  </p>
                </div>
                <span className="rounded-full  px-3 py-1 text-xs text-gray-300">
                  Edit
                </span>
              </div>
            </button>
            <button
              onClick={() => setActivePanel('password')}
              className={`rounded-3xl  bg-[#30333a] p-6 text-left transition hover:border-white/20 ${NEO_CARD}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Password</h2>
                  <p className="mt-2 text-sm text-gray-300">
                    Send a reset email to update your password.
                  </p>
                </div>
                <span className="rounded-full  px-3 py-1 text-xs text-gray-300">
                  Edit
                </span>
              </div>
            </button>
            <button
              onClick={() => setActivePanel('billing')}
              className={`rounded-3xl  bg-[#30333a] p-6 text-left transition hover:border-white/20 ${NEO_CARD}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Payment & subscriptions</h2>
                  <p className="mt-2 text-sm text-gray-300">
                    Manage billing details and subscription status.
                  </p>
                </div>
                <span className="rounded-full  px-3 py-1 text-xs text-gray-300">
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
                className={`rounded-3xl  bg-[#30333a] p-6 text-left transition ${
                  profile.organizer ? 'hover:border-white/20' : 'opacity-50'
                } ${NEO_CARD}`}
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
                  <span className="rounded-full  px-3 py-1 text-xs text-gray-300">
                    Open
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActivePanel('submissions')}
                className={`rounded-3xl  bg-[#30333a] p-6 text-left transition hover:border-white/20 ${NEO_CARD}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">My events</h2>
                    <p className="mt-2 text-sm text-gray-300">
                      View your live and pending events.
                    </p>
                  </div>
                  <span className="rounded-full  px-3 py-1 text-xs text-gray-300">
                    View
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="hidden">

          <section className="rounded-3xl  bg-[#30333a] p-6">
            <h2 className="text-lg font-semibold">Personal information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-300">
                Display name
                <input
                  value={profile.displayName}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-white"
                />
              </label>
              <label className="text-sm text-gray-300">
                Email
                <input
                  value={profile.email}
                  disabled
                  className="mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-gray-400"
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

          <section className="rounded-3xl  bg-[#30333a] p-6">
            <h2 className="text-lg font-semibold">Password</h2>
            <p className="mt-2 text-sm text-gray-300">
              Send yourself a password reset email to update your login credentials.
            </p>
            <button
              onClick={handleResetPassword}
              disabled={resetState.sending}
              className="mt-4 rounded-full  px-4 py-2 text-sm font-semibold text-gray-200"
            >
              {resetState.sending ? 'Sending...' : 'Send password reset email'}
            </button>
            {resetState.message && (
              <p className="mt-3 text-sm text-gray-300">{resetState.message}</p>
            )}
          </section>

          <section className="rounded-3xl  bg-[#30333a] p-6">
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
            <section className="account-create-event rounded-3xl  bg-[#30333a] p-6">
            <h2 className="text-lg font-semibold">Create a new event</h2>
              <p className="mt-2 text-sm text-gray-300">
                Submit new events. Each submission is reviewed before it appears publicly.
              </p>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl  bg-[#30333a] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#25edda]/80">
                    Milonga / Practica
                  </h3>
                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-wrap items-start gap-4">
                      <button
                        type="button"
                        onClick={() => milongaImageInputRef.current?.click()}
                        disabled={!canBeOrganizer}
                        className="flex h-[128px] w-[128px] flex-col items-center justify-center gap-2 rounded-2xl  border border-[#25edda]/40 bg-[#30333a] text-[11px] font-semibold text-[#25edda] disabled:opacity-60"
                      >
                        {milongaForm.imageUrl ? (
                          <img
                            src={milongaForm.imageUrl}
                            alt="Milonga"
                            className="h-full w-full rounded-2xl object-cover"
                          />
                        ) : (
                          <>
                            <ArrowUpTrayIcon className="h-5 w-5" />
                            Upload image
                          </>
                        )}
                      </button>
                      <div className="min-w-[220px] flex-1 space-y-3">
                        <input
                          placeholder="Milonga name"
                          value={milongaForm.title}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                        <input
                          type="date"
                          value={milongaForm.date}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, date: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                        <div className={`flex items-center gap-2 rounded-full  bg-[#30333a] p-1 text-xs font-semibold ${NEO_INSET}`}>
                          {[
                            { value: 'milonga', label: 'Milonga' },
                            { value: 'practica', label: 'Practica' },
                          ].map((option) => {
                            const isActive = milongaForm.eventType === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  setMilongaForm((prev) => ({ ...prev, eventType: option.value }))
                                }
                                className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                                  isActive
                                    ? 'bg-[#25edda] text-[#1f232b]'
                                    : 'text-gray-300 hover:text-white'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs text-gray-400">
                        Milonga start time
                        <input
                          type="time"
                          value={milongaForm.startTime}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, startTime: event.target.value }))
                          }
                          className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET}`}
                        />
                      </label>
                      <label className="text-xs text-gray-400">
                        Milonga end time
                        <input
                          type="time"
                          value={milongaForm.endTime}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, endTime: event.target.value }))
                          }
                          className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET}`}
                        />
                      </label>
                    </div>
                      {milongaForm.classBefore && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-xs text-gray-400">
                            Class start time
                            <input
                              type="time"
                              value={milongaForm.classStartTime}
                              onChange={(event) =>
                                setMilongaForm((prev) => ({
                                  ...prev,
                                  classStartTime: event.target.value,
                                }))
                              }
                              className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET}`}
                            />
                          </label>
                          <label className="text-xs text-gray-400">
                            Class end time
                            <input
                              type="time"
                              value={milongaForm.classEndTime}
                              onChange={(event) =>
                                setMilongaForm((prev) => ({
                                  ...prev,
                                  classEndTime: event.target.value,
                                }))
                              }
                              className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET}`}
                            />
                          </label>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl  bg-[#30333a]">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Class before milonga
                          </p>
                          <p className="text-[11px] text-gray-500">Optional class times.</p>
                        </div>
                        <div className={`flex items-center gap-2 rounded-full  bg-[#30333a] text-xs font-semibold ${NEO_INSET}`}>
                          {[
                            { value: false, label: 'Off' },
                            { value: true, label: 'On' },
                          ].map((option) => {
                            const isActive = milongaForm.classBefore === option.value;
                            return (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() =>
                                  setMilongaForm((prev) => ({ ...prev, classBefore: option.value }))
                                }
                                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                  isActive
                                    ? `bg-[#30333a] text-[#25edda] ${NEO_CARD}`
                                    : 'text-gray-300 hover:text-white'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <input
                        placeholder="Address"
                        value={milongaForm.address}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, address: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          placeholder="Venue"
                          value={milongaForm.venue}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, venue: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                        <input
                          placeholder="City"
                          value={milongaForm.city}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, city: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          placeholder="State / Region"
                          value={milongaForm.stateRegion}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, stateRegion: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                        <input
                          placeholder="Country"
                          value={milongaForm.country}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, country: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                      </div>
                    <textarea
                      placeholder="Description"
                      rows={4}
                      value={milongaForm.descriptionRaw}
                      onChange={(event) =>
                        setMilongaForm((prev) => ({ ...prev, descriptionRaw: event.target.value }))
                      }
                      className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
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

                <div className="rounded-2xl  bg-[#30333a] p-5">
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
                      className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        placeholder="City"
                        value={festivalForm.city}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, city: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                      <input
                        placeholder="Country"
                        value={festivalForm.country}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, country: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="date"
                        value={festivalForm.startDate}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, startDate: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                      <input
                        type="date"
                        value={festivalForm.endDate}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, endDate: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                    </div>
                    <input
                      placeholder="Date text (optional)"
                      value={festivalForm.dateText}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, dateText: event.target.value }))
                      }
                      className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                    />
                    <input
                      placeholder="Website"
                      value={festivalForm.website}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, website: event.target.value }))
                      }
                      className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                    />
                    <textarea
                      placeholder="Description"
                      rows={4}
                      value={festivalForm.description}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
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
          <div className="account-modal w-full max-w-xl rounded-3xl  bg-[#30333a] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col items-center">
              <button
                onClick={() => setActivePanel('')}
                className="ml-auto rounded-full px-3 py-1 text-xs text-gray-300 hover:text-white self-end"
              >
                Close
              </button>
              <h2 className="mt-2 text-center text-lg font-semibold">
                {activePanel === 'profile' && 'Personal information'}
                {activePanel === 'password' && 'Password'}
                {activePanel === 'billing' && 'Payment & subscriptions'}
                {activePanel === 'organizer' && 'Create a new event'}
                {activePanel === 'submissions' && 'My events'}
              </h2>
            </div>

            {activePanel === 'profile' && (
              <div className="mt-5 space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative">
                    <div className="h-20 w-20 overflow-hidden rounded-full  bg-white/5">
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
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full  bg-[#1f232b] text-white hover:text-[#25edda]"
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
                      className="mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-white"
                    />
                  </label>
                  <label className="text-sm text-gray-300">
                    Email
                    <input
                      value={profile.email}
                      disabled
                      className="mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-gray-400"
                    />
                  </label>
                </div>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center justify-between rounded-2xl  bg-[#30333a] px-4 py-3">
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
                      className={`h-7 w-12 rounded-full  p-1 transition ${
                        profile.organizer ? 'bg-[#25edda]' : 'bg-[#30333a]'
                      } ${!canBeOrganizer ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-white transition ${
                          profile.organizer ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl  bg-[#30333a] px-4 py-3">
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
                      className={`h-7 w-12 rounded-full  p-1 transition ${
                        profile.teacher ? 'bg-[#25edda]' : 'bg-[#30333a]'
                      } ${!canBeOrganizer ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-white transition ${
                          profile.teacher ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl  bg-[#30333a] px-4 py-3">
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
                      className={`h-7 w-12 rounded-full  p-1 transition ${
                        profile.tangoDj ? 'bg-[#25edda]' : 'bg-[#30333a]'
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
                  className="rounded-full  px-4 py-2 text-sm font-semibold text-gray-200"
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
              <div className="space-y-4">
                {!canBeOrganizer && (
                  <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Verify your account to submit events.
                  </div>
                )}
                {!profile.organizer && (
                  <div className="rounded-2xl  bg-[#30333a] px-4 py-3 text-sm text-gray-300">
                    Mark yourself as an organizer in Personal information to enable submissions.
                  </div>
                )}
                {organizerMode === '' ? (
                  <div className="rounded-2xl bg-[#30333a] p-4">
                    <p className="text-sm text-gray-300">Choose the type of event to create.</p>
                    <div className="mt-4 grid gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget(null);
                          setOrganizerMode('milonga');
                        }}
                        disabled={!profile.organizer || !canBeOrganizer}
                        className={`rounded-2xl bg-[#30333a] px-4 py-3 text-sm font-semibold text-white ${NEO_CARD} ${
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
                        className={`rounded-2xl bg-[#30333a] px-4 py-3 text-sm font-semibold text-white ${NEO_CARD} ${
                          !profile.organizer || !canBeOrganizer ? 'opacity-50' : ''
                        }`}
                      >
                        Create a new festival / marathon
                      </button>
                    </div>
                  </div>
                ) : null}
                {organizerMode === 'milonga' && (
                  <div className="rounded-2xl bg-[#30333a] p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#25edda]/80">
                        Milonga / Practica
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setOrganizerMode('');
                          setEditTarget(null);
                        }}
                        className="rounded-full  px-3 py-1 text-xs text-gray-200"
                      >
                        Change type
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div className="flex flex-wrap items-start gap-4">
                        <button
                          type="button"
                          onClick={() => milongaImageInputRef.current?.click()}
                          disabled={!canBeOrganizer}
                        className="flex h-[128px] w-[128px] flex-col items-center justify-center gap-2 rounded-2xl  border border-[#25edda]/40 bg-[#30333a] text-[11px] font-semibold text-[#25edda] disabled:opacity-60"
                        >
                          {milongaForm.imageUrl ? (
                            <img
                              src={milongaForm.imageUrl}
                              alt="Milonga"
                              className="h-full w-full rounded-2xl object-cover"
                            />
                          ) : (
                            <>
                              <ArrowUpTrayIcon className="h-5 w-5" />
                              Upload image
                            </>
                          )}
                        </button>
                        <div className="min-w-[220px] flex-1 space-y-3">
                          <input
                            placeholder="Milonga name"
                            value={milongaForm.title}
                            onChange={(event) =>
                              setMilongaForm((prev) => ({ ...prev, title: event.target.value }))
                            }
                            className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                          />
                          <input
                            type="date"
                            value={milongaForm.date}
                            onChange={(event) =>
                              setMilongaForm((prev) => ({ ...prev, date: event.target.value }))
                            }
                            className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                          />
                          <div className={`flex w-full items-center gap-2 rounded-full  bg-[#30333a] text-xs font-semibold ${NEO_INSET}`}>
                            {[
                              { value: 'milonga', label: 'Milonga' },
                              { value: 'practica', label: 'Practica' },
                            ].map((option) => {
                              const isActive = milongaForm.eventType === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    setMilongaForm((prev) => ({ ...prev, eventType: option.value }))
                                  }
                                  className={`w-1/2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                                    isActive
                                      ? `bg-[#30333a] text-[#25edda] ${NEO_CARD}`
                                      : 'text-gray-300 hover:text-white'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-gray-400">
                          Frequency
                          <select
                            value={milongaForm.frequencyType}
                            onChange={(event) =>
                              setMilongaForm((prev) => ({
                                ...prev,
                                frequencyType: event.target.value,
                              }))
                            }
                            className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET} ${SELECT_STYLE}`}
                          >
                            <option value="one-time">One-time event</option>
                          <option value="weekly">Every week</option>
                          <option value="monthly">Every month</option>
                          </select>
                        </label>
                        {milongaForm.frequencyType === 'weekly' ? (
                          <label className="text-xs text-gray-400">
                            Day of week
                            <select
                              value={milongaForm.weeklyDays?.[0] ?? ''}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setMilongaForm((prev) => ({
                                  ...prev,
                                  weeklyDays: Number.isNaN(value) ? [] : [value],
                                }));
                              }}
                              className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET} ${SELECT_STYLE}`}
                            >
                              <option value="">Select day</option>
                              {WEEKDAY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : milongaForm.frequencyType === 'monthly' ? (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-400">Monthly rule</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select
                                value={milongaForm.monthlyRules?.[0]?.week ?? 1}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  setMilongaForm((prev) => ({
                                    ...prev,
                                    monthlyRules: [
                                      { week: value, day: prev.monthlyRules?.[0]?.day ?? 5 },
                                      ...(prev.monthlyRules?.slice(1) || []),
                                    ],
                                  }));
                                }}
                                className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET} ${SELECT_STYLE}`}
                              >
                                {MONTHLY_WEEK_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={milongaForm.monthlyRules?.[0]?.day ?? 5}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  setMilongaForm((prev) => ({
                                    ...prev,
                                    monthlyRules: [
                                      { week: prev.monthlyRules?.[0]?.week ?? 1, day: value },
                                      ...(prev.monthlyRules?.slice(1) || []),
                                    ],
                                  }));
                                }}
                                className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET} ${SELECT_STYLE}`}
                              >
                                {WEEKDAY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {milongaForm.frequencyType === 'monthly' && (
                        <div className="rounded-2xl  bg-[#30333a]">
                          <div className="space-y-2">
                            {milongaForm.monthlyRules.slice(1).map((rule, index) => (
                              <div key={`${rule.week}-${rule.day}-${index}`} className="grid grid-cols-4 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMilongaForm((prev) => ({
                                      ...prev,
                                      monthlyRules: prev.monthlyRules.filter((_, idx) => idx !== index + 1),
                                    }))
                                  }
                                  className="col-span-2 rounded-full px-3 py-2 text-xs text-gray-200"
                                >
                                  Remove
                                </button>
                                <select
                                  value={rule.week}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setMilongaForm((prev) => ({
                                      ...prev,
                                      monthlyRules: prev.monthlyRules.map((item, idx) =>
                                        idx === index + 1 ? { ...item, week: value } : item
                                      ),
                                    }));
                                  }}
                                  className={`col-span-1 rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET} ${SELECT_STYLE}`}
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
                                        idx === index + 1 ? { ...item, day: value } : item
                                      ),
                                    }));
                                  }}
                                  className={`col-span-1 rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET} ${SELECT_STYLE}`}
                                >
                                  {WEEKDAY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center justify-end">
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
                              className="rounded-full px-3 py-1 text-xs font-semibold text-[#25edda]"
                            >
                              + Add rule
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-gray-400">
                          Milonga start time
                          <input
                            type="time"
                            value={milongaForm.startTime}
                            onChange={(event) =>
                              setMilongaForm((prev) => ({ ...prev, startTime: event.target.value }))
                            }
                            className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET}`}
                          />
                        </label>
                        <label className="text-xs text-gray-400">
                          Milonga end time
                          <input
                            type="time"
                            value={milongaForm.endTime}
                            onChange={(event) =>
                              setMilongaForm((prev) => ({ ...prev, endTime: event.target.value }))
                            }
                            className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET}`}
                          />
                        </label>
                      </div>
                      {milongaForm.classBefore && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-xs text-gray-400">
                            Class start time
                            <input
                              type="time"
                              value={milongaForm.classStartTime}
                              onChange={(event) =>
                                setMilongaForm((prev) => ({
                                  ...prev,
                                  classStartTime: event.target.value,
                                }))
                              }
                              className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET}`}
                            />
                          </label>
                          <label className="text-xs text-gray-400">
                            Class end time
                            <input
                              type="time"
                              value={milongaForm.classEndTime}
                              onChange={(event) =>
                                setMilongaForm((prev) => ({
                                  ...prev,
                                  classEndTime: event.target.value,
                                }))
                              }
                              className={`mt-2 w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm text-white ${NEO_INSET}`}
                            />
                          </label>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl  bg-[#30333a]">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Class before milonga
                          </p>
                          <p className="text-[11px] text-gray-500">Optional class times.</p>
                        </div>
                        <div className={`flex items-center gap-2 rounded-full  bg-[#30333a] text-xs font-semibold ${NEO_INSET}`}>
                          {[
                            { value: false, label: 'Off' },
                            { value: true, label: 'On' },
                          ].map((option) => {
                            const isActive = milongaForm.classBefore === option.value;
                            return (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() =>
                                  setMilongaForm((prev) => ({ ...prev, classBefore: option.value }))
                                }
                                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                  isActive
                                    ? `bg-[#30333a] text-[#25edda] ${NEO_CARD}`
                                    : 'text-gray-300 hover:text-white'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <input
                        placeholder="Address"
                        value={milongaForm.address}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, address: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          placeholder="Venue"
                          value={milongaForm.venue}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, venue: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                        <input
                          placeholder="City"
                          value={milongaForm.city}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, city: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          placeholder="State / Region"
                          value={milongaForm.stateRegion}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, stateRegion: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                        <input
                          placeholder="Country"
                          value={milongaForm.country}
                          onChange={(event) =>
                            setMilongaForm((prev) => ({ ...prev, country: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                      </div>
                      <textarea
                        placeholder="Description"
                        rows={4}
                        value={milongaForm.descriptionRaw}
                        onChange={(event) =>
                          setMilongaForm((prev) => ({ ...prev, descriptionRaw: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
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
                  <div className="rounded-2xl bg-[#30333a] p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#25edda]/80">
                        Festival / Marathon
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setOrganizerMode('');
                          setEditTarget(null);
                        }}
                        className="rounded-full  px-3 py-1 text-xs text-gray-200"
                      >
                        Change type
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <input
                        placeholder="Title"
                        value={festivalForm.title}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                    <select
                      value={festivalForm.eventType}
                      onChange={(event) =>
                        setFestivalForm((prev) => ({ ...prev, eventType: event.target.value }))
                      }
                      className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET} ${SELECT_STYLE}`}
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
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                        <input
                          placeholder="Country"
                          value={festivalForm.country}
                          onChange={(event) =>
                            setFestivalForm((prev) => ({ ...prev, country: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="date"
                          value={festivalForm.startDate}
                          onChange={(event) =>
                            setFestivalForm((prev) => ({ ...prev, startDate: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                        <input
                          type="date"
                          value={festivalForm.endDate}
                          onChange={(event) =>
                            setFestivalForm((prev) => ({ ...prev, endDate: event.target.value }))
                          }
                          className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                        />
                      </div>
                      <input
                        placeholder="Date text (optional)"
                        value={festivalForm.dateText}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, dateText: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                      <input
                        placeholder="Website"
                        value={festivalForm.website}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, website: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
                      />
                      <button
                        type="button"
                        onClick={() => festivalImageInputRef.current?.click()}
                        disabled={!canBeOrganizer}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#25edda] disabled:opacity-60"
                      >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        Upload image
                      </button>
                      <input
                        ref={festivalImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleOrganizerImageUpload(event.target.files?.[0], 'festival')
                        }
                        className="hidden"
                      />
                      <textarea
                        placeholder="Description"
                        rows={4}
                        value={festivalForm.description}
                        onChange={(event) =>
                          setFestivalForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        className={`w-full rounded-2xl  bg-[#30333a] px-4 py-2 text-sm ${NEO_INSET}`}
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
                  <div className="rounded-2xl  bg-[#30333a] p-4 text-gray-300">
                    Loading events...
                  </div>
                ) : myEvents.length === 0 ? (
                  <div className="rounded-2xl  bg-[#30333a] p-4 text-gray-300">
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
                          className="rounded-2xl  bg-[#30333a] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 overflow-hidden rounded-xl  bg-[#30333a]">
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
                              <span className="rounded-full  px-3 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                                {statusLabel}
                              </span>
                              {eventItem.kind !== 'submission' && (
                                <button
                                  type="button"
                                  onClick={() => handlePauseToggle(eventItem)}
                                  className="rounded-full  px-3 py-1 text-[11px] text-gray-200"
                                >
                                  {eventItem.status === 'paused' ? 'Resume' : 'Pause'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEdit(eventItem)}
                                className="rounded-full  px-3 py-1 text-[11px] text-gray-200"
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







