import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import {NextIntlClientProvider} from "next-intl";
import {Analytics} from "@vercel/analytics/next";
import {getUserLocale} from "@/i18n/locale";
import {buildMetadata} from "@/lib/metadata";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({locale: await getUserLocale()});
}

export const viewport: Viewport = {
  themeColor: "#2F6B3F",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getUserLocale();
  const messages = (await import(`../messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body className={roboto.variable}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
