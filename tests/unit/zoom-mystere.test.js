import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { echelle, origine, idsImages, ZOOMS } from '../../jeux/zoom-mystere/logique.js';
import { schema, exemple } from '../../jeux/zoom-mystere/exemple.js';
import { nettoyerContenu, validerContenu } from '../../assets/js/commun/contenu.js';
import {
  enregistrerImage,
  lireImage,
  nettoyerImages,
  adresseImage,
  lireFichierImage,
  imageDuCollage,
} from '../../assets/js/commun/images.js';

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Zoom mystère', () => {
  it('dézoome d’un cran à chaque palier, puis montre l’image entière', () => {
    const valeurs = [5, 4, 3, 2, 1].map((v) => echelle(v, { max: 10 }));
    expect(valeurs[0]).toBe(10);
    expect(valeurs[4]).toBeCloseTo(1.6);
    for (let i = 1; i < valeurs.length; i++) expect(valeurs[i]).toBeLessThan(valeurs[i - 1]);
    expect(echelle(0)).toBe(1);
    expect(echelle(5, { max: ZOOMS.fort })).toBe(16);
  });

  it('place le point fixe du zoom sur le détail choisi', () => {
    expect(origine({ x: 0.156, y: 0.123 })).toBe('15.6% 12.3%');
    expect(origine(undefined)).toBe('50% 50%');
    expect(origine({ x: 2, y: -1 })).toBe('100% 0%');
  });

  it('a un exemple valide avec des images d’exemple', () => {
    const contenu = nettoyerContenu(schema, exemple);
    expect(validerContenu(schema, contenu)).toEqual([]);
    expect(contenu.elements.every((e) => e.image.src.startsWith('exemples/'))).toBe(true);
  });

  it('liste les images enregistrées utilisées', () => {
    expect(
      idsImages({
        elements: [{ image: { id: 'a' } }, { image: { src: 'x.svg' } }, { image: null }],
      }),
    ).toEqual(['a']);
  });
});

describe('images (IndexedDB)', () => {
  it('enregistre, relit et nettoie les images', async () => {
    const a = await enregistrerImage(PIXEL);
    const b = await enregistrerImage(PIXEL);
    expect(await lireImage(a)).toBe(PIXEL);
    expect(await adresseImage({ id: a })).toBe(PIXEL);
    expect(await adresseImage({ src: 'exemples/x.svg' })).toBe('exemples/x.svg');
    await nettoyerImages([a]);
    expect(await lireImage(b)).toBeNull();
    expect(await lireImage(a)).toBe(PIXEL);
  });

  it('refuse un fichier qui n’est pas une image', async () => {
    const texte = new File(['bonjour'], 'note.txt', { type: 'text/plain' });
    await expect(lireFichierImage(texte)).rejects.toThrow('n’est pas une image');
  });

  it('lit une image collée', async () => {
    const fichier = new File([new Uint8Array([1, 2, 3])], 'capture.png', { type: 'image/png' });
    const collage = {
      clipboardData: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => fichier }] },
    };
    expect(imageDuCollage(collage)).toBe(fichier);
    expect(imageDuCollage({ clipboardData: { items: [] } })).toBeNull();
    expect(await lireFichierImage(fichier)).toMatch(/^data:image\/png;base64,/);
  });
});
