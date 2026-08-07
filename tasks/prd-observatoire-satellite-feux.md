# PRD — Observatoire satellite des feux en France

## 1. Introduction

### Vision

Créer un outil web autonome et pérenne permettant d'observer les incendies en France métropolitaine à partir de données géospatiales publiques : détections thermiques récentes, évolution dans le temps, emprises brûlées et comparaison d'images satellites avant/après.

L'outil complète le projet éditorial « Quand la France prend feu », mais possède sa propre identité et peut être utilisé indépendamment. Il propose plusieurs niveaux de lecture : une compréhension immédiate pour le grand public et les médias, puis l'accès aux dates, capteurs, niveaux de confiance et sources pour les journalistes, chercheurs et collectivités.

### Problème traité

Les informations utiles à l'observation des feux sont dispersées entre plusieurs plateformes techniques. Les cartes de points chauds montrent les détections récentes, tandis que les images satellites et les périmètres brûlés se trouvent dans d'autres interfaces. Cette fragmentation rend difficile la réponse à quatre questions simples :

1. Où une activité thermique a-t-elle été détectée récemment ?
2. Comment cette activité a-t-elle évolué au fil des passages satellites ?
3. Quelle surface semble avoir été touchée ?
4. À quoi ressemblait la zone avant le feu et après son passage ?

### Promesse produit

> Voir où le feu a été détecté, suivre son évolution connue et constater ses traces sur le territoire grâce aux satellites publics.

### Positionnement temporel

Le produit emploie l'expression **quasi temps réel**, jamais « temps réel » sans qualification :

- les détections thermiques mondiales FIRMS sont généralement disponibles dans les heures suivant le passage d'un satellite ;
- chaque point correspond à une anomalie détectée dans un pixel, pas à la position exacte d'une flamme ni à l'intégralité d'une surface en feu ;
- la disponibilité d'une image optique avant/après dépend des passages satellites, de la couverture nuageuse, de la fumée et des délais de publication ;
- un périmètre brûlé consolidé arrive généralement après les premières détections.

Le produit n'est pas destiné à la protection des personnes ou des biens, à l'organisation des secours, à l'évacuation ou à la décision opérationnelle.

## 2. Objectifs

- Afficher sur une carte de France les détections thermiques publiques les plus récentes avec leur heure, leur capteur, leur niveau de confiance et leur fraîcheur.
- Regrouper les détections proches dans l'espace et dans le temps en événements lisibles, sans les présenter comme des incendies officiellement confirmés.
- Permettre de rejouer l'évolution des observations d'un événement sur plusieurs heures ou plusieurs jours.
- Afficher, lorsqu'ils sont disponibles, les périmètres de zones brûlées issus d'une source publique identifiée.
- Proposer une comparaison avant/après à partir d'images Sentinel-2 sélectionnées selon la date et la couverture nuageuse.
- Rendre visible la provenance, la date d'acquisition, la date de mise à jour et les limites de chaque couche.
- Conserver une interface compréhensible sans connaissance préalable de la télédétection.

## 3. Principes produit

### Une observation n'est pas une confirmation

L'interface distingue explicitement :

- **détection thermique** : observation ponctuelle d'une anomalie par un capteur ;
- **événement observé** : regroupement algorithmique de détections proches ;
- **zone brûlée estimée** : géométrie produite par une source scientifique ;
- **incendie confirmé** : information qui nécessiterait une source officielle complémentaire, hors périmètre initial.

### Une date pour chaque donnée

Aucune couche ne doit apparaître sans date d'acquisition ou de dernière observation visible. La date de récupération par notre système ne doit jamais être présentée comme la date d'observation satellite.

### Montrer l'incertitude

La résolution spatiale, la confiance, les nuages, la fumée et l'ancienneté doivent être expliqués en langage clair. L'interface évite les contours ou animations qui donneraient une fausse impression de précision.

## 4. Périmètre du MVP

### Inclus

- France métropolitaine et Corse.
- Carte nationale des détections récentes.
- Filtres par période, capteur et niveau de confiance disponible.
- Regroupement des détections en événements observés.
- Fiche détaillée d'un événement.
- Timeline animée sur plusieurs heures ou jours.
- Affichage de zones brûlées lorsque la source en fournit.
- Comparateur d'images satellites avant/après.
- Modes visuels en couleurs naturelles et en composition adaptée à la lecture des zones brûlées.
- Recherche d'un lieu ou d'une commune.
- Partage d'une vue par URL.
- Provenance et fraîcheur des données.
- Interface responsive desktop et mobile.

### Définition de « tout dans le MVP »

Les trois fonctions principales — activité récente, timeline et avant/après — sont obligatoires. La profondeur analytique reste volontairement limitée : le MVP doit rendre ces fonctions fiables et compréhensibles avant d'ajouter alertes, prévisions, comptes utilisateurs ou analyses avancées.

## 5. Parcours utilisateur principal

1. L'utilisateur ouvre une carte de France centrée sur les observations des dernières 24 heures.
2. Il comprend immédiatement l'heure de la dernière mise à jour et la signification des marqueurs.
3. Il sélectionne un événement observé ou recherche un territoire.
4. La fiche présente le résumé, les détections successives, les sources et les avertissements utiles.
5. Il lance la timeline pour visualiser l'apparition et la distribution des détections au fil du temps.
6. Il ouvre le comparateur avant/après, qui propose les meilleures acquisitions disponibles et indique leur date et leur couverture nuageuse.
7. Il ajuste les dates si nécessaire, active la vue « zone brûlée » et partage l'URL de la vue.

## 6. User stories

### US-001 — Voir les observations récentes

**Description :** En tant que visiteur, je veux voir les détections thermiques récentes sur une carte afin d'identifier rapidement les zones où une activité a été observée.

**Critères d'acceptation :**

- [ ] La carte affiche par défaut les observations des dernières 24 heures en France métropolitaine et en Corse.
- [ ] Chaque observation possède une date et heure d'acquisition, un capteur, une source et, lorsqu'elle existe, une mesure de confiance.
- [ ] La légende explique qu'un marqueur est une anomalie thermique détectée dans un pixel et non l'emprise exacte d'un feu.
- [ ] L'heure de dernière synchronisation est visible.
- [ ] Un état explicite apparaît lorsque la source est indisponible ou que la dernière synchronisation a échoué.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-002 — Filtrer la carte dans le temps

**Description :** En tant que visiteur, je veux filtrer les observations afin de distinguer l'activité très récente de celle des jours précédents.

**Critères d'acceptation :**

- [ ] Les périodes 6 h, 12 h, 24 h, 48 h et 7 jours sont proposées.
- [ ] La période active est toujours visible.
- [ ] Modifier la période met à jour la carte, le nombre d'observations et l'URL.
- [ ] Les observations sont stylées selon leur ancienneté sans reposer uniquement sur la couleur.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-003 — Explorer un événement observé

**Description :** En tant que visiteur, je veux sélectionner un groupe de détections afin d'en comprendre l'évolution sans inspecter chaque point séparément.

**Critères d'acceptation :**

- [ ] Le regroupement repose sur des règles documentées de proximité spatiale et temporelle.
- [ ] Le regroupement est nommé « événement observé » et non « incendie confirmé ».
- [ ] La fiche affiche la première et la dernière observation, le nombre de détections, les capteurs impliqués et l'emprise approximative des observations.
- [ ] La fiche n'assimile jamais l'emprise des pixels détectés à une surface brûlée mesurée.
- [ ] L'utilisateur peut revenir à la carte nationale sans perdre ses filtres.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-004 — Rejouer une évolution temporelle

**Description :** En tant que visiteur, je veux rejouer les observations sur une timeline afin de voir comment leur distribution évolue sur plusieurs heures ou jours.

**Critères d'acceptation :**

- [ ] La timeline couvre toute la durée connue de l'événement dans la limite des données disponibles.
- [ ] Les commandes lecture, pause, précédent, suivant et vitesse sont disponibles.
- [ ] L'heure affichée correspond à l'acquisition satellite, avec le fuseau indiqué.
- [ ] Le pas temporel s'adapte aux observations disponibles et ne crée pas de positions interpolées.
- [ ] Les périodes sans passage ou sans détection sont distinguées d'une extinction confirmée.
- [ ] La timeline est utilisable au clavier et avec les technologies d'assistance.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-005 — Voir une zone brûlée estimée

**Description :** En tant que visiteur, je veux afficher un périmètre brûlé disponible afin de distinguer les détections actives d'une estimation de la zone affectée.

**Critères d'acceptation :**

- [ ] La couche n'est proposée que lorsqu'une géométrie issue d'une source identifiée est disponible.
- [ ] La source, la date de production, la méthode résumée et la résolution sont affichées.
- [ ] La géométrie est nommée « zone brûlée estimée ».
- [ ] L'absence de périmètre est présentée comme « donnée non disponible » et non comme une surface nulle.
- [ ] Les détections thermiques et le périmètre peuvent être activés séparément.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-006 — Comparer les images avant et après

**Description :** En tant que visiteur, je veux comparer deux acquisitions satellites afin d'observer visuellement les changements du territoire.

**Critères d'acceptation :**

- [ ] Le système propose une acquisition antérieure et une acquisition postérieure à l'événement.
- [ ] Chaque côté indique la date d'acquisition, le satellite, le produit et la couverture nuageuse disponible.
- [ ] L'utilisateur peut modifier chacune des deux dates parmi les acquisitions disponibles.
- [ ] Les deux vues conservent la même emprise, le même zoom et la même projection.
- [ ] Un curseur de balayage avant/après fonctionne à la souris, au toucher et au clavier.
- [ ] Si aucune image postérieure exploitable n'est disponible, l'interface explique pourquoi et indique la prochaine vérification prévue.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-007 — Changer de lecture satellite

**Description :** En tant que visiteur, je veux alterner entre couleurs naturelles et composition dédiée aux zones brûlées afin de mieux interpréter les changements.

**Critères d'acceptation :**

- [ ] Le comparateur propose au minimum « couleurs naturelles » et « zones brûlées ».
- [ ] Le mode sélectionné s'applique aux deux dates.
- [ ] Une aide courte explique ce que les couleurs permettent d'interpréter.
- [ ] La légende évite toute conclusion automatique sur la gravité sans méthode validée.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-008 — Rechercher un territoire

**Description :** En tant que visiteur, je veux rechercher une commune ou un lieu afin d'explorer rapidement une zone connue.

**Critères d'acceptation :**

- [ ] Une recherche localise au minimum les communes françaises.
- [ ] Choisir un résultat centre la carte sans modifier silencieusement la période sélectionnée.
- [ ] Une recherche sans résultat produit un message explicite.
- [ ] La recherche est accessible au clavier.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-009 — Comprendre la provenance et les limites

**Description :** En tant que visiteur, je veux connaître la provenance et les limites des données afin de ne pas surinterpréter la carte.

**Critères d'acceptation :**

- [ ] Chaque couche expose sa source, sa date d'acquisition ou de validité, sa dernière synchronisation et sa résolution nominale.
- [ ] Une page méthodologique explique détection thermique, événement observé, zone brûlée estimée et image satellite.
- [ ] L'avertissement de non-usage opérationnel est visible depuis la carte et dans chaque URL partagée.
- [ ] Les licences et attributions obligatoires sont affichées.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

### US-010 — Partager une observation

**Description :** En tant que journaliste ou visiteur, je veux partager une vue précise afin qu'un autre utilisateur retrouve le même lieu, la même période et le même mode d'affichage.

**Critères d'acceptation :**

- [ ] L'URL encode l'emprise de carte, la période, les couches, l'événement sélectionné et les dates avant/après.
- [ ] Ouvrir l'URL restaure la vue si les données sont toujours disponibles.
- [ ] Si une donnée a été remplacée ou retirée, l'interface le signale et propose la donnée la plus proche sans modifier silencieusement la référence.
- [ ] La page possède un titre et un aperçu social adaptés à la vue partagée.
- [ ] Typecheck et lint réussissent.
- [ ] Vérifier le parcours dans le navigateur.

## 7. Exigences fonctionnelles

- **FR-1 :** Le système doit ingérer les détections thermiques NASA FIRMS couvrant la France métropolitaine et la Corse.
- **FR-2 :** Chaque observation doit conserver les attributs bruts utiles, la source, le capteur, la date d'acquisition, la date d'ingestion et la version du traitement.
- **FR-3 :** Le système doit actualiser les données automatiquement à une fréquence compatible avec la source et afficher le résultat de la dernière synchronisation.
- **FR-4 :** Le système doit dédupliquer les observations sans supprimer les passages successifs nécessaires à la timeline.
- **FR-5 :** Le système doit regrouper les observations en événements selon une méthode versionnée, reproductible et documentée.
- **FR-6 :** Le système doit conserver les observations historiques nécessaires pour rejouer chaque événement.
- **FR-7 :** La carte doit prendre en charge les périodes 6 h, 12 h, 24 h, 48 h et 7 jours.
- **FR-8 :** La timeline doit afficher uniquement des observations acquises ; aucune trajectoire de feu ne doit être inventée entre deux acquisitions.
- **FR-9 :** Le système doit récupérer ou référencer les zones brûlées EFFIS disponibles et conserver leur provenance.
- **FR-10 :** Le système doit rechercher les acquisitions Sentinel-2 L2A couvrant la zone et les périodes choisies.
- **FR-11 :** La sélection automatique avant/après doit prendre en compte la position temporelle par rapport à l'événement, la couverture spatiale et la couverture nuageuse.
- **FR-12 :** L'utilisateur doit pouvoir remplacer les acquisitions automatiquement proposées.
- **FR-13 :** Le système doit produire au minimum une vue en couleurs naturelles et une composition adaptée à l'observation des surfaces brûlées.
- **FR-14 :** Toutes les images doivent afficher les métadonnées nécessaires à leur interprétation et à leur attribution.
- **FR-15 :** Le produit doit signaler séparément absence d'observation, absence de passage exploitable, source indisponible et erreur d'ingestion.
- **FR-16 :** Les paramètres significatifs de la vue doivent être persistés dans l'URL.
- **FR-17 :** Le produit doit fournir une page méthodologique et un glossaire accessible depuis toutes les vues.
- **FR-18 :** Le produit doit afficher un avertissement clair indiquant qu'il ne constitue pas un outil opérationnel de sécurité civile.
- **FR-19 :** Le système doit permettre la désactivation indépendante des couches de détections, événements et zones brûlées.
- **FR-20 :** La recherche géographique doit utiliser une source publique autorisant l'usage prévu et limiter le périmètre à la France.

## 8. Sources de données pressenties

### NASA FIRMS — activité thermique

- Usage : détections actives et anomalies thermiques MODIS/VIIRS, attributs temporels et niveau de confiance disponible.
- Accès pressenti : API de zone ou services WMS/WMS-Time ; l'accès automatisé peut nécessiter une clé gratuite NASA/Earthdata.
- Résolution indicative : VIIRS 375 m, MODIS 1 km.
- Limites : nuages, fumée, faux positifs possibles, détection ponctuelle au passage du satellite, pixel différent de l'emprise réelle du feu.
- Rôle MVP : source primaire des marqueurs et de la timeline.

### Copernicus EFFIS — zones brûlées

- Usage : périmètres de zones brûlées, couches européennes et éléments de contrôle croisé.
- Accès pressenti : services WMS publics et jeux téléchargeables selon les conditions de licence.
- Limites : les produits n'ont pas tous la même résolution ni le même délai ; les périmètres automatisés ou semi-automatisés restent des estimations.
- Rôle MVP : source primaire des géométries brûlées lorsqu'elles sont disponibles.

### Copernicus Data Space Ecosystem — imagerie Sentinel

- Usage : catalogue et accès aux acquisitions Sentinel-2 L2A pour les vues avant/après ; possibilité ultérieure d'utiliser Sentinel-1 lorsque les nuages empêchent l'observation optique.
- Accès pressenti : catalogue STAC pour découvrir les acquisitions, puis service de traitement ou accès aux produits selon les quotas gratuits en vigueur.
- Résolution indicative : jusqu'à 10 m pour certaines bandes Sentinel-2.
- Limites : nuages, fumée, fréquence de revisite, quotas de traitement et coût d'infrastructure interne même lorsque la donnée source est gratuite.
- Rôle MVP : source primaire du comparateur satellite.

### IGN et services publics français — contexte cartographique

- Usage possible : fond cartographique, limites administratives, noms de lieux et géocodage.
- Rôle MVP : contexte et recherche, pas source principale de l'avant/après récent.

### Règle d'intégration

Une source n'entre dans le MVP que si :

1. ses conditions autorisent l'affichage public et la mise en cache nécessaire ;
2. son accès automatisé est documenté et suffisamment stable ;
3. l'attribution peut être affichée correctement ;
4. ses limites peuvent être expliquées ;
5. aucune donnée payante n'est nécessaire au fonctionnement nominal.

## 9. Modèle de données conceptuel

### `Detection`

- identifiant interne et identifiant source si disponible ;
- coordonnées ;
- date et heure d'acquisition ;
- satellite et capteur ;
- confiance ou qualité ;
- puissance radiative ou attributs scientifiques disponibles ;
- résolution nominale ;
- date d'ingestion ;
- source et version.

### `ObservedEvent`

- identifiant stable ;
- liste ou référence des détections associées ;
- première et dernière observation ;
- emprise des observations ;
- version et paramètres de l'algorithme de regroupement ;
- statut calculé : récent, sans nouvelle observation ou archivé, jamais « maîtrisé » ou « éteint » sans source officielle.

### `BurnedArea`

- géométrie ;
- date ou période de validité ;
- méthode et résolution ;
- source, licence et date d'ingestion ;
- lien éventuel vers un événement observé avec score ou méthode d'association.

### `SatelliteAcquisition`

- identifiant catalogue ;
- date d'acquisition ;
- collection et niveau de produit ;
- empreinte spatiale ;
- couverture nuageuse déclarée ;
- actifs ou service de rendu ;
- attribution et date d'indexation.

## 10. Considérations UX et éditoriales

- La page d'accueil doit répondre en quelques secondes à « que voit-on et de quand date cette information ? ».
- La carte nationale privilégie la lisibilité et agrège les marqueurs à faible zoom.
- Les heures sont affichées dans un fuseau explicite ; l'heure locale française peut être accompagnée de l'UTC dans les détails.
- La timeline ne doit pas utiliser une animation continue suggérant un front de feu calculé.
- Le comparateur utilise par défaut un balayage, avec une alternative côte à côte sur petits écrans si elle est plus lisible.
- Les termes techniques disposent d'une définition contextuelle courte, puis d'un lien vers la méthodologie.
- Les palettes et symboles doivent rester interprétables en cas de déficience de perception des couleurs.
- La fraîcheur de la donnée doit être plus visible que la date de mise à jour de la page.

## 11. Considérations techniques

- Préférer une ingestion serveur planifiée à des appels directs depuis chaque navigateur afin de contrôler les quotas, normaliser les données et préserver l'historique.
- Conserver les données brutes reçues ou un snapshot reproductible, dans la limite des licences et du stockage raisonnable.
- Séparer les connecteurs de sources, le modèle normalisé, le regroupement événementiel et la présentation cartographique.
- Mettre en cache les métadonnées et rendus satellites ; éviter de retraiter une image identique pour chaque visite.
- Utiliser des standards géospatiaux lorsque possible : GeoJSON, STAC, WMS/WMTS, COG et projections documentées.
- Prévoir une stratégie de simplification des géométries et de tuilage pour maintenir une navigation fluide.
- Journaliser les imports, erreurs, retards, volumes, versions de source et durées de traitement.
- Tester les changements d'heure, les acquisitions UTC et l'affichage en heure française.
- Réaliser avant développement un spike technique validant les quotas gratuits, l'authentification et les droits de cache de chaque source.

## 12. Exigences non fonctionnelles

- **NFR-1 — Performance :** la structure de la page et le fond de carte doivent devenir interactifs en moins de 3 secondes sur une connexion 4G correcte, hors indisponibilité externe.
- **NFR-2 — Fluidité :** les interactions principales de carte doivent rester proches de 60 images par seconde sur un ordinateur récent avec un volume représentatif.
- **NFR-3 — Fraîcheur :** le système doit déclencher une alerte interne si les données récentes dépassent un seuil de retard configurable.
- **NFR-4 — Résilience :** la dernière donnée valide peut rester consultable pendant une panne de source, avec un avertissement d'ancienneté visible.
- **NFR-5 — Accessibilité :** viser WCAG 2.2 niveau AA pour l'interface, y compris commandes de timeline et comparateur.
- **NFR-6 — Traçabilité :** toute donnée affichée doit pouvoir être reliée à une source et à une acquisition.
- **NFR-7 — Confidentialité :** le MVP ne nécessite ni compte utilisateur ni donnée personnelle pour consulter et partager une vue.
- **NFR-8 — Coût :** le fonctionnement nominal du MVP ne doit dépendre d'aucune licence de données ou API payante.

## 13. Hors périmètre

- Usage par les pompiers, services de secours ou autorités pour prendre une décision opérationnelle.
- Alertes d'évacuation ou consignes de sécurité locales.
- Prédiction de propagation du feu.
- Estimation du danger individuel ou de la distance de sécurité.
- Localisation de moyens de secours ou suivi des interventions.
- Validation officielle du départ, de la maîtrise ou de l'extinction d'un incendie.
- Signalement communautaire et publication de contenus utilisateurs.
- Notifications personnalisées, comptes et zones favorites.
- Application mobile native.
- Couverture mondiale ou européenne dans le MVP.
- Achat d'imagerie commerciale à très haute résolution.
- Analyse automatique de dommages aux bâtiments ou de pertes économiques.
- Mesure de surface dérivée simplement de la somme des pixels FIRMS.

## 14. Métriques de succès

### Qualité d'usage

- Au moins 80 % des testeurs comprennent qu'un marqueur est une détection satellite et non la surface exacte du feu.
- Au moins 80 % des testeurs trouvent la date de dernière observation en moins de 10 secondes.
- Au moins 70 % des testeurs réussissent à ouvrir et manipuler un avant/après sans aide.
- Au moins 70 % des testeurs expliquent correctement la différence entre détection active et zone brûlée après le parcours.

### Qualité des données

- 100 % des couches visibles possèdent source, date de validité ou d'acquisition et attribution.
- 100 % des événements affichés sont reproductibles à partir de la version documentée de l'algorithme de regroupement.
- Plus de 95 % des synchronisations planifiées FIRMS réussissent sur une période glissante de 30 jours, hors panne déclarée de la source.
- Aucune absence de donnée n'est affichée comme une absence certaine de feu.

### Performance

- Les objectifs NFR de chargement et de fluidité sont respectés sur un jeu de données représentatif de la saison des feux.
- Une URL partagée restaure les paramètres attendus dans 99 % des tests automatisés.

## 15. Découpage de réalisation suggéré

Le MVP reste unique, mais peut être construit par tranches verticales :

1. **Spike données** : accès FIRMS, EFFIS et Copernicus, licences, quotas, échantillons, délais et cache.
2. **Socle de provenance** : modèle normalisé, stockage, synchronisation, monitoring et page méthodologique minimale.
3. **Carte récente** : détections, filtres, fraîcheur, recherche et partage.
4. **Événements et timeline** : regroupement reproductible, fiche et animation discrète.
5. **Zones brûlées** : ingestion EFFIS, association et légende dédiée.
6. **Avant/après** : recherche Sentinel-2, sélection des scènes, rendu naturel et rendu zones brûlées.
7. **Durcissement** : accessibilité, responsive, performance, états dégradés et tests utilisateurs.

Chaque tranche doit être démontrable avec des données réelles, mais aucune version publique ne doit être qualifiée de MVP tant que les trois fonctions principales ne sont pas intégrées.

## 16. Risques et mesures de réduction

### Promesse de temps réel trompeuse

**Risque :** l'utilisateur croit observer un feu au moment présent.  
**Réduction :** employer « dernière détection satellite », afficher l'heure partout et expliquer les passages orbitaux.

### Faux sentiment de précision

**Risque :** un point ou un polygone est interprété comme un contour opérationnel.  
**Réduction :** séparer clairement les types de données, afficher leur résolution et ne jamais extrapoler visuellement un front.

### Nuages et fumée

**Risque :** aucune bonne image optique n'existe juste après un événement.  
**Réduction :** proposer plusieurs acquisitions, expliquer le blocage et évaluer Sentinel-1 dans une version ultérieure.

### Quotas et coûts techniques

**Risque :** les données sont gratuites, mais leur traitement ou leur distribution dépasse les quotas gratuits.  
**Réduction :** valider les quotas pendant le spike, pré-calculer les zones populaires, mettre en cache et limiter les rendus arbitraires.

### Association erronée des détections

**Risque :** plusieurs feux sont fusionnés, ou un événement est scindé.  
**Réduction :** versionner les règles, afficher les détections sources et permettre de recalculer l'historique.

### Dépendance à des services tiers

**Risque :** changement d'API, panne ou interruption d'une source.  
**Réduction :** connecteurs isolés, cache autorisé, monitoring et états dégradés explicites.

## 17. Questions ouvertes

- Quel nom et quelle identité visuelle donner à l'observatoire, et quelle proximité graphique conserver avec « Quand la France prend feu » ?
- Quelle durée d'historique doit rester disponible dans la timeline publique : 7 jours, une saison ou plusieurs années ?
- Quel algorithme et quels seuils de regroupement spatial et temporel donnent des événements compréhensibles sur les feux français ?
- Faut-il utiliser exclusivement EFFIS pour les zones brûlées ou produire à terme un indice/calcul interne à partir de Sentinel-2 ?
- Quel niveau de cache et de redistribution est autorisé par chaque licence et chaque service ?
- Les quotas gratuits de traitement Copernicus permettent-ils un comparateur à la demande ou faut-il pré-générer les rendus par événement ?
- Quelle source publique française peut enrichir ultérieurement les événements confirmés sans introduire une dépendance fragile ou du retraitement manuel ?
- La Corse doit-elle être visible dans son emplacement géographique naturel ou via un encart pour la vue nationale ?
- À partir de quel délai sans nouvelle observation un événement devient-il « sans observation récente », sans suggérer qu'il est éteint ?

## 18. Décisions actées

- Public multiple, sans usage opérationnel dans le MVP.
- Produit autonome ayant vocation à devenir un observatoire pérenne.
- Périmètre initial : France métropolitaine et Corse.
- MVP comprenant carte récente, fiches événements, timeline, zones brûlées et comparateur satellite avant/après.
- Données publiques gratuites uniquement.
- Aucune prédiction de propagation ni qualification opérationnelle d'un incendie.

