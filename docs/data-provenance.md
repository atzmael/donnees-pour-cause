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
l’Insee. Un habitant est compté lorsque le centre de son carreau de résidence se trouve dans
un périmètre brûlé. Il n’est compté qu’une fois par année, même si plusieurs feux recouvrent
le même carreau.

Cet indicateur estime les habitants des zones brûlées, pas l’ensemble des personnes touchées.
Il ne couvre ni les zones évacuées préventivement autour des feux, ni l’exposition aux fumées,
ni les victimes. La résolution de 1 km implique également qu’un carreau partiellement brûlé
n’est pas compté lorsque son centre reste hors du périmètre. EFFIS détecte principalement les
feux d’environ 30 hectares ou plus. Les évacuations documentées par l’IDMC sont conservées
séparément dans le détail des années disponibles et comptent des mouvements, pas toujours des
personnes uniques.
La couverture EFFIS utilisée commence en 2016 ; les années antérieures sont affichées sans
donnée plutôt qu’avec une valeur nulle.

## Fréquence

Le workflow `update-forest-fire-data.yml` relance l’import chaque heure et ne crée un
commit sur `preprod` que si le fichier produit a réellement changé.
