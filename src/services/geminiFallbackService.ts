/**
 * VoiceClear PWA - Gemini AI 5-Stage Fallback Service
 * 
 * Sequentially queries the requested Gemini models in order:
 * 1. gemini-3.8-flash (Primary)
 * 2. gemini-3.5-pro   (Fallback 1)
 * 3. gemini-3.0-pro   (Fallback 2)
 * 4. gemini-2.5-flash (Fallback 3)
 * 5. gemini-2.0-pro   (Fallback 4)
 * 
 * If a model fails (HTTP 404, 429, 503, quota, or timeout),
 * it logs the diagnostic trail and immediately switches to the next model.
 */

import { FallbackAttemptLog, GeminiModelId } from '@/types';

export const GEMINI_FALLBACK_MODELS: GeminiModelId[] = [
  'gemini-3.8-flash',
  'gemini-3.5-pro',
  'gemini-3.0-pro',
  'gemini-2.5-flash',
  'gemini-2.0-pro',
  // High-availability safety anchors
  'gemini-flash-latest',
  'gemini-pro-latest',
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

/**
 * Normalizes audio MIME types for Gemini API inlineData
 */
export function normalizeAudioMimeType(mimeType: string, fileName?: string): string {
  const lowerMime = (mimeType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  if (lowerMime.includes('ogg') || lowerName.endsWith('.ogg')) {
    return 'audio/ogg';
  }
  if (lowerMime.includes('opus') || lowerName.endsWith('.opus')) {
    // Gemini handles opus via audio/ogg or audio/opus
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

  // Fallback to audio/ogg for WhatsApp audio notes
  return 'audio/ogg';
}

/**
 * Executes audio refinement with the 5-tier Gemini fallback architecture
 */
export async function processAudioWithGeminiFallback(
  audioBase64: string,
  rawMimeType: string,
  fileName?: string,
  customPrompt?: string
): Promise<FallbackExecutionResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      'مفتاح Gemini API Key غير مهيأ في متغيرات البيئة. يرجى إضافة GEMINI_API_KEY في ملف .env.local'
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

      // 7-second controller timeout per model attempt for fast fallback response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

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
            temperature: 0.2, // Low temperature for high accuracy transcription & text refinement
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
          // ignore json parse error
        }

        trail.push({
          model,
          success: false,
          statusCode: response.status,
          error: parsedMessage,
          durationMs: attemptDuration,
          timestamp: new Date().toISOString(),
        });

        console.warn(`[Gemini Fallback] Model ${model} failed (${response.status}): ${parsedMessage}. Trying next model...`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
        trail.push({
          model,
          success: false,
          error: 'استجاب الموديل بدون نص (Empty Content/Filter Triggered)',
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

  // If all models in the fallback chain were exhausted
  const lastError = trail[trail.length - 1]?.error || 'فشلت جميع موديلات Gemini البديلة في معالجة الملف الصوتي';
  const error = new Error(`تعذر معالجة الصوت: ${lastError}`);
  (error as unknown as { trail: FallbackAttemptLog[] }).trail = trail;
  throw error;
}
