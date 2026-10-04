import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import { el, remplir, icone, animer, focaliser } from '../../assets/js/commun/ui.js';
import { creerBoutonPoints } from '../../assets/js/commun/points.js';
import { elementsDeListe } from '../../assets/js/commun/contenu.js';
import { schema, exemple } from './exemple.js';
import { creerCartes, lireOrdre, verifier, pointsPourEssai } from './logique.js';
import { creerIllustrationOrdre } from './illustration.js';

function demarrer(ctx) {
  const essaisMax = ctx.reglages.essais;
  const procedures = ctx.elements.map((e) => ({
    titre: e.titre,
    etapes: elementsDeListe(e.etapes),
  }));
  let index = 0;
  // Trois cartes en vrac, qui se rangent quand l'ordre est juste
  const illustration = creerIllustrationOrdre();

  function afficherProcedure() {
    const { titre, etapes } = procedures[index];
    const cartes = creerCartes(etapes.length, ctx.hasard).map((c) => ({
      ...c,
      texte: etapes[c.etape],
    }));
    const emplacements = Array.from({ length: etapes.length }, () => null);
    const verrouilles = new Set();
    let essai = 1;
    let terminee = false;
    illustration.etat(null);

    const surtitre = el('p', { class: 'panneau__surtitre' });
    const titreProcedure = el('h3', { class: 'panneau__texte ordre__titre' }, titre);
    const pioche = el('ul', { class: 'ordre__pioche', 'aria-label': 'Étapes mélangées' });
    const ordre = el('ol', { class: 'ordre__emplacements', 'aria-label': 'Ordre proposé' });
    const saisie = el('input', {
      id: 'ordre-saisie',
      class: 'champ__controle ordre__saisie',
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      'aria-describedby': 'ordre-aide',
    });
    const erreur = el('p', { class: 'ordre__erreur', role: 'alert' });
    const formulaire = el(
      'form',
      { class: 'ordre__formulaire' },
      el('label', { for: 'ordre-saisie', class: 'champ__libelle' }, 'Ordre dicté par le groupe'),
      el(
        'div',
        { class: 'champ__ligne' },
        saisie,
        el('button', { type: 'submit', class: 'bouton' }, 'Placer'),
      ),
      el(
        'p',
        { id: 'ordre-aide', class: 'champ__aide' },
        'Tapez les lettres dans l’ordre (« C A D B »), ou cliquez sur les cartes une à une.',
      ),
      erreur,
    );
    const boutonVerifier = el(
      'button',
      {
        type: 'button',
        class: 'bouton bouton--principal bouton--grand',
        onclick: () => verifierOrdre(),
      },
      'Vérifier',
    );
    const boutonVider = el(
      'button',
      {
        type: 'button',
        class: 'bouton',
        onclick: () => {
          emplacements.forEach((_, i) => {
            if (!verrouilles.has(i)) emplacements[i] = null;
          });
          dessiner();
        },
      },
      'Tout retirer',
    );
    const message = el('p', { class: 'ordre__message', 'aria-live': 'polite' });
    const actions = el('div', { class: 'actions-jeu' }, boutonVider, boutonVerifier);

    const estPlacee = (carte) => emplacements.includes(carte);
    const cartesLibres = () =>
      cartes.filter((c) => !emplacements.some((e, i) => e === c && verrouilles.has(i)));

    function placer(carte) {
      const libre = emplacements.findIndex((e, i) => e === null && !verrouilles.has(i));
      if (libre === -1 || estPlacee(carte)) return;
      emplacements[libre] = carte;
      ctx.sons.ordre.carte();
      dessiner();
    }

    function dessiner() {
      surtitre.textContent = `Procédure ${index + 1} sur ${procedures.length} · Essai ${Math.min(essai, essaisMax)} sur ${essaisMax}`;
      remplir(
        pioche,
        cartes.map((carte) =>
          el(
            'li',
            {},
            el(
              'button',
              {
                type: 'button',
                class: `ordre__carte${estPlacee(carte) ? ' ordre__carte--placee' : ''}`,
                disabled: terminee || estPlacee(carte),
                'aria-label': `Carte ${carte.lettre} : ${carte.texte}`,
                onclick: () => placer(carte),
              },
              el('span', { class: 'ordre__lettre', 'aria-hidden': 'true' }, carte.lettre),
              el('span', { class: 'ordre__texte' }, carte.texte),
            ),
          ),
        ),
      );
      remplir(
        ordre,
        emplacements.map((carte, i) => {
          const verrou = verrouilles.has(i);
          const contenu = carte
            ? el(
                'button',
                {
                  type: 'button',
                  class: `ordre__pose${verrou ? ' ordre__pose--juste' : ''}`,
                  disabled: verrou || terminee,
                  'aria-label': verrou
                    ? `Position ${i + 1} : carte ${carte.lettre}, bien placée`
                    : `Position ${i + 1} : carte ${carte.lettre}. Cliquer pour la retirer`,
                  onclick: () => {
                    emplacements[i] = null;
                    dessiner();
                  },
                },
                el('span', { class: 'ordre__lettre', 'aria-hidden': 'true' }, carte.lettre),
                el('span', { class: 'ordre__texte' }, carte.texte),
                verrou ? el('span', { class: 'ordre__coche' }, icone('check')) : null,
              )
            : el('span', { class: 'ordre__vide' }, '…');
          return el(
            'li',
            { class: 'ordre__emplacement' },
            el('span', { class: 'ordre__numero', 'aria-hidden': 'true' }, String(i + 1)),
            contenu,
          );
        }),
      );
      boutonVerifier.disabled = terminee || emplacements.some((e) => e === null);
    }

    function verifierOrdre() {
      const resultats = verifier(emplacements);
      const justes = resultats.filter(Boolean).length;
      // Une note par étape bien placée, puis fanfare ou « eh-eh »
      ctx.sons.ordre.verification(justes, emplacements.length);
      resultats.forEach((juste, i) => {
        if (juste) verrouilles.add(i);
        else emplacements[i] = null;
      });
      if (justes === emplacements.length) {
        illustration.etat('range');
        illustration.reagir('fete');
        reussir();
        return;
      }
      animer(ordre, 'secousse');
      illustration.reagir('secousse');
      if (essai >= essaisMax) {
        echouer();
        return;
      }
      essai += 1;
      remplir(
        message,
        `${justes} étape${justes > 1 ? 's' : ''} bien placée${justes > 1 ? 's' : ''} sur ${emplacements.length}. Les autres reviennent dans la pioche : essai ${essai} !`,
      );
      dessiner();
      saisie.focus();
    }

    function conclure(texte, boutons, nomIcone) {
      terminee = true;
      formulaire.hidden = true;
      dessiner();
      const dernier = index === procedures.length - 1;
      const titreFin = el('p', { class: 'ordre__fin' }, icone(nomIcone), texte);
      remplir(
        actions,
        boutons,
        el(
          'button',
          {
            type: 'button',
            class: 'bouton bouton--sombre bouton--grand',
            onclick: () => {
              if (dernier) {
                ctx.terminer({ message: 'Toutes les procédures ont été remises en ordre.' });
                return;
              }
              index += 1;
              afficherProcedure();
            },
          },
          dernier ? 'Voir le classement' : ['Procédure suivante', icone('arrow-right')],
        ),
      );
      remplir(message, titreFin);
      animer(message, 'apparition');
      ctx.annoncer(texte);
      focaliser(titreFin);
    }

    function reussir() {
      const points = pointsPourEssai(essai, essaisMax);
      conclure(
        `Bravo ! Trouvé en ${essai} essai${essai > 1 ? 's' : ''}.`,
        creerBoutonPoints(ctx, { points, titre: 'Qui a trouvé le bon ordre ?', multiple: true }),
        'face-grin-stars',
      );
    }

    function echouer() {
      for (const carte of cartes) emplacements[carte.etape] = carte;
      for (let i = 0; i < emplacements.length; i++) verrouilles.add(i);
      conclure('Voici le bon ordre !', null, 'list-ol');
    }

    formulaire.addEventListener('submit', (e) => {
      e.preventDefault();
      const libres = cartesLibres();
      const lu = lireOrdre(
        saisie.value,
        libres.map((c) => c.lettre),
      );
      if (lu.erreur) {
        remplir(erreur, lu.erreur);
        animer(saisie, 'secousse');
        return;
      }
      erreur.textContent = '';
      const positionsLibres = emplacements.map((_, i) => i).filter((i) => !verrouilles.has(i));
      positionsLibres.forEach((position, k) => {
        emplacements[position] = cartes.find((c) => c.lettre === lu.lettres[k]);
      });
      saisie.value = '';
      dessiner();
      boutonVerifier.focus();
    });

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau ordre' },
        el(
          'div',
          { class: 'ordre__entete' },
          illustration.element,
          el('div', {}, surtitre, titreProcedure),
        ),
        el(
          'div',
          { class: 'ordre__colonnes' },
          el('div', {}, el('p', { class: 'ordre__intertitre' }, 'Les étapes mélangées'), pioche),
          el('div', {}, el('p', { class: 'ordre__intertitre' }, 'Ordre proposé'), ordre),
        ),
        el('div', { class: 'ordre__bas' }, formulaire, actions),
        message,
      ),
    );
    dessiner();
    focaliser(titreProcedure);
  }

  afficherProcedure();
}

monterJeu({
  slug: 'bon-ordre',
  schema,
  exemple,
  regles: [
    'Avant la séance, préparez des procédures de 3 à 7 étapes, dans le bon ordre.',
    'Le jeu mélange les étapes sur des cartes A, B, C… Le groupe dicte l’ordre à l’oral.',
    'Cliquez les cartes dans l’ordre dicté (ou tapez les lettres), puis Vérifier : les étapes bien placées passent au vert.',
    '3 essais par procédure : 3 points au premier essai, 2 au deuxième, 1 au troisième.',
  ],
  demarrer,
});
