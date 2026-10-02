/**
 * npm run dev : lance le serveur local sur http://localhost:4173 et ouvre le navigateur.
 * Si le port est déjà pris, on le dit clairement (au lieu de partir sur un port au hasard).
 * Sans navigateur : npm run dev -- --sans-navigateur
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

// On lance serve directement avec Node (sans shell ni npx) : Ctrl+C l'arrête à coup sûr.
const SERVE = fileURLToPath(new URL('../node_modules/serve/build/main.js', import.meta.url));
const RACINE = fileURLToPath(new URL('..', import.meta.url));

const PORT = Number(process.env.PORT ?? 4173);
const ADRESSE = `http://localhost:${PORT}`;
const ouvrirNavigateur = !process.argv.includes('--sans-navigateur');

function portLibre(port) {
  return new Promise((resoudre) => {
    const essai = createServer()
      .once('error', () => resoudre(false))
      .once('listening', () => essai.close(() => resoudre(true)))
      .listen(port);
  });
}

async function attendreServeur(delaiMs = 15000) {
  const fin = Date.now() + delaiMs;
  while (Date.now() < fin) {
    try {
      const reponse = await fetch(ADRESSE);
      if (reponse.ok) return true;
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function ouvrir(adresse) {
  const commandes = {
    win32: ['cmd', ['/c', 'start', '""', adresse]],
    darwin: ['open', [adresse]],
  };
  const [commande, args] = commandes[process.platform] ?? ['xdg-open', [adresse]];
  spawn(commande, args, { stdio: 'ignore', detached: true, shell: false }).unref();
}

if (!(await portLibre(PORT))) {
  console.error(
    `\n✖ Le port ${PORT} est déjà utilisé.\n` +
      `  • Le site tourne peut-être déjà dans un autre terminal : ouvrez ${ADRESSE}\n` +
      '  • Sinon, arrêtez l’autre serveur (Ctrl+C dans son terminal),\n' +
      '    ou choisissez un autre port :\n' +
      '      PowerShell : $env:PORT=5000; npm run dev\n' +
      '      Bash       : PORT=5000 npm run dev\n',
  );
  process.exit(1);
}

const serveur = spawn(
  process.execPath,
  [SERVE, '-l', String(PORT), '--no-port-switching', '--no-clipboard', RACINE],
  { stdio: 'inherit' },
);
serveur.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => serveur.kill(signal));

if (await attendreServeur()) {
  console.log(`\n✔ Mini-jeux Skazy Formation : ${ADRESSE}   (Ctrl+C pour arrêter)\n`);
  if (ouvrirNavigateur) ouvrir(ADRESSE);
} else {
  console.error(`\n✖ Le serveur ne répond pas sur ${ADRESSE}.\n`);
}
