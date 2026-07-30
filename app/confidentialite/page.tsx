import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Données en cause",
};

export default function ConfidentialitePage() {
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
        <h2>Mesure d’audience et de performance</h2>
        <p>
          Avec le consentement du visiteur uniquement, le site charge Vercel Web
          Analytics. Ce service transmet à Vercel des données agrégées relatives
          aux pages consultées :
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
          <div><dt>Finalité</dt><dd>Mesurer l’audience et améliorer les performances du site.</dd></div>
          <div><dt>Base juridique</dt><dd>Consentement, article 6, paragraphe 1, point a du RGPD.</dd></div>
          <div><dt>Destinataire</dt><dd>Maël Maltete et Vercel Inc., prestataire technique.</dd></div>
          <div><dt>Déclenchement</dt><dd>Aucun script de mesure n’est chargé avant acceptation.</dd></div>
        </dl>
      </section>

      <section>
        <h2>Durées de conservation</h2>
        <p>
          La préférence de consentement est conservée dans le stockage local du
          navigateur jusqu’à sa modification par le visiteur ou à la suppression
          des données du navigateur.
        </p>
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
          Le visiteur peut refuser la mesure d’audience sans conséquence sur
          l’accès au site. Il peut modifier son choix à tout moment depuis le lien
          « Gérer mes préférences » présent dans le pied de page.
        </p>
        <p>
          Dans les limites prévues par le RGPD, toute personne peut demander
          l’accès, la rectification, l’effacement ou la limitation de ses données,
          s’opposer à un traitement et retirer son consentement. Les demandes sont
          adressées à{" "}
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
