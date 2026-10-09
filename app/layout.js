import './globals.css';
import Header from './components/header/header';
import Footer from './components/footer/footer';
import Providers from './components/Providers';
import { site } from '@/lib/site';

export const metadata = {
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
