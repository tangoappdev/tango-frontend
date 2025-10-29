'use client';

import Link from 'next/link';
import Header from '@/components/Header';

const LAST_UPDATED = 'October 28, 2025';

const sections = [
  {
    heading: 'Acceptance of terms',
    body: [
      'These Terms of Service (“Terms”) govern your access to and use of Virtual Tango DJ (“VTDJ”, “we”, “us”, or “our”). By creating an account, accessing the player, or using any portion of the service you agree to be bound by these Terms. If you do not agree, do not use the service.',
    ],
  },
  {
    heading: 'Service overview',
    list: [
      'Virtual Tango DJ provides tools to generate, manage, and play curated tango tandas and cortinas for social, practice, and teaching settings.',
      'The service includes a web-based player, playlist queue management, cortina scheduling, liked collections, and subscription management.',
      'We may add, modify, or remove features at any time to improve reliability, security, or the overall user experience.',
    ],
  },
  {
    heading: 'Accounts and eligibility',
    list: [
      'You must be at least 18 years old, or the age of legal majority in your jurisdiction, to create an account.',
      'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.',
      'We reserve the right to suspend or terminate accounts that breach these Terms or that we believe may jeopardize the security or experience of other users.',
    ],
  },
  {
    heading: 'Subscriptions, trials, and billing',
    list: [
      'Free trials provide temporary access to pro functionality. Trial length, included features, and availability are subject to change.',
      'Paid subscriptions unlock premium functionality. Billing, renewals, and cancellations are handled by our payment processor (Stripe). Applicable taxes are your responsibility.',
      'If a charge fails or your subscription lapses, access to certain features may be suspended until payment is resolved. No refunds or credits are provided for partial billing periods unless required by law.',
    ],
  },
  {
    heading: 'User responsibilities',
    list: [
      'Use the service in accordance with applicable laws, venue requirements, and music licensing obligations in your region.',
      'Do not attempt to reverse engineer, scrape, or interfere with the service or infrastructure.',
      'Do not upload or transmit content that you do not have the right to share, including copyrighted music or artwork.',
      'Respect rate limits and refrain from automated usage that could degrade service performance.',
    ],
  },
  {
    heading: 'Player activity & analytics',
    body: [
      'We record limited playback metadata—such as the timestamp of your last “play” action, IP-derived approximate location, and device/browser information—to keep your account in sync, detect abuse, and provide administrative insight. For details on how data is handled, see our Privacy Policy.',
    ],
  },
  {
    heading: 'Intellectual property',
    list: [
      'All software, branding, and content furnished by Virtual Tango DJ remain our exclusive property.',
      'You retain ownership of any user-generated content (e.g., custom cortina metadata) but grant us a non-exclusive license to use it for operating the service.',
    ],
  },
  {
    heading: 'Acceptable use and prohibited conduct',
    list: [
      'Do not misuse the service to harass, defraud, or otherwise harm others.',
      'Do not attempt unauthorized access to other accounts or the underlying infrastructure.',
      'Do not perform load testing, penetration testing, or security research without prior written approval.',
      'Do not resell or sub-license the service unless you have an explicit written agreement with us.',
    ],
  },
  {
    heading: 'Termination',
    body: [
      'You may stop using the service at any time. We may suspend or terminate access immediately if you breach these Terms or if your usage presents risk to the service or other users.',
      'Upon termination, your right to access the service ends. Certain provisions—including ownership, disclaimers, limitations of liability, and dispute terms—survive termination.',
    ],
  },
  {
    heading: 'Disclaimers',
    body: [
      'The service is provided on an “as is” and “as available” basis without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.',
      'We do not guarantee uninterrupted service, error-free operation, or that the player will meet your specific performance requirements.',
    ],
  },
  {
    heading: 'Limitation of liability',
    body: [
      'To the maximum extent permitted by law, Virtual Tango DJ and its affiliates are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, goodwill, data, or use.',
      'Our aggregate liability for any claim arising out of or relating to your use of the service is limited to the greater of (a) the amount you paid to us in the six months preceding the claim, or (b) USD $50.',
    ],
  },
  {
    heading: 'Governing law and venue',
    body: [
      'These Terms are governed by the laws of the State of California, United States, without regard to conflict of laws principles. Any disputes will be resolved exclusively in the state or federal courts located in San Francisco County, California.',
    ],
  },
  {
    heading: 'Changes to these terms',
    body: [
      'We may update these Terms from time to time. Material changes will be communicated via email or in-app notice. Continued use after changes take effect constitutes acceptance of the revised Terms.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      <>
        Questions about these Terms can be sent to{' '}
        <Link href="mailto:support@virtualtangodj.com" className="text-[#25edda] hover:underline">
          support@virtualtangodj.com
        </Link>
        .
      </>,
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <>
      <Header />
      <main className="bg-[#1f2126] px-6 py-16 text-white sm:px-10">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
          <header className="space-y-4 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#25edda]">Legal</p>
            <h1 className="text-4xl font-semibold leading-tight">Terms of Service</h1>
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
