import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";
import { VercelInsightsConsent } from "@/components/privacy/VercelInsightsConsent";
import {routing} from "@/i18n/routing";
import "../globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

const title = "index/data — Collection de datavisualisations";
const description =
  "Une collection vivante de datavisualisations en Canvas, 3D, charts et cartographie.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title,
  description,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{locale: string}> }>) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className={roboto.variable}>
        <NextIntlClientProvider>
          {children}
          <VercelInsightsConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
