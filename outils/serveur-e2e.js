/**
 * Serveur des tests e2e (playwright.config.js) : node outils/serveur-e2e.js 4199
 *
 * Les mêmes réponses que `serve` (son moteur, serve-handler), mais un fichier est refermé dès que
 * le navigateur coupe la requête. `serve` le gardait ouvert : à chaque page quittée pendant son
 * chargement, un fichier restait pris, et en fin de série le serveur tombait
 * (« EMFILE: too many open files »), ce qui faisait échouer les derniers tests.
 */
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import servir from 'serve-handler';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.argv[2]) || 4173;

createServer((requete, reponse) =>
  servir(
    requete,
    reponse,
    { public: RACINE },
    {
      createReadStream(chemin, options) {
        const flux = createReadStream(chemin, options);
        // Réponse terminée ou coupée : le fichier est refermé (sans effet s'il l'est déjà)
        reponse.once('close', () => flux.destroy());
        return flux;
      },
    },
  ),
).listen(PORT);
