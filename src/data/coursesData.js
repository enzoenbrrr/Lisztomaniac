/**
 * Catalogue des 4 ouvrages musicaux de référence disponibles en PDF dans `public/pdf/`.
 */

export const PDF_COURSES = [
  {
    id: 'danhauser-theorie',
    file: 'Danhauser_Theorie-de-la-musique_1929.pdf',
    coverImage: 'pdf/covers/danhauser-theorie-de-la-musique-1929.webp',
    title: 'Théorie de la Musique',
    subtitle: 'Cours de solfège',
    author: 'A. Danhauser',
    year: '1929',
    pages: 128,
    tags: ['Cours', 'Solfège', 'Notation', 'Intervalles & Gammes'],
  },
  {
    id: 'dandelot-manuel-pratique',
    file: 'Dandelot-Manuel-Pratique-1928.pdf',
    coverImage: 'pdf/covers/dandelot-manuel-pratique-1928.webp',
    title: 'Manuel Pratique des Clés',
    subtitle: 'Étude des clés',
    author: 'Georges Dandelot',
    year: '1928',
    pages: 78,
    tags: ['Lecture à vue', 'Clé de Sol', 'Clé de Fa', 'Clés d’Ut'],
  },
  {
    id: 'dandelot-rythme-binaire',
    file: 'Dandelot_Etude-du-rythme_03_binaire.pdf',
    coverImage: 'pdf/covers/dandelot-etude-du-rythme-03-binaire.webp',
    title: 'Étude du Rythme — Binaire',
    subtitle: 'Rythmes simultanés',
    author: 'Georges Dandelot',
    year: '1965',
    pages: 23,
    tags: ['Rythme binaire', 'Indépendance des deux mains', 'Mesures 2/4, 3/4, 4/4'],
  },
  {
    id: 'dandelot-rythme-ternaire',
    file: 'Dandelot_Etude-du-rythme_02_Ternaire.pdf',
    coverImage: 'pdf/covers/dandelot-etude-du-rythme-02-ternaire.webp',
    title: 'Étude du Rythme — Ternaire',
    subtitle: 'Mesures composées',
    author: 'Georges Dandelot',
    year: '1935',
    pages: 29,
    tags: ['Rythme ternaire', 'Mesures composées (6/8, 9/8, 12/8)', 'Noire pointée'],
  },
];

export function getPdfUrl(file) {
  return `${import.meta.env.BASE_URL}pdf/${encodeURIComponent(file)}`;
}

export function getPdfCoverUrl(coverImage) {
  return `${import.meta.env.BASE_URL}${coverImage}`;
}
