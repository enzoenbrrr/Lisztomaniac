/**
 * Analyse la luminosité moyenne d'une image de fond (URL ou DataURL)
 * pour adapter automatiquement l'interface en mode Clair ('light') ou Sombre ('dark'),
 * tout en conservant le style monochrome Apple (boutons blancs / verre dépoli).
 */

const brightnessCache = new Map();

/**
 * Calcule la luminance perçue moyenne de l'image (0..255) et retourne 'light' ou 'dark'.
 *
 * @param {string} imageSrc
 * @returns {Promise<'dark' | 'light'>}
 */
export function detectImageBrightness(imageSrc) {
  if (brightnessCache.has(imageSrc)) {
    return Promise.resolve(brightnessCache.get(imageSrc));
  }

  return new Promise((resolve) => {
    if (!imageSrc || typeof document === 'undefined') {
      resolve('dark');
      return;
    }

    const img = new Image();
    if (!imageSrc.startsWith('data:')) {
      img.crossOrigin = 'Anonymous';
    }

    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('dark');
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let luminanceSum = 0;
        let pixelCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 64) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Formule de luminance perçue Rec. 601
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          luminanceSum += lum;
          pixelCount += 1;
        }

        if (pixelCount === 0) {
          brightnessCache.set(imageSrc, 'dark');
          resolve('dark');
          return;
        }

        const avgLuminance = luminanceSum / pixelCount;
        const result = avgLuminance >= 138 ? 'light' : 'dark';
        if (brightnessCache.size > 50) brightnessCache.clear();
        brightnessCache.set(imageSrc, result);
        resolve(result);
      } catch {
        resolve('dark');
      }
    };

    img.onerror = () => {
      resolve('dark');
    };

    img.src = imageSrc;
  });
}

/**
 * Redimensionne et compresse un fichier image glissé-déposé en DataURL léger
 * pour pouvoir le sauvegarder dans LocalStorage sans dépasser le quota navigateur.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export function compressImageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non reconnu.'));
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
