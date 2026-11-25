import fs from 'node:fs';
import path from 'node:path';

process.env.NODE_ENV = 'test';
const appPath = fs.existsSync(path.resolve(process.cwd(), 'apps/api/src/app.js'))
  ? './apps/api/src/app.js'
  : (fs.existsSync(path.resolve(process.cwd(), 'apps/api/index.js')) ? './apps/api/index.js' : './server/index.js');

const { default: app } = await import(path.resolve(process.cwd(), appPath).replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));

function extractPrefix(regexp) {
  if (!regexp) return '';
  let src = regexp.source
    .replace('^\\/', '/')
    .replace('\\/?(?=\\/|$)', '')
    .replace('(?=\\/|$)', '')
    .replace(/\\\//g, '/')
    .replace(/\$$/, '');
  return src === '/' ? '' : src;
}

function collectRoutes(stack, prefix = '', out = []) {
  for (const layer of stack || []) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).filter(m => layer.route.methods[m]).map(m => m.toUpperCase()).sort();
      const fullPath = (prefix + layer.route.path).replace(/\/+/g, '/') || '/';
      const middlewares = layer.route.stack.map(s => s.name || '<anonymous>');
      for (const method of methods) {
        out.push({ method, path: fullPath, middlewares });
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const subPrefix = layer.path ? prefix + layer.path : prefix + extractPrefix(layer.regexp);
      collectRoutes(layer.handle.stack, subPrefix, out);
    }
  }
  return out;
}

const routerStack = app._router?.stack || app.router?.stack || [];
const routes = collectRoutes(routerStack);

const outIdx = process.argv.indexOf('--out');
const outFile = outIdx !== -1 ? process.argv[outIdx + 1] : null;
const payload = JSON.stringify({ count: routes.length, routes }, null, 2);

if (outFile) {
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(path.resolve(outFile), payload);
  console.log(`Dumped ${routes.length} routes to ${outFile}`);
} else {
  console.log(payload);
}
