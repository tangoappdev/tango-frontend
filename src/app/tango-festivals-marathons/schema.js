export const buildFestivalSchema = (festivals) => {
  const items = (festivals || []).map((festival) => {
    const location = {
      '@type': 'Place',
      name: festival.city || festival.country || festival.title,
      address: {
        '@type': 'PostalAddress',
        ...(festival.city ? { addressLocality: festival.city } : {}),
        ...(festival.country ? { addressCountry: festival.country } : {}),
      },
    };

    return {
      '@type': 'Event',
      name: festival.title,
      startDate: festival.startDate || festival.dateText || undefined,
      endDate: festival.endDate || festival.startDate || undefined,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location,
      ...(festival.imageUrl ? { image: [festival.imageUrl] } : {}),
      ...(festival.website ? { url: festival.website } : {}),
    };
  });

  return {
    '@context': 'https://schema.org',
    '@graph': items,
  };
};

