const fs = require('fs');
const path = require('path');

const srcFileArg = process.argv[2] || process.env.SOURCE_CSV || 'opcoes_final_tratado.csv';
const destFileArg = process.argv[3] || process.env.DEST_CSV || path.join('src', 'opcoes_final_tratado.csv');

const absSrc = path.resolve(srcFileArg);
const absDest = path.resolve(destFileArg);

try {
  if (!fs.existsSync(absSrc)) {
    console.error(`Arquivo fonte não encontrado: ${absSrc}`);
    process.exitCode = 2;
  } else {
    // garante pasta destino existe
    const destDir = path.dirname(absDest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    fs.copyFileSync(absSrc, absDest);
    console.log(`✔ CSV copiado: ${absSrc} → ${absDest}`);
  }
} catch (err) {
  console.error('Erro ao copiar CSV:', err && err.message ? err.message : err);
  process.exitCode = 1;
}
