"use client";

import { useEffect, useState } from "react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Button } from "@/components/ui";

type ConsentChoice = "granted" | "denied" | null;

const STORAGE_KEY = "donnees-en-cause-analytics-consent";
const OPEN_PREFERENCES_EVENT = "open-analytics-preferences";

export function openAnalyticsPreferences() {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

export function VercelInsightsConsent() {
  const t = useTranslations("Consent");
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [isReady, setIsReady] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const initialization = window.setTimeout(() => {
      const storedChoice = window.localStorage.getItem(STORAGE_KEY);
      if (storedChoice === "granted" || storedChoice === "denied") {
        setChoice(storedChoice);
      }
      setIsReady(true);
    }, 0);

    const openPreferences = () => setPreferencesOpen(true);
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    return () => {
      window.clearTimeout(initialization);
      window.removeEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  const saveChoice = (nextChoice: Exclude<ConsentChoice, null>) => {
    window.localStorage.setItem(STORAGE_KEY, nextChoice);
    setChoice(nextChoice);
    setPreferencesOpen(false);
  };

  const showPanel = isReady && (choice === null || preferencesOpen);

  return (
    <>
      {choice === "granted" && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}

      {showPanel && (
        <aside
          className="consent-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="consent-title"
          aria-describedby="consent-description"
        >
          <div>
            <p className="kicker">{t("kicker")}</p>
            <h2 id="consent-title">{t("title")}</h2>
            <p id="consent-description">
              {t("description")}
            </p>
            <Link href="/confidentialite">{t("more")}</Link>
          </div>
          <div className="consent-actions">
            <Button variant="outline" onClick={() => saveChoice("denied")}>
              {t("deny")}
            </Button>
            <Button variant="primary" onClick={() => saveChoice("granted")}>
              {t("accept")}
            </Button>
          </div>
        </aside>
      )}
    </>
  );
}
