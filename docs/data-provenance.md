# Provenance des données — feux de forêt

## Incendies consolidés

Les années antérieures à l’année courante sont importées depuis l’export CSV de la
[BDIFF](https://bdiff.agriculture.gouv.fr/incendies). La surface source, exprimée en
mètres carrés, est convertie en hectares. Ces données sont présentées comme consolidées.

## Année courante

L’année courante est reconstruite depuis les périmètres brûlés MODIS publiés par
[EFFIS](https://forest-fire.emergency.copernicus.eu/applications/data-and-services).
Seuls les enregistrements de France métropolitaine dont `FIREDATE` appartient à
l’année courante sont retenus. La donnée est provisoire : un périmètre peut être
ajouté, corrigé ou fusionné après sa première détection.

Le champ `effisCutoffAt` du fichier généré correspond à la date la plus récente trouvée
dans `LASTUPDATE`, ou à défaut dans `FINALDATE` puis `FIREDATE`. `updatedAt` indique
uniquement l’heure à laquelle l’import a été exécuté.

## Population potentiellement exposée

La série versionnée dans `public/data/population-exposure.json` est calculée en croisant les
périmètres brûlés EFFIS MODIS avec les carreaux de population 2021 de 1 km publiés par
l’Insee. Chaque carreau est échantillonné en 16 points et sa population est répartie
proportionnellement à la part de points située dans les surfaces brûlées. Une borne haute
additionne séparément toute la population des carreaux au moins partiellement touchés.

Cet indicateur estime les habitants des zones brûlées, pas l’ensemble des personnes touchées.
Il ne couvre ni les zones évacuées préventivement autour des feux, ni l’exposition aux fumées,
ni les victimes. La résolution de 1 km et l’hypothèse d’une population uniformément répartie
dans chaque carreau impliquent une marge d’incertitude. EFFIS détecte principalement les
feux d’environ 30 hectares ou plus. Les évacuations documentées par l’IDMC sont conservées
séparément dans le détail des années disponibles et comptent des mouvements, pas toujours des
personnes uniques. L’exposition aux fumées sera ajoutée séparément lorsqu’un seuil CAMS et
une méthode d’attribution aux seuls feux de forêt auront été validés.
La couverture EFFIS utilisée commence en 2016 ; les années antérieures sont affichées sans
donnée plutôt qu’avec une valeur nulle.

## Fréquence

Le workflow `update-forest-fire-data.yml` relance l’import chaque heure sur `main` et ne crée
un commit que si les fichiers produits ont réellement changé. `preprod` reste disponible
comme cible lors des déclenchements manuels.
