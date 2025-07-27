import { Quicksand } from 'next/font/google';
import "./globals.css";

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
});

// --- This part remains the same ---
export const metadata = {
  title: "TangoDJ",
  description: "Your curated Tango music experience",
};

// --- CHANGE #1: Added this viewport export to disable zooming ---
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} antialiased bg-[#30333a] text-white`}>
        {/* --- CHANGE #2: Removed the <main> tag from here for a cleaner structure --- */}
        {children}
      </body>
    </html>
  );
}