import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import {NextIntlClientProvider} from "next-intl";
import {cookies} from "next/headers";
import { VercelInsightsConsent } from "@/components/privacy/VercelInsightsConsent";
import "./globals.css";

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
    icon: [
      {url: "/favicon.ico"},
      {url: "/favicon-32x32.png", sizes: "32x32", type: "image/png"},
      {url: "/favicon-16x16.png", sizes: "16x16", type: "image/png"},
    ],
    shortcut: "/favicon.ico",
    apple: [{url: "/apple-touch-icon.png", sizes: "180x180"}],
  },
  manifest: "/site.webmanifest",
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const storedLocale = (await cookies()).get("site-locale")?.value;
  const locale = storedLocale === "en" ? "en" : "fr";
  const messages = (await import(`../messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body className={roboto.variable}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <VercelInsightsConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
