/**
 * Convertit un lien de partage Google Drive en lien direct pour affichage d'image.
 */
export const convertToDirectLink = (url: string) => {
  if (!url) return '';
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/u/0/d/${driveMatch[1]}`;
  }
  return url;
};
