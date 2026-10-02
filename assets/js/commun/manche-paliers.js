/**
 * Manche à paliers (Qui suis-je ?, Zoom mystère) : les chiffres 5 4 3 2 1 s'éteignent,
 * l'animateur appuie sur Stop quand quelqu'un répond, puis valide ou reprend.
 * Espace : Démarrer → Stop → Reprendre.
 */
import { el, remplir, icone, ecouterClavier } from './ui.js';
import { creerPaliers, creerAffichagePaliers } from './paliers.js';

/**
 * `surValeur(valeur)` : appelé au départ et à chaque chiffre perdu (le jeu montre un indice,
 * dézoome…). `surFin({ trouve, prenom, points })` : la manche est finie, le jeu révèle la réponse.
 */
export function creerMancheAPaliers({ ctx, dureePalier, nombre = 5, surValeur, surFin }) {
  const affichage = creerAffichagePaliers(nombre);
  const actions = el('div', { class: 'actions-jeu' });
  let etat = 'attente';

  const paliers = creerPaliers({
    nombre,
    dureePalier,
    surChangement(valeur) {
      affichage.afficher(valeur);
      if (valeur > 0) {
        ctx.sons.tic();
        surValeur(valeur);
      }
    },
    surFin: () => finir({ trouve: false }),
  });

  function bouton(nomIcone, texte, classe, action) {
    return el(
      'button',
      { type: 'button', class: `bouton bouton--grand ${classe}`, onclick: action },
      icone(nomIcone),
      texte,
    );
  }

  function dessiner() {
    if (etat === 'attente') {
      remplir(actions, bouton('play', 'Démarrer', 'bouton--principal', demarrer));
    } else if (etat === 'enCours') {
      remplir(actions, bouton('hand', 'Stop ! Quelqu’un répond', 'bouton--sombre', stop));
    } else if (etat === 'pause') {
      remplir(
        actions,
        bouton('check', 'Bonne réponse', 'bouton--succes', bonne),
        bouton('xmark', 'Mauvaise réponse, on reprend', 'bouton--danger', reprendre),
      );
    } else {
      remplir(actions);
    }
    // En pause, le focus va sur « reprendre » : Espace reprend toujours, comme annoncé
    const boutons = actions.querySelectorAll('button');
    boutons[boutons.length - 1]?.focus();
  }

  function demarrer() {
    etat = 'enCours';
    paliers.demarrer();
    dessiner();
  }

  function stop() {
    paliers.pause();
    etat = 'pause';
    ctx.sons.buzz();
    ctx.annoncer(`Stop ! ${paliers.valeur} points en jeu.`);
    dessiner();
  }

  function reprendre() {
    etat = 'enCours';
    ctx.sons.erreur();
    paliers.reprendre();
    dessiner();
  }

  async function bonne() {
    const points = paliers.valeur;
    let prenom = null;
    if (ctx.participants.length) {
      const [choisi] = await ctx.choisirPrenoms({
        titre: `Qui a trouvé ? (${points} point${points > 1 ? 's' : ''})`,
        libelleAucun: 'Annuler',
      });
      if (!choisi) return;
      prenom = choisi;
      ctx.scores.ajouter(prenom, points);
    }
    ctx.sons.succes();
    finir({ trouve: true, prenom, points });
  }

  function finir(resultat) {
    if (etat === 'fini') return;
    etat = 'fini';
    paliers.arreter();
    if (!resultat.trouve) affichage.afficher(0);
    dessiner();
    surFin(resultat);
  }

  const retirerClavier = ecouterClavier({
    Espace: () => {
      if (etat === 'attente') demarrer();
      else if (etat === 'enCours') stop();
      else if (etat === 'pause') reprendre();
    },
  });

  affichage.afficher(nombre);
  dessiner();
  surValeur(nombre);

  return {
    paliers: affichage.element,
    actions,
    detruire() {
      paliers.arreter();
      retirerClavier();
    },
  };
}
