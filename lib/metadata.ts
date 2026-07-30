import type {Metadata} from "next";
import type {Locale} from "@/i18n/locale";

export function getSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (!configured) return new URL("http://localhost:3000");
  return new URL(configured.startsWith("http") ? configured : `https://${configured}`);
}

const copy = {
  fr: {
    title: "Données en cause — Outils et visualisations engagées",
    description:
      "Répertoire d’outils et de visualisations engagées. Des données pour éclairer les enjeux de notre époque.",
    image: "/og-fr.png",
    imageAlt: "Données en cause — Outils et visualisations pour éclairer notre époque",
  },
  en: {
    title: "Données en cause — Engaged tools and data visualizations",
    description:
      "A directory of engaged tools and data visualizations. Data to shed light on the issues of our time.",
    image: "/og-en.png",
    imageAlt: "Données en cause — Tools and visualizations to shed light on our times",
  },
} satisfies Record<Locale, Record<string, string>>;

export function buildMetadata({
  locale,
  title,
  description,
  path = "/",
  image,
  imageAlt,
}: {
  locale: Locale;
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  imageAlt?: string;
}): Metadata {
  const localized = copy[locale];
  const resolvedTitle = title ?? localized.title;
  const resolvedDescription = description ?? localized.description;
  const resolvedImage = image ?? localized.image;
  const resolvedImageAlt = imageAlt ?? localized.imageAlt;
  const resolvedImageSize = image
    ? {width: 1536, height: 1024}
    : {width: 1732, height: 909};

  return {
    metadataBase: getSiteUrl(),
    title: resolvedTitle,
    description: resolvedDescription,
    applicationName: "Données en cause",
    authors: [{name: "Maël Maltete", url: "https://creadiv.fr"}],
    creator: "Maël Maltete",
    publisher: "Données en cause",
    category: "Data visualization",
    keywords:
      locale === "fr"
        ? ["données", "datavisualisation", "outils", "cartographie", "enjeux contemporains"]
        : ["data", "data visualization", "tools", "mapping", "contemporary issues"],
    alternates: {canonical: path},
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
      type: "website",
      url: path,
      siteName: "Données en cause",
      title: resolvedTitle,
      description: resolvedDescription,
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? ["en_US"] : ["fr_FR"],
      images: [{url: resolvedImage, ...resolvedImageSize, alt: resolvedImageAlt}],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [{url: resolvedImage, alt: resolvedImageAlt}],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}
