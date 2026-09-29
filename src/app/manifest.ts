import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VoiceClear PWA - تحويل صوتيات الواتساب لنص منقح',
    short_name: 'VoiceClear',
    description: 'تطبيق لتحويل الرسائل الصوتية لنص عربي منقح بالذكاء الاصطناعي مع إزالة الحشو والتأتأة',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#10b981',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    // Web Share Target API: enables WhatsApp to share audio directly to VoiceClear
    share_target: {
      action: '/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        files: [
          {
            name: 'audio',
            accept: [
              'audio/*',
              '.opus',
              '.ogg',
              '.m4a',
              '.wav',
              '.mp3',
              '.aac',
              '.webm',
              'audio/ogg',
              'audio/opus',
              'audio/mp4',
              'audio/x-m4a',
              'audio/wav',
              'audio/mpeg',
              'application/ogg',
            ],
          },
        ],
      },
    },
  };
}
