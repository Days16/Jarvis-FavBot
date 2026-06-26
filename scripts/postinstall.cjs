const fs   = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');

try {
  let code = fs.readFileSync(target, 'utf8');

  const ORIGINAL_STDERR = `process2.stderr?.on("data", (chunk) => {
      output += chunk;
    });`;

  if (!code.includes(ORIGINAL_STDERR)) {
    console.log('[postinstall] @distube/yt-dlp ya está parcheado o la versión es diferente — nada que hacer.');
    process.exit(0);
  }

  // Separar stderr de stdout para que los warnings de yt-dlp no rompan JSON.parse
  code = code.replace(
    ORIGINAL_STDERR,
    `let errput = "";
    process2.stderr?.on("data", (chunk) => {
      errput += chunk;
    });`
  );

  code = code.replace(
    `if (code === 0) resolve(JSON.parse(output));\n      else reject(new Error(output));`,
    `if (code === 0) resolve(JSON.parse(output));\n      else reject(new Error(errput || output));`
  );

  fs.writeFileSync(target, code, 'utf8');
  console.log('[postinstall] @distube/yt-dlp parcheado correctamente.');
} catch (err) {
  console.warn('[postinstall] No se pudo parchear @distube/yt-dlp:', err.message);
}
