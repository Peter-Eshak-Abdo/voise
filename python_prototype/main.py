import os
import subprocess
from google import genai

# pip install google-genai
# يجب التأكد من تثبيت أداة FFmpeg وإضافتها إلى مسار النظام (PATH)

os.environ["GEMINI_API_KEY"] = "GEMINI_API_KEY"
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def convert_audio_format(input_file, output_file="temp_converted.wav"):
    subprocess.run(
        ['ffmpeg', '-y', '-i', input_file, output_file],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True
    )
    return output_file

def process_whatsapp_voice_gemini(file_path):
    temp_wav = None
    uploaded_file = None
    try:
        print("جاري تحويل الملف الصوتي...")
        temp_wav = convert_audio_format(file_path)

        print("جاري رفع الملف إلى Gemini...")
        uploaded_file = client.files.upload(file=temp_wav)

        print("جاري معالجة الصوت واستخراج النص المنقح...")
        prompt_text = """
        استمع إلى هذه الرسالة الصوتية وقم بتفريغها إلى نص مكتوب بدقة.
        المطلوب:
        1. إزالة أي أصوات أو كلمات تدل على الكحة، التردد، أو التهتهة (مثل: آآ، امم، يعنى، إلخ).
        2. تصحيح الأخطاء اللغوية أو النطقية.
        3. إعادة صياغة الجمل المتقطعة لتكون مفهومة ومترابطة تماماً.
        4. إضافة علامات الترقيم المناسبة وتنسيق النص ليكون مرتب ومضبوط.
        5. الحفاظ على المعنى الأصلي وروح الرسالة كما هي.
        أريد النص النهائي فقط بدون أي مقدمات.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[uploaded_file, prompt_text]
        )

        return response.text.strip()

    except Exception as e:
        return f"حدث خطأ أثناء المعالجة: {str(e)}"

    finally:
        print("جاري تنظيف الملفات المؤقتة...")
        if temp_wav and os.path.exists(temp_wav):
            os.remove(temp_wav)
        if uploaded_file:
            client.files.delete(name=uploaded_file.name)

if __name__ == "__main__":
    # ضع مسار ملف الواتساب هنا
    whatsapp_audio_file = "voise.ogg"

    if os.path.exists(whatsapp_audio_file):
        final_result = process_whatsapp_voice_gemini(whatsapp_audio_file)

        print("\n" + "="*50)
        print("النص النهائي المنقح:")
        print("="*50)
        print(final_result)
        print("="*50)
    else:
        print("لم يتم العثور على الملف الصوتي، يرجى التأكد من المسار.")
