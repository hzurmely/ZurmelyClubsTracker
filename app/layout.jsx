import './globals.css';
import Nav from '@/components/Nav';
import I18nProvider from '@/components/I18nProvider';
import { SITE } from '@/lib/config';
import { currentLanguage } from '@/lib/i18n/server';
import { dictionaryFor } from '@/lib/i18n/dictionaries';

export const metadata = {
  title: {
    default: `${SITE.name} · Pro Clubs Analytics`,
    template: `%s · ${SITE.name}`,
  },
};

export const viewport = {
  themeColor: '#07080b',
};

export default async function RootLayout({ children }) {
  const lang = await currentLanguage();
  const dic = dictionaryFor(lang);

  return (
    <html lang={dic.htmlLang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider lang={lang}>
          <Nav />
          <main>{children}</main>
          <footer className="footer">
            <div className="wrap stack">
              <div className="row spread row-wrap" style={{ gap: 16 }}>
                <span>
                  {SITE.name} · {dic.footer.note}
                </span>
                <span>EA FC 26</span>
              </div>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
