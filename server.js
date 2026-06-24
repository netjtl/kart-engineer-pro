import { createServer } from 'http';
import { readFile, access } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { transform } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const TRY_EXTS = ['.tsx', '.ts', '.jsx', '.js'];

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

createServer(async (req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';

  let file = join(__dirname, url);
  let ext = extname(file);

  if (!await exists(file) && !ext) {
    for (const e of TRY_EXTS) {
      if (await exists(file + e)) { file += e; ext = e; break; }
    }
  }

  if (!await exists(file)) {
    res.writeHead(404); res.end('Not found'); return;
  }

  try {
    const raw = await readFile(file);
    if (['.tsx', '.ts', '.jsx'].includes(ext)) {
      const { code } = await transform(raw.toString(), {
        loader: ext.slice(1),
        format: 'esm',
        target: 'es2020',
        jsx: 'transform',
      });
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(code);
    } else {
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
      res.end(raw);
    }
  } catch (e) {
    console.error('Transform error:', e.message);
    res.writeHead(500); res.end('Server error: ' + e.message);
  }
}).listen(PORT, () => console.log(`\n  Running at http://localhost:${PORT}\n`));
