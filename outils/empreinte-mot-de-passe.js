/**
 * Calcule l'empreinte d'un nouveau mot de passe d'accès au site (npm run mot-de-passe).
 * Le mot de passe est lu au clavier (ou sur l'entrée standard), jamais passé en argument :
 * il ne reste ni dans l'historique du terminal ni dans le code. Seuls le sel et l'empreinte
 * sont à recopier dans assets/js/commun/acces.js.
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

const ITERATIONS = 600_000;

function lireMotDePasse() {
  return new Promise((resoudre) => {
    const entree = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    // Masque la saisie : rien ne s'affiche pendant la frappe
    entree._writeToOutput = () => {};
    process.stdout.write('Nouveau mot de passe : ');
    entree.question('', (reponse) => {
      entree.close();
      process.stdout.write('\n');
      resoudre(reponse);
    });
  });
}

const motDePasse = (await lireMotDePasse()).normalize('NFC');
if (!motDePasse) {
  console.error('Mot de passe vide : rien à faire.');
  process.exit(1);
}
const sel = randomBytes(16).toString('hex');
const empreinte = pbkdf2Sync(motDePasse, Buffer.from(sel, 'hex'), ITERATIONS, 32, 'sha256');
console.log('À recopier dans assets/js/commun/acces.js :');
console.log(`const SEL = '${sel}';`);
console.log(`const EMPREINTE = '${empreinte.toString('hex')}';`);
