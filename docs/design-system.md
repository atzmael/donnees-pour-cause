# Mini design system

Le système volontairement réduit repose sur trois éléments : les couleurs
sémantiques, `Button` et `Card`.

## Couleurs

Les composants utilisent uniquement les variables définies dans
`app/globals.css`.

| Rôle | Variable | Valeur |
| --- | --- | --- |
| Primary — vert forêt | `--color-primary` | `#2F6B3F` |
| Secondary — vert mousse | `--color-secondary` | `#5E8F57` |
| Accent — sable | `--color-accent` | `#D6B98C` |
| Background | `--color-background` | `#FAF9F6` |
| Foreground | `--color-foreground` | `#263238` |

Les états `hover`, les surfaces légères, les bordures et le texte atténué sont
dérivés de ces cinq couleurs avec `color-mix()`. Ils ne constituent pas de
nouvelles couleurs maîtresses.

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
