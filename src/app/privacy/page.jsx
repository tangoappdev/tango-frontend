'use client';

import Link from 'next/link';
import Header from '@/components/Header';

const LAST_UPDATED = 'October 28, 2025';

const sections = [
  {
    heading: 'Overview',
    body: [
      'This Privacy Policy explains how Virtual Tango DJ (“VTDJ”, “we”, “us”) collects, uses, and safeguards personal information when you visit our website, create an account, or interact with the Virtual Tango DJ player.',
      'By using the service you consent to the data practices described here. If you disagree with any portion of this policy, please discontinue use of the service.',
    ],
  },
  {
    heading: 'Information we collect',
    list: [
      'Account data: name, email address, authentication identifiers, subscription tier, and billing status.',
      'Playback data: queue state, settings, liked tandas/cortinas, and the timestamp of your most recent “play” action.',
      'Approximate location: city, region, country, and timezone derived from the IP address associated with recent activity. We do not store precise latitude/longitude coordinates.',
      'Device and usage data: browser type, operating system, feature usage, error logs, and support communications.',
      'Billing data: handled by our payment processor (Stripe). We store references such as Stripe customer or subscription IDs, but do not retain full payment card numbers.',
    ],
  },
  {
    heading: 'How we use information',
    list: [
      'Deliver and personalize the music player, queue management, and account features you request.',
      'Persist session state so your queue, liked items, and settings travel with you across devices.',
      'Detect suspicious activity, enforce entitlements, and protect the service from misuse.',
      'Understand aggregate usage patterns to improve reliability, design, and feature prioritization.',
      'Communicate with you about updates, billing events, and support inquiries.',
    ],
  },
  {
    heading: 'Location data from IP addresses',
    body: [
      'When you interact with the player we capture the apparent public IP address in server logs. We may look up a coarse location (city, region, and country) using a third-party geolocation provider to help us understand where the service is used and to assist with account security.',
      'We do not attempt to resolve precise street-level location, and we ignore clearly private or local network addresses.',
      'Location lookups are stored alongside your account as part of the “last activity” record shown to administrators. This information is not shared publicly.',
    ],
  },
  {
    heading: 'Cookies and similar technologies',
    body: [
      'We use first-party cookies to maintain session authentication, remember preferences, and keep you signed in across visits.',
      'Third-party cookies may be set by our payment processor (Stripe) during checkout interactions. You can manage cookie preferences through your browser settings, but disabling essential cookies may limit functionality.',
    ],
  },
  {
    heading: 'Data sharing',
    list: [
      'Service providers: We rely on trusted vendors for hosting (e.g., Firebase, Google Cloud), payments (Stripe), analytics, and customer support. These providers only receive information necessary to perform their services.',
      'Legal compliance: We may disclose information if required by law, court order, or governmental request, or to protect our rights, users, or the public.',
      'Business transfers: If Virtual Tango DJ is involved in a merger, acquisition, or asset sale, user information may be transferred as part of that transaction with appropriate safeguards.',
    ],
  },
  {
    heading: 'Data retention',
    body: [
      'We retain account records and playback metadata for as long as your account is active and for a reasonable period thereafter for backup, dispute resolution, and legal compliance. You may request account deletion, which will remove or anonymize personal information where retention is not required by law.',
    ],
  },
  {
    heading: 'Security',
    body: [
      'We implement organizational and technical measures—including access controls, encryption in transit, and monitoring—to protect personal data. No method of transmission or storage is completely secure, and we cannot guarantee absolute security. If we become aware of unauthorized access, we will notify affected users when required by law.',
    ],
  },
  {
    heading: 'Your choices and rights',
    list: [
      'Access, update, or delete account data by visiting your profile or contacting support.',
      'Opt out of promotional emails by following the unsubscribe link in our communications.',
      'Disable cookies through your browser settings. Essential cookies are required for authentication.',
      'Request a copy of the data we hold about you or ask us to correct inaccuracies by emailing support.',
    ],
  },
  {
    heading: 'International transfers',
    body: [
      'Virtual Tango DJ is operated from the United States. If you access the service from outside the U.S., you consent to transferring and processing your information in the U.S. and other jurisdictions where our providers operate.',
    ],
  },
  {
    heading: 'Children',
    body: [
      'The service is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can delete it.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy to reflect operational, legal, or regulatory changes. Material updates will be communicated via email or in-app notifications. Continued use after the effective date constitutes acceptance of the revised policy.',
    ],
  },
  {
    heading: 'Contact us',
    body: [
      <>
        For privacy questions or requests, email{' '}
        <Link href="mailto:privacy@virtualtangodj.com" className="text-[#25edda] hover:underline">
          privacy@virtualtangodj.com
        </Link>
        .
      </>,
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="bg-[#1f2126] px-6 py-16 text-white sm:px-10">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
          <header className="space-y-4 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#25edda]">Legal</p>
            <h1 className="text-4xl font-semibold leading-tight">Privacy Policy</h1>
            <p className="text-sm text-gray-300">Last updated: {LAST_UPDATED}</p>
          </header>

          <section className="space-y-10">
            {sections.map((section) => (
              <article key={section.heading} className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">{section.heading}</h2>
                {section.body && (
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-200">
                    {section.body.map((paragraph, idx) => (
                      <p key={idx}>{typeof paragraph === 'string' ? paragraph : paragraph}</p>
                    ))}
                  </div>
                )}
                {section.list && (
                  <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-200">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#25edda]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
