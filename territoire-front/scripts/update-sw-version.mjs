import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swPath = path.resolve(__dirname, "../public/sw.js");

if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, "utf-8");
  const buildId = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14);
  const newCacheName = `pwa-cache-${buildId}`;

  content = content.replace(
    /const CACHE_NAME = ["'][^"']+["'];/,
    `const CACHE_NAME = "${newCacheName}";`
  );
  fs.writeFileSync(swPath, content, "utf-8");
  console.log(`[Build] Service Worker cache mis à jour : ${newCacheName}`);
} else {
  console.warn(
    `[Build] Fichier Service Worker non trouvé à l'emplacement : ${swPath}`
  );
}
