const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
if (path.dirname(out) !== root || path.basename(out) !== 'dist') throw new Error('Invalid build output');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of ['index.html', 'src']) {
  const source = path.join(root, name);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(out, name), { recursive: true });
}
// API_BASE_URL is public routing configuration, never a secret.
if (fs.existsSync(path.join(root,'public'))) fs.cpSync(path.join(root,'public'),out,{recursive:true});
fs.writeFileSync(path.join(out, 'src/config/runtime-config.js'), 'export const config = Object.freeze('+JSON.stringify({dataMode:'api',apiBaseUrl:process.env.API_BASE_URL||'/api'})+');\n');
console.log('API-connected frontend built in frontend/dist/. Deploy the backend and configure API routing before publishing.');
