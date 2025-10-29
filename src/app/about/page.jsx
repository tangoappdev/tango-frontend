'use client';

import Link from 'next/link';
import Header from '@/components/Header';

const sections = [
  {
    heading: 'What we do',
    body: [
      'Virtual Tango DJ generates smart playlists that follow traditional milonga structure, balancing energy and mood while honoring orchestras, singers, and era. You set your preferences; Virtual Tango DJ curates, orders, and transitions.',
    ],
  },
  {
    heading: 'Highlights',
    list: [
      'Continuous flow: A queue engine balances tandas and cortinas so the music keeps moving without gaps.',
      'Manual & Upcoming queues: Add, remove, or reorder tandas; use quick actions like Play Next or Add to Queue.',
      'Session sync: Player state (queue snapshot, active mode, filters) syncs to your account so playback can resume across sessions.',
      'Liked collections: Favorite tandas and cortinas, drag to reorder, and keep your ordering across devices.',
      'Access tiers: New users start with a one-week trial; subscriptions are handled securely online.',
    ],
  },
  {
    heading: 'User settings at a glance',
    list: [
      'Player settings include options like Orchestra Type (e.g. Traditional Golden Age), Tanda Sequence (Mix, Just Tango, Just Vals, Just Milonga), Tango Tanda Length (3 or 4 songs), and Cortina options (45-second or full). These preferences are saved to your account so your musical flow picks up right where you left off.',
      'Queue personalization: Add/remove/reorder tandas in Manual and Upcoming queues; quick actions like Play Next and Add to Queue.',
      'Liked management: Favorite tandas/cortinas and drag to reorder; the ordering persists globally across devices.',
    ],
  },
  {
    heading: 'Plans & access',
    list: [
      'Free trial: One-week trial applied automatically on sign-up; header shows trial badge and days left.',
      'Pro: Unlock full access and advanced features anytime. Upgrade inside the app.',
    ],
  },
  {
    heading: 'Who it’s for',
    list: [
      'Dancers who want authentic practice sets at home.',
      'Teachers using music structure to improve musicality classes.',
      'Listeners who enjoy classic tango music organized beautifully.',
      'Community organizers who need reliable tandas for practicas or small events.',
      'DJs who want a fast starting point they can refine.',
    ],
  },
  {
    heading: 'Why it matters',
    body: [
      'Great milongas don’t happen by accident. They’re designed—with the right arc of energy, familiar orchestras, and musical conversation between tandas. Virtual Tango DJ brings that design to everyone, consistently.',
      'In social tango, music flow is everything — yet not everyone has access to a skilled DJ. Many organizers and dancers struggle to create tandas that feel natural, emotional, and danceable. Good tango DJs are rare, and not every city has one available for every practica, small event, or spontaneous gathering. Sometimes a DJ cancels last minute. Sometimes the music isn’t fresh — the same tandas appear in the same order at every milonga, or classes always begin with the same songs. Virtual Tango DJ introduces natural musical variety, so every session feels alive without losing authentic structure.',
      'And while there are hundreds of tango recordings, not all of them are good for dancing. Virtual Tango DJ ensures that every selected track is danceable — no more skipping songs until you find one that works. The music simply flows, tanda after tanda.',
    ],
  },
  {
    heading: 'How it works (in a tanda’s time)',
    list: [
      'Choose a mode & basics: pick your active mode and category filters; set tanda length and whether to include cortinas (full-length or short).',
      'Generate & queue: the app builds the next valid tanda and keeps the queue flowing.',
      'Tweak on the fly: like, reorder, Play Next, or add tandas from your liked list.',
      'Resume anytime: your queue and player settings are saved to your account and restored on return.',
    ],
  },
  {
    heading: 'What we value',
    list: [
      'Musical authenticity: Honor tango’s lineage without exposing private categorization logic.',
      'Tango music for dancers: Only danceable music. Always.',
      'Dancer-first UX: Fewer clicks, clear queues, continuous flow.',
      'Transparency: Clear about plans, trials, and billing.',
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center bg-[#30333a] px-4 pb-16 pt-12 text-gray-100 sm:px-6 lg:px-10">
        <div className="w-full max-w-5xl space-y-10">
          <header className="space-y-5 text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#25edda]/40 bg-[#252b33] px-5 py-2 text-[11px] uppercase tracking-[0.35em] text-[#25edda]">
              About Virtual Tango DJ
            </div>
            <h1 className="text-4xl font-semibold text-white sm:text-[3.25rem]">
              Curated Tango Music, On Demand
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg">
              Virtual Tango DJ is a music app that automatically creates authentic tango tandas based on your preferences, giving you real dance flow whether you&apos;re practicing at home or hosting a pop-up milonga.
            </p>
          </header>

          <div className="grid gap-6 sm:gap-8">
            {sections.map((section) => (
              <section
                key={section.heading}
                className="group rounded-3xl border border-white/15 bg-[#242930] p-7 transition-transform duration-300 hover:-translate-y-1 hover:border-[#25edda]/50 hover:bg-[#2b3139] sm:p-9"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-semibold text-white sm:text-3xl">{section.heading}</h2>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gray-500 group-hover:border-[#25edda]/50 group-hover:text-[#25edda]">
                    {section.heading.length > 12 ? `${section.heading.slice(0, 12)}…` : section.heading}
                  </span>
                </div>
                <div className="mt-5 space-y-3 text-base leading-relaxed text-gray-300">
                  {section.body &&
                    section.body.map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  {section.list && (
                    <ul className="space-y-2 rounded-2xl border border-white/10 bg-[#1b1f25] p-5 text-sm text-gray-300 sm:text-base">
                      {section.list.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#25edda]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <section className="rounded-3xl border border-[#25edda]/40 bg-[#20252c] p-8 text-gray-200 sm:p-10">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Press & contact</h2>
            <div className="mt-4 grid gap-4 text-sm text-gray-200 sm:grid-cols-2 sm:text-base">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Contact</p>
                <Link
                  href="mailto:tangoapp.official@gmail.com"
                  className="mt-1 inline-flex items-center gap-2 text-[#25edda] transition-colors hover:text-[#22cbbf]"
                >
                  tangoapp.official@gmail.com
                </Link>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Last updated</p>
                <p className="mt-1 text-gray-200">10/23/2025</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
