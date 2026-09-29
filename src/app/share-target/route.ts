import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // If visited via GET, redirect directly to home
  return NextResponse.redirect(new URL('/', req.url), 303);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    let file: File | null = null;

    // 1. Try standard keys
    const directFile =
      (formData.get('audio') as File | null) ||
      (formData.get('file') as File | null) ||
      (formData.get('files') as File | null) ||
      (formData.get('media') as File | null);

    if (directFile && typeof directFile === 'object' && directFile.size > 0) {
      file = directFile;
    } else {
      // 2. Search through all formData entries for any file
      for (const [, value] of formData.entries()) {
        if (value && typeof value === 'object' && 'arrayBuffer' in value) {
          const candidate = value as File;
          if (candidate.size > 0) {
            file = candidate;
            break;
          }
        }
      }
    }

    if (!file) {
      console.warn('[Web Share Target] No file found in POST formData.');
      return NextResponse.redirect(new URL('/?error=no_file_found', req.url), 303);
    }

    const fileName = file.name || `whatsapp_voice_${Date.now()}.ogg`;
    const mimeType = file.type || 'audio/ogg';
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Return the bridge HTML page that stores the audio across CacheStorage, IndexedDB, and localStorage
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>جاري استقبال الفويس من الواتساب...</title>
  <style>
    body {
      background-color: #f8fafc;
      color: #0f172a;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 320px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #e2e8f0;
      border-top-color: #059669;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h3 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h3>جاري استلام الفويس من الواتساب</h3>
    <p>لحظات وسيتم وضع الفويس وبدء التحويل تلقائياً...</p>
  </div>
  <script>
    async function saveAndForward() {
      const fileName = ${JSON.stringify(fileName)};
      const mimeType = ${JSON.stringify(mimeType)};
      const base64Data = ${JSON.stringify(base64Data)};

      let blob = null;
      try {
        const byteChars = atob(base64Data);
        const u8 = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          u8[i] = byteChars.charCodeAt(i);
        }
        blob = new Blob([u8], { type: mimeType });
      } catch (err) {
        console.warn('Blob creation error:', err);
      }

      const payload = {
        name: fileName,
        type: mimeType,
        base64: base64Data,
        timestamp: Date.now()
      };

      // 1. CacheStorage (Universal across all tabs & PWA instances)
      try {
        if ('caches' in window && blob) {
          const cache = await caches.open('voiceclear-shared-cache');
          const headers = new Headers();
          headers.set('X-File-Name', encodeURIComponent(fileName));
          headers.set('Content-Type', mimeType);
          await cache.put('/shared-audio-file', new Response(blob, { headers }));
        }
      } catch (err) {
        console.warn('Cache write warning:', err);
      }

      // 2. IndexedDB (Persistent origin-wide)
      try {
        if ('indexedDB' in window) {
          await new Promise(function(resolve) {
            const req = indexedDB.open('voiceclear-share-db', 2);
            req.onupgradeneeded = function(e) {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('shared')) {
                db.createObjectStore('shared', { keyPath: 'id' });
              }
            };
            req.onsuccess = function(e) {
              try {
                const db = e.target.result;
                const tx = db.transaction('shared', 'readwrite');
                const store = tx.objectStore('shared');
                store.put({ id: 'latest_share', blob: blob, payload: payload });
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function() { resolve(); };
              } catch (_) {
                resolve();
              }
            };
            req.onerror = function() { resolve(); };
            setTimeout(resolve, 500);
          });
        }
      } catch (err) {
        console.warn('IndexedDB write warning:', err);
      }

      // 3. localStorage & sessionStorage fallbacks
      try {
        localStorage.setItem('voiceclear_shared_audio', JSON.stringify(payload));
      } catch (e) {}
      try {
        sessionStorage.setItem('voiceclear_shared_audio', JSON.stringify(payload));
      } catch (e) {}

      // Redirect to home page with auto-start flag
      window.location.replace('/?shared=1&autostart=1');
    }

    saveAndForward();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {'Content-Type': 'text/html; charset=utf-8'},
    });
  } catch (error) {
    console.error('[Web Share Target Error]:', error);
    return NextResponse.redirect(new URL('/?error=share_failed', req.url), 303);
  }
}
