# Mini-jeux Skazy Formation

Des mini-jeux à projeter pour réveiller une séance de formation numérique.
L'animateur prépare le contenu, les participants jouent à l'oral, l'animateur valide.
Chaque jeu dure de 5 à 15 minutes.

## Les jeux

| Jeu                  | Principe                                                            | À préparer                             |
| -------------------- | ------------------------------------------------------------------- | -------------------------------------- |
| 🔤 Motus numérique   | Deviner 5 mots en 6 essais, lettres colorées                        | 5 mots (+ définitions)                 |
| ⏱️ Instant défi      | La roue tire un défi éclair (« 30 secondes pour trouver… »), chrono | Les fins des défis                     |
| 🎯 Le Juste Chiffre  | « C'est plus ! », « C'est moins ! », minuteur réglable (30 s)       | Questions à réponse chiffrée           |
| 🧍 Debout ou assis ? | Vrai = debout, faux = assis (ou main levée), mode survie            | Affirmations vrai/faux                 |
| 🔢 Le Bon Ordre      | Remettre dans l'ordre les étapes d'une procédure, 3 essais          | Procédures de 3 à 7 étapes             |
| ❓ Qui suis-je ?     | Indices progressifs, points qui fondent 5 4 3 2 1, Stop             | Mystères + 3 à 5 indices               |
| 🔍 Zoom mystère      | Capture très zoomée qui se dévoile, 5 4 3 2 1, Stop                 | Captures collées (Ctrl+V) ou importées |

Sur l'écran d'accueil de chaque jeu, on peut :

- **saisir les prénoms** (liste partagée entre tous les jeux) ;
- **faire tourner la roue** pour désigner quelqu'un, avec la touche `R` ou le bouton « Désigner » ;
- **préparer le contenu**, avec les réponses masquées pour pouvoir le faire écran projeté. Un contenu d'exemple permet de jouer tout de suite. Le contenu s'exporte et s'importe en JSON pour le réutiliser ou le partager.

La touche `F` passe en plein écran. Le son se coupe depuis le bandeau.

## Utiliser les jeux

Le site est 100 % statique : il suffit de copier le dossier sur n'importe quel hébergement web (sous-dossier accepté).
Il fonctionne hors ligne une fois chargé : aucune ressource externe.

En local :

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:4173.

## Développer

Lire **[AGENTS.md](AGENTS.md)**. Il décrit la structure, les conventions, la charte graphique et la procédure obligatoire avant chaque commit et chaque push.

```bash
npx playwright install chromium   # une fois, pour les tests e2e
npm run check                     # lint + format + HTML + tests unitaires
npm run test:e2e                  # parcours complets + accessibilité
```

Les hooks git lancent `check` avant chaque commit et `test:e2e` avant chaque push.
