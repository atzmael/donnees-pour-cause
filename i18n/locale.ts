import {cookies, headers} from "next/headers";

export type Locale = "fr" | "en";

const DEFAULT_LOCALE: Locale = "fr";

function getBrowserLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const preferredLanguages = acceptLanguage
    .split(",")
    .map((entry) => {
      const [language, quality = "q=1"] = entry.trim().split(";");
      return {
        language: language.toLowerCase().split("-")[0],
        quality: Number(quality.replace("q=", "")) || 0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  const match = preferredLanguages.find(({language}) =>
    language === "fr" || language === "en",
  );

  return match?.language === "en" ? "en" : DEFAULT_LOCALE;
}

export async function getUserLocale(): Promise<Locale> {
  const storedLocale = (await cookies()).get("site-locale")?.value;
  if (storedLocale === "fr" || storedLocale === "en") return storedLocale;

  return getBrowserLocale((await headers()).get("accept-language"));
}
