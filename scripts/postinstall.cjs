const fs   = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');

try {
  let code = fs.readFileSync(target, 'utf8');
  let changed = false;

  // 1. Separar stderr de stdout (warnings no rompen JSON.parse)
  const STDERR_ORIGINAL = `process2.stderr?.on("data", (chunk) => {
      output += chunk;
    });`;
  if (code.includes(STDERR_ORIGINAL)) {
    code = code
      .replace(
        STDERR_ORIGINAL,
        `let errput = "";
    process2.stderr?.on("data", (chunk) => {
      errput += chunk;
    });`,
      )
      .replace(
        'if (code === 0) resolve(JSON.parse(output));\n      else reject(new Error(output));',
        'if (code === 0) resolve(JSON.parse(output));\n      else reject(new Error(errput || output));',
      );
    changed = true;
    console.log('[postinstall] Parche 1: stderr separado de stdout.');
  }

  // 2. Eliminar --no-call-home de getStreamURL (error fatal en yt-dlp 2026+)
  if (code.includes('noCallHome: true,')) {
    code = code.replace(/\s*noCallHome: true,\n/g, '\n');
    changed = true;
    console.log('[postinstall] Parche 2: eliminado --no-call-home.');
  }

  // 3. Añadir player_client=ios,tv_embedded en resolve() para bypassar bot detection
  const RESOLVE_SIMULATE = `      simulate: true
    }).catch((e2) => {
      throw new import_distube.DisTubeError("YTDLP_ERROR", \`\${e2.stderr || e2}\`);
    });`;
  if (code.includes(RESOLVE_SIMULATE)) {
    code = code.replace(
      RESOLVE_SIMULATE,
      `      simulate: true,
      extractorArgs: "youtube:player_client=ios,tv_embedded",
    }).catch((e2) => {
      throw new import_distube.DisTubeError("YTDLP_ERROR", \`\${e2.stderr || e2}\`);
    });`,
    );
    changed = true;
    console.log('[postinstall] Parche 3: player_client=ios,tv_embedded en resolve().');
  }

  // 4. Añadir player_client en getStreamURL()
  const STREAM_FORMAT = `      format: "ba/ba*"
    }).catch((e2) => {
      throw new import_distube.DisTubeError("YTDLP_ERROR", \`\${e2.stderr || e2}\`);
    });`;
  if (code.includes(STREAM_FORMAT)) {
    code = code.replace(
      STREAM_FORMAT,
      `      format: "ba/ba*",
      extractorArgs: "youtube:player_client=ios,tv_embedded",
    }).catch((e2) => {
      throw new import_distube.DisTubeError("YTDLP_ERROR", \`\${e2.stderr || e2}\`);
    });`,
    );
    changed = true;
    console.log('[postinstall] Parche 4: player_client=ios,tv_embedded en getStreamURL().');
  }

  if (changed) {
    fs.writeFileSync(target, code, 'utf8');
    console.log('[postinstall] @distube/yt-dlp parcheado correctamente.');
  } else {
    console.log('[postinstall] @distube/yt-dlp ya estaba parcheado — nada que hacer.');
  }
} catch (err) {
  console.warn('[postinstall] No se pudo parchear @distube/yt-dlp:', err.message);
}
