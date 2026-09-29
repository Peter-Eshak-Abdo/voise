import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // If visited via GET, redirect directly to home
  return NextResponse.redirect(new URL('/', 'http://localhost:3000'), 303);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // Look for file under 'audio' (configured in manifest.json) or common fallback keys
    const file =
      (formData.get('audio') as File | null) ||
      (formData.get('file') as File | null) ||
      (formData.get('files') as File | null);

    if (!file || typeof file === 'string') {
      return NextResponse.redirect(new URL('/?error=no_file_received', req.url), 303);
    }

    const fileName = file.name || 'whatsapp_shared.ogg';
    const mimeType = file.type || 'audio/ogg';
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Return a lightweight bridge HTML page that stores the audio in sessionStorage and redirects
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>جاري تحويل الرسالة الصوتية...</title>
  <style>
    body {
      background-color: #090d16;
      color: #34d399;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #1e293b;
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p>جاري استلام الفويس من الواتساب وتجهيزه للتفريغ...</p>
  <script>
    try {
      const payload = {
        name: ${JSON.stringify(fileName)},
        type: ${JSON.stringify(mimeType)},
        base64: ${JSON.stringify(base64Data)},
        timestamp: Date.now()
      };
      sessionStorage.setItem('voiceclear_shared_audio', JSON.stringify(payload));
    } catch (e) {
      console.error('Storage error:', e);
    }
    window.location.replace('/?shared=1');
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[Web Share Target Error]:', error);
    return NextResponse.redirect(new URL('/?error=share_failed', req.url), 303);
  }
}
