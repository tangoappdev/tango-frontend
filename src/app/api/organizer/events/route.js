import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

async function requireUser(request) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { user };
}

const normalizeEvent = (item, type) => {
  const payload = item.payload || {};
  if (type === 'submission') {
    return {
      id: item.id,
      kind: 'submission',
      submissionType: item.type,
      eventType: payload.eventType || (item.type === 'milonga' ? 'milonga' : 'festival'),
      title: payload.title || 'Untitled',
      status: item.status || 'pending',
      city: payload.city || null,
      country: payload.country || null,
      address: payload.address || null,
      venue: payload.venue || null,
      imageUrl: payload.imageUrl || payload.signedImageUrl || null,
      date: payload.date || payload.startDate || null,
      endDate: payload.endDate || null,
      startTimeMinutes: payload.startTimeMinutes ?? null,
      endTimeMinutes: payload.endTimeMinutes ?? null,
      descriptionRaw: payload.descriptionRaw || null,
      description: payload.description || null,
      recurrence: payload.recurrence || null,
      submittedAt: item.createdAt || null,
    };
  }

  return {
    id: item.id,
    kind: type,
    eventType: item.eventType || (type === 'festival' ? 'festival' : 'milonga'),
    title: item.title || 'Untitled',
    status: item.status || 'active',
    city: item.city || null,
    country: item.country || null,
    address: item.address || null,
    venue: item.venue || null,
    imageUrl: item.imageUrl || null,
    date: item.date || item.startDate || null,
    endDate: item.endDate || null,
    startTimeMinutes: item.startTimeMinutes ?? null,
    endTimeMinutes: item.endTimeMinutes ?? null,
    descriptionRaw: item.descriptionRaw || null,
    description: item.description || null,
    website: item.website || null,
    recurrence: item.recurrence || null,
    recurrenceGroupId: item.recurrenceGroupId || null,
  };
};

export async function GET(request) {
  const gate = await requireUser(request);
  if (gate.error) return gate.error;
  const { user } = gate;

  try {
    const db = getFirestore();
    const [submissionSnap, milongaSnap, festivalSnap] = await Promise.all([
      db
        .collection('event_submissions')
        .where('submitter.uid', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .get(),
      db
        .collection('external_events')
        .where('submitter.uid', '==', user.uid)
        .get(),
      db
        .collection('external_festivals')
        .where('submitter.uid', '==', user.uid)
        .get(),
    ]);

    const submissions = submissionSnap.docs.map((doc) =>
      normalizeEvent({ id: doc.id, ...doc.data() }, 'submission')
    );

    const milongas = milongaSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((event) => event.isRecurrenceMaster !== false)
      .map((event) => normalizeEvent(event, 'milonga'));

    const festivals = festivalSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .map((event) => normalizeEvent(event, 'festival'));

    const allEvents = [...milongas, ...festivals, ...submissions];
    allEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return NextResponse.json({ ok: true, events: allEvents });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load events' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const gate = await requireUser(request);
  if (gate.error) return gate.error;
  const { user } = gate;

  try {
    const body = await request.json();
    const { id, kind, action, payload } = body || {};
    if (!id || !kind || !action) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getFirestore();

    if (kind === 'submission') {
      const docRef = db.collection('event_submissions').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      const data = doc.data();
      if (data?.submitter?.uid !== user.uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (data.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only pending submissions can be edited' },
          { status: 400 }
        );
      }
      if (action !== 'update') {
        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
      }
      await docRef.set(
        {
          payload: {
            ...(data.payload || {}),
            ...(payload || {}),
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (kind === 'milonga') {
      const docRef = db.collection('external_events').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      const event = doc.data();
      if (event?.submitter?.uid !== user.uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const updates = {};
      if (action === 'pause') updates.status = 'paused';
      if (action === 'resume') updates.status = 'active';
      if (action === 'update') Object.assign(updates, payload || {});
      updates.updatedAt = new Date().toISOString();

      if (event.recurrenceGroupId) {
        const groupSnap = await db
          .collection('external_events')
          .where('recurrenceGroupId', '==', event.recurrenceGroupId)
          .get();
        const batch = db.batch();
        groupSnap.docs.forEach((docItem) => {
          batch.set(docItem.ref, updates, { merge: true });
        });
        await batch.commit();
      } else {
        await docRef.set(updates, { merge: true });
      }

      return NextResponse.json({ ok: true });
    }

    if (kind === 'festival') {
      const docRef = db.collection('external_festivals').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Festival not found' }, { status: 404 });
      }
      const event = doc.data();
      if (event?.submitter?.uid !== user.uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const updates = {};
      if (action === 'pause') updates.status = 'paused';
      if (action === 'resume') updates.status = 'active';
      if (action === 'update') Object.assign(updates, payload || {});
      updates.updatedAt = new Date().toISOString();
      await docRef.set(updates, { merge: true });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unsupported kind' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}
