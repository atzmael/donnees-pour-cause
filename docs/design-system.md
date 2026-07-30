# Mini design system

Le système volontairement réduit repose sur trois éléments : les couleurs
sémantiques, `Button` et `Card`.

## Couleurs

Les composants utilisent uniquement les variables définies dans
`app/globals.css`.

| Rôle | Variable | Usage |
| --- | --- | --- |
| Texte principal | `--color-ink` | Texte, boutons actifs, fonds sombres |
| Fond de page | `--color-background` | Fond général |
| Surface | `--color-surface` | Cartes et sections claires |
| Surface accentuée | `--color-surface-accent` | Survols et sections secondaires |
| Accent | `--color-accent` | Points d’attention et données remarquables |
| Bordure | `--color-border` | Séparateurs et contours |

Les nouvelles interfaces ne doivent pas ajouter de couleurs hexadécimales
directement dans les composants. Une nouvelle couleur doit d’abord recevoir un
rôle explicite dans les tokens.

## Button

```tsx
import { Button } from "@/components/ui";

<Button variant="primary">Ouvrir</Button>
<Button variant="outline" size="sm">Filtrer</Button>
<Button variant="ghost">Annuler</Button>
```

Variantes : `primary`, `outline`, `ghost`.
Tailles : `sm`, `md`.
L’état `selected` est prévu pour les filtres et sélecteurs.

## Card

```tsx
import { Card } from "@/components/ui";

<Card>Contenu statique</Card>
<Card href="/dataviz/projet" interactive>
  Projet cliquable
</Card>
```

Une carte interactive doit toujours recevoir `interactive`. Une carte avec
`href` est rendue comme un lien accessible ; sans `href`, elle devient un
`article`.
