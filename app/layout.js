import './globals.css';
import { Play, Playfair_Display } from 'next/font/google';
import Header from './components/header/header';
import Footer from './components/footer/footer';
import Providers from './components/Providers';
import PwaRegister from './components/pwa-register';
import { site } from '@/lib/site';

// Self-hosted fonts: no render-blocking Google Fonts request, no layout shift.
// Play only comes in 400 and 700; browsers round other weights to the nearest one.
const play = Play({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
  display: 'swap',
});

// Variable font (400–900), standing in for the Neom lettering used in the logo.
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata = {
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  manifest: '/manifest.webmanifest',
  applicationName: site.name,
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: '#0b0b0d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${play.variable} ${playfair.variable}`}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
