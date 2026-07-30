import {getRequestConfig} from "next-intl/server";
import {cookies} from "next/headers";

export default getRequestConfig(async () => {
  const storedLocale = (await cookies()).get("site-locale")?.value;
  const locale = storedLocale === "en" ? "en" : "fr";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
