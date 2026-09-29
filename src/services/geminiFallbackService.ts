/**
 * VoiceClear PWA - Gemini AI Resilient Fallback Service
 */

import { FallbackAttemptLog, GeminiModelId } from '@/types';

export const GEMINI_FALLBACK_MODELS: string[] = [
  'gemini-2.5-flash',       // Highly reliable, fast audio processing
  'gemini-2.5-flash-lite',  // High throughput free-tier fallback
  'gemini-3.8-flash',       // Next-gen flash
  'gemini-3.5-pro',
  'gemini-3.0-pro',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
];

export const SYSTEM_VOICE_PROMPT = `أنت محرر نصوص ذكي. المستخدم بيتكلم بطبيعته.
المطلوب منك تفريغ الصوت وتحويله إلى نص عربي فصيح أو عامي راقٍ ومنقح:
1. شيل أي كحة، تهتهة، تردد أو كلمات حشو (زي: آآ، امم، يعني، أه).
2. لو المستخدم غلط وصلح لنفسه في نفس الجملة (مثلاً: هنروح يوم الأحد، لأ قصدي الاتنين)، طلع النتيجة النهائية المقصودة بس (هنروح يوم الاتنين).
3. خلي النص النهائي مفهوم ومترابط تماماً، علامات الترقيم مظبوطة، ومفيش فيه أي حشو كلام.
4. حافظ على جوهر ومعنى الرسالة الصوتية والمقصد الأصلي للمتحدث.
5. أعد النص النهائي المنقح فقط بدون أي مقدمات أو اعتذارات أو شروحات.`;

export interface FallbackExecutionResult {
  refinedText: string;
  modelUsed: string;
  totalLatencyMs: number;
  trail: FallbackAttemptLog[];
}

export function toUserFriendlyErrorMessage(errorMsg: string): string {
  const lower = (errorMsg || '').toLowerCase();

  if (lower.includes('quota') || lower.includes('429') || lower.includes('rate-limit') || lower.includes('rate limit')) {
    return 'سيرفرات الذكاء الاصطناعي وصلت لحد الاستخدام المؤقت المجاني من جوجل. يرجى الانتظار نصف دقيقة والضغط على "حاول تاني".';
  }
  if (lower.includes('high demand') || lower.includes('spikes in demand') || lower.includes('503') || lower.includes('overloaded')) {
    return 'الخدمة عليها ضغط مؤقت حالياً من شركة جوجل. يرجى الانتظار لحظات والضغط على "حاول تاني".';
  }
  if (lower.includes('aborted') || lower.includes('timeout')) {
    return 'استغرقت معالجة الصوت وقتاً أطول من المعتاد بسبب بطء الاتصال، يرجى الضغط على "حاول تاني".';
  }
  if (lower.includes('key') || lower.includes('api_key') || lower.includes('unauthenticated')) {
    return 'مفتاح الـ Gemini API بحاجة للتحقق في إعدادات البيئة (Vercel Environment Variables).';
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return 'حدث خطأ مؤقت في الاتصال بنموذج الذكاء الاصطناعي. يرجى إعادة المحاولة.';
  }

  return 'تعذر إكمال تفريغ الصوت في الوقت الحالي بسبب ضغط مؤقت على الخوادم. اضغط على "حاول تاني" لإعادة المعالجة.';
}

export function normalizeAudioMimeType(mimeType: string, fileName?: string): string {
  const lowerMime = (mimeType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  if (lowerMime.includes('ogg') || lowerName.endsWith('.ogg')) {
    return 'audio/ogg';
  }
  if (lowerMime.includes('opus') || lowerName.endsWith('.opus')) {
    return 'audio/ogg';
  }
  if (lowerMime.includes('wav') || lowerName.endsWith('.wav')) {
    return 'audio/wav';
  }
  if (lowerMime.includes('m4a') || lowerName.endsWith('.m4a') || lowerMime.includes('mp4') || lowerName.endsWith('.mp4')) {
    return 'audio/mp4';
  }
  if (lowerMime.includes('mpeg') || lowerMime.includes('mp3') || lowerName.endsWith('.mp3')) {
    return 'audio/mp3';
  }
  if (lowerMime.includes('webm') || lowerName.endsWith('.webm')) {
    return 'audio/webm';
  }
  if (lowerMime.includes('aac') || lowerName.endsWith('.aac')) {
    return 'audio/aac';
  }

  return 'audio/ogg';
}

export async function processAudioWithGeminiFallback(
  audioBase64: string,
  rawMimeType: string,
  fileName?: string,
  customPrompt?: string
): Promise<FallbackExecutionResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      'مفتاح Gemini API Key غير مهيأ في متغيرات البيئة. يرجى إضافة GEMINI_API_KEY في إعدادات Vercel.'
    );
  }

  const mimeType = normalizeAudioMimeType(rawMimeType, fileName);
  const prompt = customPrompt?.trim() ? customPrompt : SYSTEM_VOICE_PROMPT;
  const trail: FallbackAttemptLog[] = [];
  const overallStart = Date.now();

  for (let i = 0; i < GEMINI_FALLBACK_MODELS.length; i++) {
    const model = GEMINI_FALLBACK_MODELS[i];
    const attemptStart = Date.now();

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // 28-second timeout per attempt to give Gemini full time to transcribe audio
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 28000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const attemptDuration = Date.now() - attemptStart;

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        let parsedMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const jsonErr = JSON.parse(errorBody);
          if (jsonErr?.error?.message) {
            parsedMessage = jsonErr.error.message;
          }
        } catch {
          // ignore
        }

        trail.push({
          model,
          success: false,
          statusCode: response.status,
          error: parsedMessage,
          durationMs: attemptDuration,
          timestamp: new Date().toISOString(),
        });

        console.warn(`[Gemini Fallback] Model ${model} failed (${response.status}). Trying next model...`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
        trail.push({
          model,
          success: false,
          error: 'استجاب الموديل بدون نص',
          durationMs: attemptDuration,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const cleanedText = rawText.trim();

      trail.push({
        model,
        success: true,
        durationMs: attemptDuration,
        timestamp: new Date().toISOString(),
      });

      return {
        refinedText: cleanedText,
        modelUsed: model,
        totalLatencyMs: Date.now() - overallStart,
        trail,
      };
    } catch (err: unknown) {
      const attemptDuration = Date.now() - attemptStart;
      const errorMsg = err instanceof Error ? err.message : String(err);

      trail.push({
        model,
        success: false,
        error: errorMsg,
        durationMs: attemptDuration,
        timestamp: new Date().toISOString(),
      });

      console.warn(`[Gemini Fallback] Exception while querying ${model}: ${errorMsg}. Trying next model...`);
    }
  }

  // If all models failed, pick the most descriptive error and convert it to a friendly message
  const lastError = trail[trail.length - 1]?.error || 'فشلت الموديلات في المعالجة';
  const friendlyMessage = toUserFriendlyErrorMessage(lastError);

  const finalError = new Error(friendlyMessage);
  (finalError as unknown as { trail: FallbackAttemptLog[] }).trail = trail;
  throw finalError;
}
