import { describe, it, expect } from 'vitest';
import { typographier, el, remplir } from '../../assets/js/commun/ui.js';

// Espace insécable (U+00A0), affichée « ~ » ici pour lire les attendus facilement
const voir = (texte) => texte.replaceAll('\u00a0', '~');

describe('typographie française', () => {
  it('rend insécable l’espace avant ! ? ; : (la ponctuation ne part plus seule à la ligne)', () => {
    expect(voir(typographier('Comment on joue ?'))).toBe('Comment on joue~?');
    expect(voir(typographier('Durée : 5 min ; bravo !'))).toBe('Durée~: 5~min~; bravo~!');
    // L'ancienne espace fine, trop étroite pour se voir, devient une espace insécable
    expect(voir(typographier('Prêts\u202f?'))).toBe('Prêts~?');
  });

  it('ajoute l’espace qui manque en fin de mot', () => {
    expect(voir(typographier('Prêts? Partez!'))).toBe('Prêts~? Partez~!');
    expect(voir(typographier('Ex.: souris'))).toBe('Ex.~: souris');
    expect(voir(typographier('Quoi?!'))).toBe('Quoi~?!');
    expect(voir(typographier('« Trouvé »!'))).toBe('«~Trouvé~»~!');
  });

  it('ne touche ni aux adresses, ni aux heures, ni à une espace déjà insécable', () => {
    expect(typographier('https://formation.skazy.nc')).toBe('https://formation.skazy.nc');
    expect(typographier('page.html?id=2')).toBe('page.html?id=2');
    expect(typographier('Rendez-vous à 10:30')).toBe('Rendez-vous à 10:30');
    expect(voir(typographier('Bravo\u00a0!'))).toBe('Bravo~!');
    expect(voir(typographier(typographier('Qui ? « Moi » !')))).toBe('Qui~? «~Moi~»~!');
  });

  it('garde un nombre avec ce qui le suit : nom, unité, milliers', () => {
    expect(voir(typographier('Le groupe · 3 participants'))).toBe('Le groupe~· 3~participants');
    expect(voir(typographier('10 mots à faire deviner · 2 par binôme'))).toBe(
      '10~mots à faire deviner~· 2~par binôme',
    );
    expect(voir(typographier('Marge de 10 %'))).toBe('Marge de 10~%');
    expect(voir(typographier('1 000 000 habitants'))).toBe('1~000~000~habitants');
    // « a-t- » ne reste pas en fin de ligne : un liant invisible (U+2060) suit les tirets
    expect(typographier('Quand a-t-il été créé ?').replaceAll('\u2060', '^')).toBe(
      'Quand a-^t-^il été créé' + '\u00a0?',
    );
    // Deux nombres qui ne forment pas un millier restent séparables
    expect(voir(typographier('Les paliers 5 4 3 2 1'))).toBe('Les paliers 5 4 3 2 1');
  });

  it('met des espaces insécables dans les guillemets', () => {
    expect(voir(typographier('le jeu répond « c’est plus »'))).toBe('le jeu répond «~c’est plus~»');
    expect(voir(typographier('«plus»'))).toBe('«~plus~»');
  });

  it('s’applique aux textes de el() et remplir(), et aux attributs affichés', () => {
    const champ = el('input', {
      placeholder: 'Ex. : Marie',
      title: 'Plein écran (touche F) !',
      'aria-label': 'Prénom ?',
      value: 'Garder : tel quel',
    });
    expect(voir(champ.getAttribute('placeholder'))).toBe('Ex.~: Marie');
    expect(voir(champ.getAttribute('title'))).toBe('Plein écran (touche F)~!');
    expect(voir(champ.getAttribute('aria-label'))).toBe('Prénom~?');
    // La valeur saisie n'est jamais modifiée
    expect(champ.value).toBe('Garder : tel quel');
    const p = el('p', {}, 'Aucun participant : ');
    expect(voir(remplir(p, 'Mot de passe incorrect !').textContent)).toBe(
      'Mot de passe incorrect~!',
    );
  });
});
