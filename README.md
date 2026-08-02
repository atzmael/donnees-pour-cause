# DONNÉES EN CAUSE

**Répertoire de visualisations engagées**

Des données pour éclairer les enjeux de notre époque.

## Pourquoi

Les données structurent une part croissante du débat public, mais elles restent
souvent difficiles à lire, isolées de leur contexte ou réduites à quelques
chiffres.

**DONNÉES EN CAUSE** est un répertoire éditorial de datavisualisations. Chaque
projet part d’une question contemporaine et cherche la forme visuelle la plus
juste pour la rendre compréhensible : graphique, cartographie, canvas, 3D ou
expérience interactive.

La plateforme poursuit trois objectifs :

- rendre des données complexes accessibles sans les simplifier à l’excès ;
- relier les chiffres aux enjeux humains, sociaux et environnementaux qu’ils
  décrivent ;
- proposer des expériences visuelles ouvertes, partageables et documentées.

Il ne s’agit pas d’un outil permettant aux visiteurs de fabriquer des
graphiques. Le site publie une collection de récits visuels conçus
individuellement.

## Comment fonctionne la plateforme

L’accueil joue le rôle d’un index éditorial. Il présente les projets comme les
articles d’une revue et permet de les filtrer selon deux modules : **Outil** et
**Dataviz**. Un projet peut relever de l’un, de l’autre ou associer les deux.

Chaque dataviz dispose ensuite de sa propre page :

```text
/dataviz/[slug]
```

## Traductions

Le site utilise `next-intl` avec deux locales, `fr` et `en`. Le changement de
langue ne modifie pas les URL. La préférence est conservée pendant un an dans
un cookie fonctionnel `site-locale`. Lors de la première visite, la langue du
navigateur est utilisée si elle correspond au français ou à l’anglais. Le
français reste la langue de repli.

Les messages d’interface sont maintenus dans `messages/fr.json` et
`messages/en.json`. Toute nouvelle interface doit ajouter ses clés dans les deux
catalogues.

Cette page réunit :

- le sujet et la question éditoriale ;
- les sources et la méthodologie ;
- la visualisation principale ;
- les éléments de contexte nécessaires à son interprétation.

Les données peuvent être embarquées dans le projet ou chargées depuis une API.
Les pages actuellement publiées sont pré-générées pour être servies rapidement
par le CDN de Vercel. Les futures sources temps réel devront être isolées dans
des routes API protégées et mises en cache.

## Ligne éditoriale

Une visualisation publiée dans **DONNÉES EN CAUSE** doit :

1. partir d’une question explicite ;
2. citer ses sources et signaler leurs limites ;
3. choisir un format adapté au message, et non l’inverse ;
4. rester lisible sur ordinateur et mobile ;
5. éviter les effets visuels qui déforment ou dramatisent artificiellement les
   données ;
6. rendre la méthodologie accessible au public.

## Ajouter une dataviz

Les métadonnées de la collection sont centralisées dans
[`app/projects.ts`](./app/projects.ts).

Pour créer un projet :

1. ajouter son titre, son slug, son ou ses modules, son format, son résumé et ses sources dans la
   collection ;
2. créer ou adapter sa page sous `app/dataviz/` ;
3. placer le code de visualisation dans un composant dédié ;
4. ajouter les données statiques dans le projet ou documenter l’API utilisée ;
5. vérifier les états de chargement, d’erreur et d’absence de données ;
6. tester le rendu mobile, l’accessibilité et la compilation de production.

Les composants d’interface communs sont exportés depuis
[`components/ui`](./components/ui). Les règles minimales de couleur, boutons et
cartes sont documentées dans
[`docs/design-system.md`](./docs/design-system.md).

## Technologies

- Next.js et React
- TypeScript
- pnpm
- Turbopack
- Vercel Web Analytics
- Canvas, WebGL/3D, bibliothèques de charts et outils cartographiques selon les
  besoins de chaque projet

Le site utilise des en-têtes de sécurité, une politique CSP et une génération
statique par défaut. La protection DDoS et les règles de limitation des futures
routes API sont prises en charge au niveau de Vercel.

## Développement local

Prérequis :

- Node.js `>= 22.13`
- pnpm `11`

```bash
pnpm install
pnpm dev
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000).

Commandes utiles :

```bash
pnpm dev       # développement avec Turbopack
pnpm build     # compilation de production
pnpm lint      # analyse statique
pnpm audit     # audit des dépendances
```

Définir l’URL publique dans `.env.local` :

```bash
NEXT_PUBLIC_SITE_URL=https://votre-domaine.fr
```

Ne jamais placer une clé privée dans une variable `NEXT_PUBLIC_*`.

`NEXT_PUBLIC_SITE_URL` est l’origine publique utilisée pour les URL canoniques,
le sitemap, `robots.txt` et les aperçus sociaux. Sur Vercel, la plateforme sert
de repli automatiquement, mais la variable doit être définie avec le domaine
personnalisé dès qu’il est connu afin que les moteurs n’indexent qu’une seule
origine.

## Cycle de publication

- `preprod` reçoit les développements et alimente l’environnement de
  préproduction ;
- `main` représente la version de production ;
- une modification est validée sur `preprod`, puis fusionnée dans `main` par
  pull request.

Le workflow « Actualiser les feux de forêt » met à jour `preprod` toutes les
heures. Son lancement manuel permet de choisir `main` après validation pour
actualiser immédiatement les données de production. Le choix de `main` reste
une action explicite : le robot ne publie jamais automatiquement une donnée non
validée en production.

Avant toute fusion :

```bash
pnpm build
pnpm audit --prod
```

## Mesure d’audience et respect des visiteurs

Vercel Web Analytics mesure la fréquentation sans cookie. Aucun outil
publicitaire ou de mesure de performance n’est intégré par défaut.

Toute nouvelle collecte doit avoir une finalité documentée, limiter les données
personnelles et respecter les obligations applicables, notamment le RGPD.

## Crédits

**A [creadiv](https://creadiv.fr) project.**
