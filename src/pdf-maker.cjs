// Toby: turn a self-contained HTML file from the team folder into a PDF with Chromium's own printer.
// The page loads in a hidden window with scripts off and every network request blocked, so a book
// can only use what is inside the file or files beside it (file: and data: URLs).
const { BrowserWindow, session } = require('electron');
const { pathToFileURL, fileURLToPath } = require('node:url');
const path = require('node:path');

const PARTITION = 'toby-pdf';
const norm = value => { const full = path.resolve(value); return process.platform === 'win32' ? full.toLowerCase() : full; };
let guarded = false;
function guard(folder) {
  const ses = session.fromPartition(PARTITION);
  if (!guarded) {
    guarded = true;
    ses.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      if (url.startsWith('data:') || url.startsWith('blob:')) return callback({});
      if (url.startsWith('file:')) {
        try { const target = norm(fileURLToPath(url)); return callback({ cancel: !guard.roots.some(root => target === root || target.startsWith(root + path.sep)) }); }
        catch { return callback({ cancel: true }); }
      }
      callback({ cancel: true });
    });
    ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  }
  guard.roots = [norm(folder)];
  return ses;
}
guard.roots = [];

async function makePdf({ file, pageSize = 'Letter', signal, root }) {
  const ses = guard(root || path.dirname(file));
  const win = new BrowserWindow({ show: false, width: 1100, height: 1400, webPreferences: { session: ses, javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, images: true } });
  const abort = () => { if (!win.isDestroyed()) win.destroy(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    await Promise.race([win.loadURL(pathToFileURL(file).href), new Promise((_, reject) => setTimeout(() => reject(new Error('The page took too long to load.')), 60000))]);
    const bytes = await win.webContents.printToPDF({ pageSize: pageSize === 'Book' ? { width: 7, height: 10 } : pageSize, printBackground: true, preferCSSPageSize: true, generateDocumentOutline: true, generateTaggedPDF: true });
    if (bytes.length > 20000000) throw new Error('The PDF is larger than 20 MB. Use smaller images.');
    return Buffer.from(bytes);
  } finally { signal?.removeEventListener('abort', abort); abort(); }
}
module.exports = { makePdf };
