import { createServer } from 'http';
import { readFile, access } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.tsx':  'application/javascript',
  '.ts':   'application/javascript',
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

  if (!await exists(file) && !extname(file)) {
    for (const ext of TRY_EXTS) {
      if (await exists(file + ext)) { file += ext; break; }
    }
  }

  if (!await exists(file)) {
    res.writeHead(404); res.end('Not found'); return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(500); res.end('Error');
  }
}).listen(PORT, () => console.log(`\n  Running at http://localhost:${PORT}\n`));
