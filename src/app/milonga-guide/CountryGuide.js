import DayTabs from './DayTabs';
import RecurringEvents from './RecurringEvents';
import { getEventsByCountry } from './data';

export default async function CountryGuide({ countrySlug }) {
  const { groupedEvents, recurringEvents } = await getEventsByCountry(countrySlug);

  if (groupedEvents.length === 0 && recurringEvents.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
        No upcoming events found yet. Please check back soon.
      </div>
    );
  }

  return (
    <>
      <DayTabs groupedEvents={groupedEvents} citySlug={null} timeZone="UTC" showCity />
      <RecurringEvents events={recurringEvents} />
    </>
  );
}
