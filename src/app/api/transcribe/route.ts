import { NextRequest, NextResponse } from 'next/server';
import { processAudioWithGeminiFallback } from '@/services/geminiFallbackService';
import { FallbackAttemptLog, TranscriptionApiResponse } from '@/types';

export const runtime = 'nodejs';
// Allow up to 60s for multi-model fallback processing on Edge/Serverless
export const maxDuration = 60;

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let audioBase64 = '';
    let mimeType = 'audio/ogg';
    let fileName = 'voice_note.ogg';
    let fileSizeBytes = 0;
    let customPrompt: string | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('audio') as File | null;
      customPrompt = (formData.get('prompt') as string) || undefined;

      if (!file) {
        return NextResponse.json<TranscriptionApiResponse>(
          {
            success: false,
            error: 'لم يتم العثور على أي ملف صوتي في الطلب.',
            fallbackTrail: [],
          },
          { status: 400 }
        );
      }

      fileName = file.name || 'whatsapp_audio.ogg';
      mimeType = file.type || 'audio/ogg';
      fileSizeBytes = file.size;

      // 25MB limit check
      if (fileSizeBytes > 25 * 1024 * 1024) {
        return NextResponse.json<TranscriptionApiResponse>(
          {
            success: false,
            error: 'حجم الملف الصوتي كبير جداً. الحد الأقصى المسموح به هو 25 ميجابايت.',
            fallbackTrail: [],
          },
          { status: 413 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      audioBase64 = buffer.toString('base64');
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      audioBase64 = body.audioBase64 || '';
      mimeType = body.mimeType || 'audio/ogg';
      fileName = body.fileName || 'audio_recording.ogg';
      customPrompt = body.customPrompt;
      fileSizeBytes = body.fileSizeBytes || (audioBase64.length * 3) / 4;

      if (!audioBase64) {
        return NextResponse.json<TranscriptionApiResponse>(
          {
            success: false,
            error: 'بيانات الصوت (Base64) مفقودة في الطلب.',
            fallbackTrail: [],
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json<TranscriptionApiResponse>(
        {
          success: false,
          error: 'نوع المحتوى غير مدعوم. يرجى إرسال FormData أو JSON.',
          fallbackTrail: [],
        },
        { status: 415 }
      );
    }

    // Call the 5-stage fallback engine
    const result = await processAudioWithGeminiFallback(
      audioBase64,
      mimeType,
      fileName,
      customPrompt
    );

    return NextResponse.json<TranscriptionApiResponse>({
      success: true,
      refinedText: result.refinedText,
      modelUsed: result.modelUsed,
      latencyMs: result.totalLatencyMs,
      fallbackTrail: result.trail,
      audioMeta: {
        name: fileName,
        mimeType,
        sizeFormatted: formatBytes(fileSizeBytes),
      },
    });
  } catch (error: unknown) {
    console.error('[API Route /api/transcribe Error]:', error);
    const errObj = error as { message?: string; trail?: FallbackAttemptLog[] };
    const errorMessage = errObj.message || 'حدث خطأ غير متوقع أثناء معالجة الرسالة الصوتية.';
    const trail = errObj.trail || [];

    return NextResponse.json<TranscriptionApiResponse>(
      {
        success: false,
        error: errorMessage,
        fallbackTrail: trail,
      },
      { status: 500 }
    );
  }
}
