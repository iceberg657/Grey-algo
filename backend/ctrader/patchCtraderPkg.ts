import fs from 'fs';
import path from 'path';

try {
  const dirPath = path.join(process.cwd(), 'node_modules', 'ctrader-ts');
  const pkgPath = path.join(dirPath, 'package.json');
  
  if (!fs.existsSync(pkgPath)) {
      console.log('[cTrader Patch] Recreating node_modules/ctrader-ts/package.json');
      const newPkg = {
          "name": "ctrader-ts",
          "version": "1.0.1",
          "main": "./dist/src/index.js",
          "types": "./dist/src/index.d.ts",
          "exports": {
              ".": {
                  "require": "./dist/src/index.js",
                  "import": "./dist/src/index.js"
              }
          }
      };
      // Do NOT set "type": "module" so it's treated as CJS! Wait, if it's CJS, `import` inside `ctrader-ts` will throw "Cannot use import statement outside a module"!
      fs.writeFileSync(pkgPath, JSON.stringify(newPkg, null, 2));
  } else {
      const content = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(content);

      if (pkg.exports && pkg.exports['.']) {
        if (!pkg.exports['.'].require) {
          pkg.exports['.'].require = './dist/src/index.js';
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
          console.log('[cTrader Patch] Patched node_modules/ctrader-ts/package.json for Node CJS/ESM compatibility');
        }
      }
  }
} catch (e) {
  console.error('[cTrader Patch Error]', e);
}
