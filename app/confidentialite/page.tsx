import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import {getUserLocale} from "@/i18n/locale";
import {buildMetadata} from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  return buildMetadata({
    locale,
    path: "/confidentialite",
    title: locale === "fr" ? "Politique de confidentialité — Données en cause" : "Privacy policy — Données en cause",
    description:
      locale === "fr"
        ? "Données traitées, mesure d’audience sans cookie et droits des visiteurs du site Données en cause."
        : "Data processing, cookie-free audience measurement and visitor rights on the Données en cause website.",
  });
}

export default async function ConfidentialitePage() {
  const locale = await getUserLocale();
  if (locale === "en") {
    return (
      <LegalPage title="Privacy policy" description="This page describes the data that may be processed when visiting the website and the choices available to visitors.">
        <section><h2>Data controller</h2><p>The data controller is Maël Maltete, a sole trader who can be contacted at <a href="mailto:creadiv.tech+dpc@gmail.com">creadiv.tech+dpc@gmail.com</a>.</p></section>
        <section><h2>Data provided directly</h2><p>Données en cause currently offers no user accounts, forms, newsletters, comments or file uploads. It therefore collects no personal data directly from visitors.</p></section>
        <section><h2>Language preference</h2><p>The functional <code>site-locale</code> cookie stores the visitor’s French or English selection for one year. It is strictly necessary for the requested language preference, is not used for tracking and does not require consent.</p></section>
        <section><h2>Audience measurement</h2><p>The website uses Vercel Web Analytics, a cookie-free audience measurement service. It sends Vercel aggregate information about viewed pages: URL and route, date and time, referrer, filtered parameters, approximate country, browser, operating system, device type and Analytics script version.</p><p>According to Vercel’s documentation, these measurements are not linked to an identity or IP address and cannot reconstruct an individual journey across websites.</p><dl><div><dt>Purpose</dt><dd>Understand traffic and viewed content in order to improve the website.</dd></div><div><dt>Legal basis</dt><dd>The publisher’s legitimate interest in measuring website traffic.</dd></div><div><dt>Recipients</dt><dd>Maël Maltete and Vercel Inc., the technical provider.</dd></div><div><dt>Tracker</dt><dd>Vercel Web Analytics does not use cookies.</dd></div></dl></section>
        <section><h2>Retention periods</h2><p>Statistics availability depends on the active Vercel plan. At the date of this policy, Vercel announces one month for Hobby, twelve months for Pro and up to twenty-four months for certain higher plans. Vercel may retain data longer to support plan changes.</p></section>
        <section><h2>Technical logs and security</h2><p>Like any hosting provider, Vercel may process technical logs needed for delivery, security and abuse prevention. This processing is based on the legitimate interest in maintaining service security and availability. Retention depends on the hosting plan and configuration.</p></section>
        <section><h2>Transfers outside the European Union</h2><p>Vercel Inc. is based in the United States. Vercel states that transfers are governed by its data processing agreement, applicable contractual clauses and certification under the EU–US Data Privacy Framework.</p></section>
        <section><h2>Your choices and rights</h2><p>Within the limits of the GDPR, anyone may request access, correction, deletion or restriction of their data and may object to processing, including audience measurement. Requests should be sent to <a href="mailto:creadiv.tech+dpc@gmail.com">creadiv.tech+dpc@gmail.com</a>.</p><p>A complaint may also be lodged with the French <a href="https://www.cnil.fr/en" target="_blank" rel="noopener noreferrer">data protection authority (CNIL)</a>.</p></section>
        <section><h2>Changes to this policy</h2><p>This policy will be updated if the website’s features, providers or processing activities change. The update date appears at the top of the page.</p></section>
      </LegalPage>
    );
  }
  return (
    <LegalPage
      title="Politique de confidentialité"
      description="Cette page décrit les données susceptibles d’être traitées lors de la consultation du site et les choix laissés aux visiteurs."
    >
      <section>
        <h2>Responsable du traitement</h2>
        <p>
          Le responsable du traitement est Maël Maltete, entrepreneur individuel,
          joignable à{" "}
          <a href="mailto:creadiv.tech+dpc@gmail.com">creadiv.tech+dpc@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>Données fournies directement</h2>
        <p>
          Données en cause ne propose actuellement ni compte utilisateur, ni
          formulaire, ni newsletter, ni commentaire, ni dépôt de fichier. Le
          site ne collecte donc aucune donnée personnelle directement auprès de
          ses visiteurs.
        </p>
      </section>

      <section>
        <h2>Préférence de langue</h2>
        <p>
          Le cookie fonctionnel <code>site-locale</code> mémorise le choix entre
          le français et l’anglais pendant un an. Il est strictement nécessaire
          à la personnalisation linguistique demandée par le visiteur, n’est pas
          utilisé à des fins de suivi et ne requiert pas de consentement.
        </p>
      </section>

      <section>
        <h2>Mesure d’audience</h2>
        <p>
          Le site utilise Vercel Web Analytics, une solution de mesure d’audience
          sans cookie qui transmet à Vercel des données agrégées relatives aux
          pages consultées :
          URL et route, date et heure, référent, paramètres filtrés, pays
          approximatif, navigateur, système d’exploitation, type d’appareil,
          et version du script Analytics.
        </p>
        <p>
          Selon sa documentation, Vercel n’associe pas ces mesures à une identité
          ou à une adresse IP et ne permet pas de reconstruire une navigation
          individuelle entre plusieurs sites.
        </p>
        <dl>
          <div><dt>Finalité</dt><dd>Comprendre la fréquentation et les contenus consultés afin d’améliorer le site.</dd></div>
          <div><dt>Base juridique</dt><dd>Intérêt légitime de l’éditeur à mesurer la fréquentation de son site.</dd></div>
          <div><dt>Destinataire</dt><dd>Maël Maltete et Vercel Inc., prestataire technique.</dd></div>
          <div><dt>Traceur</dt><dd>Vercel Web Analytics n’utilise pas de cookie.</dd></div>
        </dl>
      </section>

      <section>
        <h2>Durées de conservation</h2>
        <p>
          La fenêtre de consultation des statistiques dépend du forfait Vercel
          actif. À la date de mise à jour de cette politique, elle est annoncée
          comme étant d’un mois pour l’offre Hobby, douze mois pour l’offre Pro
          et jusqu’à vingt-quatre mois pour certaines offres supérieures. Vercel
          indique pouvoir conserver des données plus longtemps à des fins de
          changement d’offre.
        </p>
      </section>

      <section>
        <h2>Journaux techniques et sécurité</h2>
        <p>
          Comme tout hébergeur, Vercel peut traiter des journaux techniques
          nécessaires à la diffusion, à la sécurité et à la protection contre les
          abus. Ce traitement relève de l’intérêt légitime à assurer la sécurité
          et la disponibilité du service. Leur conservation dépend de l’offre et
          de la configuration de l’hébergement.
        </p>
      </section>

      <section>
        <h2>Transferts hors de l’Union européenne</h2>
        <p>
          Vercel Inc. est établi aux États-Unis. Vercel indique encadrer les
          transferts de données au moyen de son accord de traitement des données,
          des clauses contractuelles applicables et de sa certification au cadre
          de protection des données UE–États-Unis.
        </p>
      </section>

      <section>
        <h2>Vos choix et vos droits</h2>
        <p>
          Dans les limites prévues par le RGPD, toute personne peut demander
          l’accès, la rectification, l’effacement ou la limitation de ses données,
          ainsi que s’opposer à un traitement, notamment à la mesure d’audience.
          Les demandes sont adressées à{" "}
          <a href="mailto:creadiv.tech+dpc@gmail.com">creadiv.tech+dpc@gmail.com</a>.
        </p>
        <p>
          Une réclamation peut également être déposée auprès de la{" "}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            Commission nationale de l’informatique et des libertés (CNIL)
          </a>.
        </p>
      </section>

      <section>
        <h2>Évolution de cette politique</h2>
        <p>
          Cette politique sera mise à jour si les fonctionnalités, prestataires
          ou traitements du site évoluent. La date de mise à jour figure en haut
          de la page.
        </p>
      </section>
    </LegalPage>
  );
}
