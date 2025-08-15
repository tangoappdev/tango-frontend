import { Quicksand } from 'next/font/google'
import './globals.css'

const quicksand = Quicksand({ subsets: ['latin'] })

// --- THIS IS THE NEW PART ---
// This object provides the title and description for search engines and browser tabs.
export const metadata = {
  title: 'Virtual Tango DJ | The Authentic Milonga Experience',
  description: 'Enjoy a unique, tailored, and auto-generated tanda list every time. Easily get and enjoy dancing an endless stream of carefully curated and perfectly sequenced tandas (Tango, Vals, Milonga) and cortinas for social dancing, practice, and teaching.',
}
// --- END OF NEW PART ---

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${quicksand.className} bg-[#30333a]`}>
        {children}
      </body>
    </html>
  )
}
