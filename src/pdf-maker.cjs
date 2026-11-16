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
// Toby: capture a self-contained HTML page as a picture (carousel slides, a book's cover). The page is laid
// out at exactly width x height CSS pixels through Chromium's own device emulation and captured with its
// screenshot command, so the window, the screen size and Windows display scaling never change the result.
// script (optional) runs in the page first and its result is returned (the slide check); hideCss (optional)
// is applied afterwards for a second capture without the words, returned as a raw BGRA bitmap for measuring
// contrast. clipSelector captures one element's box. Every network request is still blocked.
async function renderPage({ file, width, height, root, signal, script, hideCss, clipSelector, quality = 92 }) {
  const { nativeImage } = require('electron');
  const ses = guard(root || path.dirname(file));
  const win = new BrowserWindow({ show: false, width: 800, height: 600, webPreferences: { session: ses, javascript: true, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, images: true, backgroundThrottling: false, offscreen: true } });
  const abort = () => { if (!win.isDestroyed()) win.destroy(); };
  signal?.addEventListener('abort', abort, { once: true });
  const wc = win.webContents;
  try {
    await Promise.race([win.loadURL(pathToFileURL(file).href), new Promise((_, reject) => setTimeout(() => reject(new Error('The page took too long to load.')), 60000))]);
    wc.debugger.attach('1.3');
    const cdp = (method, params = {}) => wc.debugger.sendCommand(method, params);
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false, screenWidth: width, screenHeight: height });
    await cdp('Emulation.setScrollbarsHidden', { hidden: true });
    const result = script ? await wc.executeJavaScript(script, true) : null;
    const shoot = async clip => nativeImage.createFromBuffer(Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })).data, 'base64'));
    if (clipSelector) {
      const rect = await wc.executeJavaScript(`(()=>{const e=document.querySelector(${JSON.stringify(clipSelector)});if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),width:Math.round(r.width),height:Math.round(r.height)};})()`, true);
      if (!rect) throw new Error('Nothing on that page matches ' + clipSelector + '.');
      const part = await shoot(rect);
      return { jpeg: part.toJPEG(quality), result, width: part.getSize().width, height: part.getSize().height };
    }
    const picture = await shoot();
    if (picture.isEmpty()) throw new Error('The page could not be captured.');
    const size = picture.getSize();
    if (size.width !== width || size.height !== height) throw new Error(`The capture came out ${size.width} x ${size.height}, not ${width} x ${height}.`);
    let background = null;
    if (hideCss) { await wc.insertCSS(hideCss); await wc.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))', true); background = { bitmap: (await shoot()).toBitmap(), width, height }; }
    return { jpeg: picture.toJPEG(quality), result, background, width, height };
  } finally { signal?.removeEventListener('abort', abort); try { wc.debugger.detach(); } catch {} abort(); }
}
module.exports = { makePdf, renderPage };
