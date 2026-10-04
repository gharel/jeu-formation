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

La page **Le groupe** (bouton sur l'accueil) rassemble les participants :

- leurs **prénoms**, avec une **info** facultative sur chacun : sa passion, son film ou son dessert préféré… ;
- un **plan de salle** pour retenir qui est assis où : en U, salle de classe, îlots ou réunion. Le plan prévoit autant de places que de participants (12 au plus), et l'on peut en saisir jusqu'à 30. On place chacun en touchant une place, en faisant glisser son prénom (souris ou doigt), ou d'un coup avec « Placer dans l'ordre » ou « Mélanger ».

Une personne absente un jour se marque d'un clic sur la page Groupe : elle reste dans le groupe et sur le plan, mais ne joue pas et la roue ne la tire pas. Pendant une partie, le bouton **Groupe** du bandeau réaffiche le plan, les prénoms et les infos, et la roue indique la place de la personne désignée.

Sur l'écran d'accueil de chaque jeu, on peut :

- **choisir qui joue** (bloc « Qui joue ? ») : tout le groupe (par défaut), au clic sur les prénoms, ou au hasard (un nombre de joueurs, en tirant d'abord ceux qui n'ont pas encore été tirés). Le choix n'est pas mémorisé : chaque jeu repart de « Tout le groupe ». Un retardataire s'ajoute au groupe sans quitter le jeu (« Ajouter quelqu'un ») ;
- **faire tourner la roue** pour désigner quelqu'un, avec la touche `R` ou le bouton « Désigner » ;
- **préparer le contenu**, avec les réponses masquées pour pouvoir le faire écran projeté. Un contenu d'exemple permet de jouer tout de suite ; « Partir d'une liste vide » (ou « Vider la liste ») le remplace par des champs vides, où les exemples restent affichés en grisé, sans rien à effacer. Le contenu s'exporte et s'importe en JSON pour le réutiliser ou le partager.

La page **Les contenus** (bouton sur l'accueil, ou « Charger une thématique » dans chaque jeu) rassemble les questions de tous les jeux :

- **5 thématiques prêtes à jouer**, chargées en un clic dans les 9 jeux sans image (Zoom mystère garde ses captures) : **Initiation à l'IA**, **Google Docs**, **Google Sheets**, **Microsoft 365** et **Facebook**. Les réglages de l'animateur (durées, points…) sont conservés. « Revenir aux exemples » remet le contenu livré avec les jeux ;
- **un jeu de données JSON** : « Exporter tous les contenus » écrit les questions des 10 jeux dans un seul fichier (avec un titre), « Importer un jeu de données… » le recharge. L'export d'un seul jeu s'importe aussi ici, et un jeu de données s'importe aussi dans un seul jeu (il en prend sa part) ;
- **la consultation** des questions de chaque jeu, réponses floutées tant qu'on ne les affiche pas, et l'aperçu d'une thématique avant de la charger.

Dans chaque jeu, une étiquette indique la thématique chargée (« Google Sheets ») ; elle disparaît dès que l'animateur retouche et enregistre le contenu. Les thématiques sont des fichiers JSON dans `contenus/thematiques/` : pour en ajouter une, voir [AGENTS.md](AGENTS.md).

La touche `F` passe en plein écran (bouton masqué sur téléphone, où il ne sert à rien). Chaque jeu a son habillage sonore façon jeu télévisé : notes des lettres de Motus, cloche des étages de Pyramide, gong du « Stop », buzzers du duel, cliquetis de la roue, fanfares et applaudissements. Ce sont des sons originaux générés par le navigateur, sans fichier ni droits d'auteur. Le bouton Son du bandeau les coupe.
Les icônes viennent de Font Awesome Free, hébergé dans le projet (fonctionne hors ligne).

## Utiliser les jeux

En ligne : **https://gharel.github.io/jeu-formation/**

Le site est 100 % statique : il suffit de copier `index.html`, `assets/`, `jeux/`, `groupe/` et `contenus/` sur n'importe quel hébergement web (sous-dossier accepté).
Il fonctionne hors ligne une fois chargé : aucune ressource externe.

Un **mot de passe** est demandé à la première visite, sur l'accueil comme sur chaque jeu. Le navigateur s'en souvient ensuite ; le bouton « Verrouiller l'accès sur cet ordinateur », en bas de l'accueil, le fait redemander. Pour le changer : `npm run mot-de-passe`, puis recopier le sel et l'empreinte affichés dans `assets/js/commun/acces.js`. C'est une protection dissuasive : le site reste statique et ses fichiers publics.

### Déploiement sur GitHub Pages

Chaque push sur `main` lance l'action [Vérifier puis publier sur GitHub Pages](.github/workflows/publier.yml) :
GitHub relance tous les tests (lint, format, HTML, unitaires, e2e et accessibilité), puis publie `index.html`, `assets/`, `jeux/`, `groupe/` et `contenus/` si tout passe.
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
