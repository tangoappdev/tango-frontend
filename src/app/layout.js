import { Quicksand } from 'next/font/google'; // 1. Import Quicksand
import "./globals.css";

// 2. Configure the Quicksand font
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand', // 3. Assign it to a CSS variable
});

export const metadata = {
  title: "TangoDJ",
  description: "Your curated Tango music experience",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* 4. Apply the new font variable, keeping your other classes */}
      <body className={`${quicksand.variable} antialiased bg-[#30333a] text-white`}>
        <main className="flex flex-col justify-center items-center min-h-screen p-4">
          {children}
        </main>
      </body>
    </html>
  );
}