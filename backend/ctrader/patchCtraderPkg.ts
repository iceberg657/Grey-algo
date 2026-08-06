import fs from 'fs';
import path from 'path';

try {
  const pkgPath = path.join(process.cwd(), 'node_modules', 'ctrader-ts', 'package.json');
  if (fs.existsSync(pkgPath)) {
    const content = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(content);
    let modified = false;
    if (pkg.exports && pkg.exports['.']) {
      if (!pkg.exports['.'].default) {
        pkg.exports['.'].default = './dist/src/index.js';
        modified = true;
      }
      if (!pkg.exports['.'].require) {
        pkg.exports['.'].require = './dist/src/index.js';
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log('[cTrader Patch] Patched node_modules/ctrader-ts/package.json for Node CJS/ESM compatibility');
    }
  }
} catch (e) {
  console.warn('[cTrader Patch] Notice:', e);
}
