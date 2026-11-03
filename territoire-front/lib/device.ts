/**
 * iPhone, iPad ou iPod : tous les navigateurs y reposent sur WebKit, sans Web Serial. Un iPad récent se présente
 * comme un Mac : son écran tactile le distingue. À appeler dans le navigateur (effet, clic), jamais au chargement
 * du module ni pendant le rendu serveur.
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const { userAgent, maxTouchPoints } = navigator;
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}
