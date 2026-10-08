import { monterJeu } from '../../assets/js/commun/cadre-jeu.js';
import { el, remplir, icone, focaliser } from '../../assets/js/commun/ui.js';
import { creerMancheAPaliers } from '../../assets/js/commun/manche-paliers.js';
import { decrireGagnants } from '../../assets/js/commun/points.js';
import { adresseImage } from '../../assets/js/commun/images.js';
import { schema, exemple, transfert } from './exemple.js';
import { ZOOMS, echelle, origine } from './logique.js';
import { creerIllustrationZoom } from './illustration.js';

async function demarrer(ctx) {
  const max = ZOOMS[ctx.reglages.zoom] ?? ZOOMS.moyen;
  const images = ctx.elements;
  // On charge toutes les images avant de commencer (IndexedDB est asynchrone)
  const adresses = await Promise.all(images.map((e) => adresseImage(e.image).catch(() => null)));
  let index = 0;
  let manche = null;
  // La loupe balaie l'image pendant que les chiffres s'éteignent
  const illustration = creerIllustrationZoom();

  // Chaque image est décodée à l'avance, pendant la manche précédente : une grande capture
  // d'écran ne fige plus l'écran au moment de s'afficher
  const pretes = new Map();
  function preparerImage(i) {
    if (i >= images.length || pretes.has(i)) return pretes.get(i);
    const photo = el('img', {
      class: 'zoom__image',
      src: adresses[i] ?? '',
      alt: 'Image mystère, très agrandie',
      draggable: 'false',
      decoding: 'async',
    });
    photo.decode().catch(() => {});
    pretes.set(i, photo);
    return photo;
  }
  // La première aussi, avant de commencer
  await preparerImage(0)
    ?.decode()
    .catch(() => {});

  function afficherImage() {
    manche?.detruire();
    const { image, reponse, explication } = images[index];
    const photo = preparerImage(index);
    pretes.delete(index);
    preparerImage(index + 1);
    photo.style.transformOrigin = origine(image.focus);
    const cadre = el('div', { class: 'zoom__cadre' }, photo);
    // Les proportions du cadre : tout de suite si l'image est prête, sinon à son chargement
    const poserRatio = () => {
      if (photo.naturalWidth && photo.naturalHeight) {
        cadre.style.setProperty('--ratio', String(photo.naturalWidth / photo.naturalHeight));
      }
    };
    if (photo.complete) poserRatio();
    else photo.addEventListener('load', poserRatio, { once: true });
    // L'animation d'apparition se joue d'elle-même quand le résultat cesse d'être caché
    const resultat = el('div', { class: 'zoom__resultat apparition', hidden: true });
    // La réponse vue pendant la pause (« Voir la réponse »), à la place de la question
    let apercu = null;

    function zoomer(valeur) {
      photo.style.transform = `scale(${echelle(valeur, { max })})`;
    }

    // « Voir la réponse », pendant la pause : l'animateur juge la proposition
    function montrerReponse() {
      apercu = el(
        'div',
        { class: 'reponse-revelee zoom__apercu apparition' },
        el('p', { class: 'reponse-revelee__valeur' }, reponse),
      );
      manche.actions.before(apercu);
      ctx.zone.querySelector('.panneau')?.classList.add('reponse-vue');
      ctx.annoncer(`La réponse est : ${reponse}`);
    }

    manche = creerMancheAPaliers({
      ctx,
      dureePalier: ctx.reglages.dureePalier,
      surValeur: zoomer,
      surEtat: (etat) => illustration.etat(etat === 'enCours' ? 'cherche' : null),
      surReponse: montrerReponse,
      surFin({ trouve, gagnants, points }) {
        ctx.zone.querySelector('.panneau')?.classList.add('manche-finie');
        apercu?.remove();
        zoomer(0);
        photo.alt = `Image entière : ${reponse}`;
        const dernier = index === images.length - 1;
        const titre = el(
          'p',
          { class: 'zoom__verdict' },
          trouve
            ? [icone('face-grin-stars'), 'Bien vu !']
            : [icone('hourglass-end'), 'Personne n’a trouvé…'],
        );
        remplir(
          resultat,
          titre,
          el(
            'div',
            { class: 'reponse-revelee' },
            el('p', { class: 'reponse-revelee__valeur' }, reponse),
            explication ? el('p', {}, explication) : null,
          ),
          gagnants?.prenoms.length
            ? el(
                'p',
                { class: 'zoom__gain' },
                icone('check'),
                `+${points} point${points > 1 ? 's' : ''} pour ${decrireGagnants(ctx, gagnants)}`,
              )
            : null,
          el(
            'div',
            { class: 'actions-jeu' },
            el(
              'button',
              {
                type: 'button',
                class: 'bouton bouton--sombre bouton--grand',
                onclick: () => {
                  if (dernier) {
                    ctx.terminer({ message: 'Toutes les images ont été dévoilées.' });
                    return;
                  }
                  index += 1;
                  afficherImage();
                },
              },
              dernier ? 'Voir le classement' : ['Image suivante', icone('arrow-right')],
            ),
          ),
        );
        resultat.hidden = false;
        // L'illustration réagit une fois l'écran de réponse construit
        illustration.reagir(trouve ? 'fete' : 'secousse');
        ctx.annoncer(`La réponse était : ${reponse}`);
        focaliser(titre);
      },
    });

    remplir(
      ctx.zone,
      el(
        'div',
        { class: 'panneau zoom' },
        el('p', { class: 'panneau__surtitre' }, `Image ${index + 1} sur ${images.length}`),
        el(
          'div',
          { class: 'zoom__colonnes' },
          cadre,
          el(
            'div',
            { class: 'zoom__commandes' },
            illustration.element,
            manche.paliers,
            el('h3', { class: 'panneau__texte zoom__question' }, 'Qu’est-ce que c’est ?'),
            manche.actions,
            el(
              'p',
              { class: 'raccourci' },
              el('kbd', {}, 'Espace'),
              ' : démarrer, stop, reprendre',
            ),
            resultat,
          ),
        ),
      ),
    );
    manche.actions.querySelector('button')?.focus();
  }

  afficherImage();
  return () => manche?.detruire();
}

monterJeu({
  slug: 'zoom-mystere',
  schema,
  exemple,
  regles: [
    'Avant la séance, collez vos captures d’écran (Ctrl + V) ou importez des images, et cliquez sur le détail à montrer.',
    'L’image s’affiche très zoomée sur ce détail, puis se dézoome à chaque chiffre perdu : 5, 4, 3, 2, 1.',
    'Quelqu’un pense avoir trouvé ? Stop (Espace) : l’image se fige pendant sa réponse. Un doute ? « Voir la réponse » l’affiche.',
    'Bonne réponse : les points encore allumés vont à qui a trouvé, une ou plusieurs personnes.',
  ],
  demarrer,
  ...transfert,
});
