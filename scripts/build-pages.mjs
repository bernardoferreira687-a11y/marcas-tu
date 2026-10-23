import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Keep the published demo self-contained so it works at a GitHub Pages subpath.
const source = resolve('dist');
const output = resolve('dist-pages');
let html = await readFile(resolve(source, 'index.html'), 'utf8');
const scriptTag = html.match(/<script\b[^>]*\bsrc="(\/assets\/[^\"]+\.js)"[^>]*><\/script>/);
const styleTag = html.match(/<link\b[^>]*\bhref="(\/assets\/[^\"]+\.css)"[^>]*>/);
if (!scriptTag || !styleTag) throw new Error('Executa npm run build antes de preparar o Pages.');
let script = await readFile(resolve(source, scriptTag[1].slice(1)), 'utf8');
const style = await readFile(resolve(source, styleTag[1].slice(1)), 'utf8');
if (script.includes('import.meta') || /\bimport\s*[(\{*]/.test(script)) {
  throw new Error('O bundle precisa de ser autónomo, sem imports externos.');
}
const declarations = [];
for (const [index, filename] of (await readdir(resolve(source, 'images'))).sort().entries()) {
  if (!filename.endsWith('.png')) continue;
  const path = `/images/${filename}`;
  if (!script.includes(path)) continue;
  const variable = `__MARCASTU_OFFLINE_PHOTO_${index + 1}`;
  if (script.includes(variable)) throw new Error('Nome de asset já existente no bundle.');
  const data = await readFile(resolve(source, 'images', filename));
  declarations.push(`const ${variable}=${JSON.stringify(`data:image/png;base64,${data.toString('base64')}`)};`);
  // Vite emits these paths inside template literals, both in data and in views.
  script = script.replaceAll(path, '${' + variable + '}');
}
script = `${declarations.join('\n')}\n${script}`.replace(/<\/script/gi, '<\\/script');
html = html.replace(scriptTag[0], () => `<script type="module">\n${script}\n</script>`);
html = html.replace(styleTag[0], () => `<style>\n${style}\n</style>`);
const favicon = (await readFile(resolve(source, 'favicon.svg'))).toString('base64');
html = html.replace('href="/favicon.svg"', `href="data:image/svg+xml;base64,${favicon}"`);
if (/(?:src|href)="\/(?:assets|images|favicon)/.test(html)) {
  throw new Error('Ainda há recursos dependentes do caminho raiz.');
}
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'index.html'), html);
await writeFile(resolve(output, '.nojekyll'), '');
console.log(`Publicação preparada em dist-pages (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB).`);
