import DayTabs from './DayTabs';
import RecurringEvents from './RecurringEvents';
import { buildEventSchema } from './schema';
import { getEventsByCity } from './data';

export default async function CityGuide({ citySlug }) {
  const { groupedEvents, recurringEvents } = await getEventsByCity(citySlug);
  const schema = buildEventSchema({ citySlug, groupedEvents });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {groupedEvents.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          No upcoming events found yet. Please check back soon.
        </div>
      ) : (
        <DayTabs groupedEvents={groupedEvents} citySlug={citySlug} />
      )}

      <RecurringEvents events={recurringEvents} />
    </>
  );
}
