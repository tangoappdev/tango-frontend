import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebaseAdmin.server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

const slugify = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user?.email_verified) {
    return NextResponse.json(
      { error: 'Verify your email before submitting events.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { type, payload } = body || {};
    if (!type || !payload) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (type !== 'milonga' && type !== 'festival') {
      return NextResponse.json({ error: 'Unsupported submission type' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const db = getFirestore();

    if (type === 'milonga') {
      const {
        title,
        date,
        startTimeMinutes,
        endTimeMinutes,
        classBefore,
        classStartTimeMinutes,
        classEndTimeMinutes,
        eventType,
        venue,
        address,
        city,
        stateRegion,
        country,
        imageUrl,
        signedImageUrl,
        descriptionRaw,
        recurrence,
      } = payload;

      if (!title || !date || !eventType) {
        return NextResponse.json(
          { error: 'Title, date, and event type are required.' },
          { status: 400 }
        );
      }

      await db.collection('event_submissions').add({
        type,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        submitter: {
          uid: user.uid,
          email: user.email || null,
        },
        payload: {
          title,
          date,
          startTimeMinutes: typeof startTimeMinutes === 'number' ? startTimeMinutes : null,
          endTimeMinutes: typeof endTimeMinutes === 'number' ? endTimeMinutes : null,
          classBefore: classBefore === true,
          classStartTimeMinutes:
            typeof classStartTimeMinutes === 'number' ? classStartTimeMinutes : null,
          classEndTimeMinutes:
            typeof classEndTimeMinutes === 'number' ? classEndTimeMinutes : null,
          eventType,
          venue: venue || null,
          address: address || null,
          city: city || null,
          stateRegion: stateRegion || null,
          country: country || null,
          citySlug: slugify(city),
          imageUrl: imageUrl || null,
          signedImageUrl: signedImageUrl || null,
          descriptionRaw: descriptionRaw || null,
          recurrence: recurrence || null,
        },
      });

      return NextResponse.json({ ok: true });
    }

    const {
      title,
      city,
      country,
      startDate,
      endDate,
      dateText,
      website,
      imageUrl,
      signedImageUrl,
      description,
      eventType,
    } = payload;

    if (!title || (!startDate && !dateText)) {
      return NextResponse.json(
        { error: 'Title and start date (or date text) are required.' },
        { status: 400 }
      );
    }

    await db.collection('event_submissions').add({
      type,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      submitter: {
        uid: user.uid,
        email: user.email || null,
      },
      payload: {
        title,
        city: city || null,
        country: country || null,
        startDate: startDate || null,
        endDate: endDate || startDate || null,
        dateText: dateText || null,
        website: website || null,
        imageUrl: imageUrl || null,
        signedImageUrl: signedImageUrl || null,
        description: description || null,
        eventType: eventType || 'festival',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to submit event' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('event_submissions')
      .where('submitter.uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const submissions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ ok: true, submissions });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load submissions' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user?.email_verified) {
    return NextResponse.json(
      { error: 'Verify your email before submitting events.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, type, payload } = body || {};
    if (!id || !payload) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getFirestore();
    const ref = db.collection('event_submissions').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const existing = snapshot.data();
    if (existing?.submitter?.uid !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (existing?.status && existing.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending submissions can be edited.' }, { status: 400 });
    }

    const submissionType = type || existing?.type;
    if (submissionType !== 'milonga' && submissionType !== 'festival') {
      return NextResponse.json({ error: 'Unsupported submission type' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (submissionType === 'milonga') {
      const {
        title,
        date,
        startTimeMinutes,
        endTimeMinutes,
        classBefore,
        classStartTimeMinutes,
        classEndTimeMinutes,
        eventType,
        venue,
        address,
        city,
        stateRegion,
        country,
        imageUrl,
        signedImageUrl,
        descriptionRaw,
        recurrence,
      } = payload;

      if (!title || !date || !eventType) {
        return NextResponse.json(
          { error: 'Title, date, and event type are required.' },
          { status: 400 }
        );
      }

      await ref.update({
        updatedAt: now,
        payload: {
          title,
          date,
          startTimeMinutes: typeof startTimeMinutes === 'number' ? startTimeMinutes : null,
          endTimeMinutes: typeof endTimeMinutes === 'number' ? endTimeMinutes : null,
          classBefore: classBefore === true,
          classStartTimeMinutes:
            typeof classStartTimeMinutes === 'number' ? classStartTimeMinutes : null,
          classEndTimeMinutes:
            typeof classEndTimeMinutes === 'number' ? classEndTimeMinutes : null,
          eventType,
          venue: venue || null,
          address: address || null,
          city: city || null,
          stateRegion: stateRegion || null,
          country: country || null,
          citySlug: slugify(city),
          imageUrl: imageUrl || null,
          signedImageUrl: signedImageUrl || null,
          descriptionRaw: descriptionRaw || null,
          recurrence: recurrence || null,
        },
      });

      return NextResponse.json({ ok: true });
    }

    const {
      title,
      city,
      country,
      startDate,
      endDate,
      dateText,
      website,
      imageUrl,
      signedImageUrl,
      description,
      eventType,
    } = payload;

    if (!title || (!startDate && !dateText)) {
      return NextResponse.json(
        { error: 'Title and start date (or date text) are required.' },
        { status: 400 }
      );
    }

    await ref.update({
      updatedAt: now,
      payload: {
        title,
        city: city || null,
        country: country || null,
        startDate: startDate || null,
        endDate: endDate || startDate || null,
        dateText: dateText || null,
        website: website || null,
        imageUrl: imageUrl || null,
        signedImageUrl: signedImageUrl || null,
        description: description || null,
        eventType: eventType || 'festival',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update submission' },
      { status: 500 }
    );
  }
}
