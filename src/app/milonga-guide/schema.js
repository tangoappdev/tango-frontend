const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined) return null;
  const hrs24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
};

const toTitle = (value) =>
  (value || '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const buildEventSchema = ({ citySlug, groupedEvents }) => {
  const events = [];
  groupedEvents.forEach(([date, items]) => {
    items.forEach((event) => {
      const startTime = formatMinutes(event.startTimeMinutes);
      const endTime = formatMinutes(event.endTimeMinutes);
      const startDate = startTime ? `${date}T${startTime}` : date;
      const endDate = endTime ? `${date}T${endTime}` : date;
      const locality = event.address || event.venue ? undefined : toTitle(citySlug);
      const location = {
        '@type': 'Place',
        name: event.venue || toTitle(citySlug),
        address: {
          '@type': 'PostalAddress',
          ...(event.address ? { streetAddress: event.address } : {}),
          ...(locality ? { addressLocality: locality } : {}),
        },
      };

      events.push({
        '@type': 'Event',
        name: event.title,
        startDate,
        endDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location,
        ...(event.imageUrl ? { image: [event.imageUrl] } : {}),
        ...(event.descriptionRaw ? { description: event.descriptionRaw } : {}),
      });
    });
  });

  return {
    '@context': 'https://schema.org',
    '@graph': events,
  };
};

