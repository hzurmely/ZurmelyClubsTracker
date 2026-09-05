import './globals.css';
import Nav from '@/components/Nav';
import { SITE } from '@/lib/config';

export const metadata = {
  title: {
    default: `${SITE.name} · Pro Clubs Analytics`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.tagline,
};

export const viewport = {
  themeColor: '#07080b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap stack">
            <div className="row spread row-wrap" style={{ gap: 16 }}>
              <span>
                {SITE.name} · projeto de fã, sem qualquer vínculo com a Electronic Arts.
                Dados vindos da API pública de Pro Clubs da EA.
              </span>
              <span>EA FC 26</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
