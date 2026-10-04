# Mini-jeux Skazy Formation

Des mini-jeux à projeter pour réveiller une séance de formation numérique.
Le bouton « Un jeu au hasard » de l'accueil fait tourner une roue pour choisir le jeu.
L'animateur prépare le contenu, les participants jouent à l'oral, l'animateur valide.
Chaque jeu dure de 5 à 15 minutes.

## Les jeux

| Jeu               | Principe                                                                           | À préparer                             |
| ----------------- | ---------------------------------------------------------------------------------- | -------------------------------------- |
| Motus numérique   | Deviner 5 mots en 6 essais, lettres colorées                                       | 5 mots (+ définitions)                 |
| Instant défi      | La roue tire un défi éclair (« 30 secondes pour trouver… »), chrono                | Les fins des défis                     |
| Le Juste Chiffre  | « C'est plus ! », « C'est moins ! », minuteur réglable (30 s)                      | Questions à réponse chiffrée           |
| Debout ou assis ? | Vrai = debout, faux = assis (ou main levée), mode survie                           | Affirmations vrai/faux                 |
| Le Bon Ordre      | Remettre dans l'ordre les étapes d'une procédure, 3 essais                         | Procédures de 3 à 7 étapes             |
| Qui suis-je ?     | Indices progressifs, points qui fondent 5 4 3 2 1, Stop                            | Mystères + 3 à 5 indices               |
| Zoom mystère      | Capture très zoomée qui se dévoile, 5 4 3 2 1, Stop                                | Captures collées (Ctrl+V) ou importées |
| Duel buzzer       | Deux joueurs, touches A et L ou buzzers à l'écran (tactile), le plus rapide répond | Questions + réponses                   |
| Pyramide          | Par deux, faire deviner un mot en 1, 2, 3 ou 4 mots d'indice : 4, 3, 2 ou 1 point  | Une liste de mots                      |
| Batterie faible   | Proposer des lettres ; chaque erreur vide la batterie                              | Mots ou courtes expressions            |

Sur l'écran d'accueil de chaque jeu, on peut :

- **saisir les prénoms** (liste partagée entre tous les jeux), avec une info facultative sur chaque personne : sa passion, son film ou son dessert préféré… La roue l'affiche quand elle désigne quelqu'un ;
- **faire tourner la roue** pour désigner quelqu'un, avec la touche `R` ou le bouton « Désigner » ;
- **préparer le contenu**, avec les réponses masquées pour pouvoir le faire écran projeté. Un contenu d'exemple permet de jouer tout de suite ; « Partir d'une liste vide » (ou « Vider la liste ») le remplace par des champs vides, où les exemples restent affichés en grisé, sans rien à effacer. Le contenu s'exporte et s'importe en JSON pour le réutiliser ou le partager.

La touche `F` passe en plein écran (bouton masqué sur téléphone, où il ne sert à rien). Chaque jeu a son habillage sonore façon jeu télévisé : notes des lettres de Motus, cloche des étages de Pyramide, gong du « Stop », buzzers du duel, cliquetis de la roue, fanfares et applaudissements. Ce sont des sons originaux générés par le navigateur, sans fichier ni droits d'auteur. Le bouton Son du bandeau les coupe.
Les icônes viennent de Font Awesome Free, hébergé dans le projet (fonctionne hors ligne).

## Utiliser les jeux

En ligne : **https://gharel.github.io/jeu-formation/**

Le site est 100 % statique : il suffit de copier `index.html`, `assets/` et `jeux/` sur n'importe quel hébergement web (sous-dossier accepté).
Il fonctionne hors ligne une fois chargé : aucune ressource externe.

Un **mot de passe** est demandé à la première visite, sur l'accueil comme sur chaque jeu. Le navigateur s'en souvient ensuite ; le bouton « Verrouiller l'accès sur cet ordinateur », en bas de l'accueil, le fait redemander. Pour le changer : `npm run mot-de-passe`, puis recopier le sel et l'empreinte affichés dans `assets/js/commun/acces.js`. C'est une protection dissuasive : le site reste statique et ses fichiers publics.

### Déploiement sur GitHub Pages

Chaque push sur `main` lance l'action [Vérifier puis publier sur GitHub Pages](.github/workflows/publier.yml) :
GitHub relance tous les tests (lint, format, HTML, unitaires, e2e et accessibilité), puis publie `index.html`, `assets/` et `jeux/` si tout passe.
On peut aussi la relancer à la main depuis l'onglet **Actions** du dépôt (« Run workflow »).

Réglage à faire une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

En local :

```bash
npm install
npm run dev
```

Le navigateur s'ouvre sur http://localhost:4173 (Ctrl+C dans le terminal pour arrêter).
Si le port 4173 est déjà pris, un message l'indique : le site tourne sans doute déjà dans un autre terminal.
Pour ne pas ouvrir le navigateur : `npm run dev -- --sans-navigateur`.

## Développer

Lire **[AGENTS.md](AGENTS.md)**. Il décrit la structure, les conventions, la charte graphique et la procédure obligatoire avant chaque commit et chaque push.

```bash
npx playwright install chromium   # une fois, pour les tests e2e
npm run check                     # lint + format + HTML + tests unitaires
npm run test:e2e                  # parcours complets + accessibilité
```

Les hooks git lancent `check` avant chaque commit et `test:e2e` avant chaque push.
