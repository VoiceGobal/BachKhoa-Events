import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export const geminiRouter = Router();

// Shared Gemini client utility
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// In-memory rate limiting map (IP -> timestamps)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 20;

function checkGeminiRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (validTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
}

// Fallback curated wishes generator in case of AI unavailability
const fallbackWishes = [
  {
    title: 'Chúc mừng ngày Phụ nữ Việt Nam 20/10',
    message:
      'Nhân ngày 20/10, chúc bạn luôn ngập tràn niềm vui, nụ cười rạng ngời và đón nhận thật nhiều tình yêu thương ấm áp từ cuộc sống. Bạn luôn là đóa hoa ngát hương mang lại nguồn cảm hứng tuyệt vời cho mọi người xung quanh!',
  },
  {
    title: 'Gửi trọn yêu thương ngày 20 tháng 10',
    message:
      'Chúc người phụ nữ tuyệt vời ngày 20/10 thân tâm an lạc, vạn sự hanh thông, công việc thuận lợi và mỗi ngày đều tìm thấy những lý do ngọt ngào để mỉm cười an nhiên!',
  },
  {
    title: 'Rạng rỡ và tỏa sáng theo cách riêng',
    message:
      'Chúc bạn ngày 20/10 nhận được nhiều hoa tươi và những lời chúc tốt đẹp nhất. Hãy luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên hành trình của chính mình!',
  },
];

// POST /api/gemini/generate-wish
geminiRouter.post('/generate-wish', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  if (!checkGeminiRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Quá nhiều yêu cầu tạo lời chúc. Vui lòng thử lại sau giây lát.',
      isAiGenerated: false,
      message: fallbackWishes[0].message,
      title: fallbackWishes[0].title,
      modelNote: 'Đã chọn từ kho lời chúc mẫu do bạn thao tác quá nhanh.',
    });
  }

  const {
    recipientName = '',
    ageGroup = '26-35',
    profession = '',
    relationship = 'Mẹ',
    pronoun = '',
    tone = 'refined',
    length = 'medium',
    theme = 'happiness',
    holiday = '20-10',
  } = req.body;

  const safeName = String(recipientName).slice(0, 50).trim();
  const safeProfession = String(profession).slice(0, 50).trim();
  const safeRelationship = String(relationship).slice(0, 50).trim();
  const safePronoun = String(pronoun).slice(0, 40).trim();
  const safeTone = String(tone).slice(0, 30);
  const safeLength = String(length).slice(0, 20);
  const safeTheme = String(theme).slice(0, 30);
  const safeHoliday = String(holiday).slice(0, 20);

  const holidayTitles: Record<string, string> = {
    '20-10': 'ngày Phụ Nữ Việt Nam 20/10',
    '20-11': 'ngày Nhà Giáo Việt Nam 20/11 (Tri ân Thầy Cô)',
    '08-03': 'ngày Quốc Tế Phụ Nữ 8/3',
    'tet': 'Tết Nguyên Đán & Mừng Xuân',
    'valentine': 'ngày Lễ Tình Nhân 14/2',
  };
  const holidayName = holidayTitles[safeHoliday] || 'ngày lễ đặc biệt';

  // Length instructions in Vietnamese
  const lengthInstruction =
    safeLength === 'short'
      ? 'Ngắn gọn, súc tích (1-2 câu, khoảng 30-45 từ), dễ gửi qua SMS/tin nhắn.'
      : safeLength === 'long'
      ? 'Đầy đặn, sâu sắc, giàu cảm xúc và hình ảnh (khoảng 80-120 từ), thích hợp viết thiệp tay.'
      : 'Vừa phải, cân đối, ấm áp (khoảng 50-70 từ).';

  if (!aiClient) {
    const fallback = fallbackWishes[Math.floor(Math.random() * fallbackWishes.length)];
    let msg = fallback.message;
    if (safeName) {
      msg = `Gửi ${safeName}! ${msg}`;
    }
    return res.json({
      title: `${fallback.title} (${holidayName})`,
      message: msg,
      tone: safeTone,
      recipientType: safeRelationship,
      isAiGenerated: false,
      modelNote: `Đã chọn từ kho lời chúc tuyển chọn cho ${holidayName}.`,
    });
  }

  try {
    const systemPrompt = `Bạn là chuyên gia ngôn ngữ văn hóa Việt Nam chuyên viết lời chúc mừng cho các dịp lễ truyền thống và sự kiện lớn: ${holidayName}.
Nhiệm vụ: Viết một lời chúc cho dịp "${holidayName}" chân thành, tinh tế, giàu cảm xúc, đúng chuẩn mực văn hóa và tự nhiên bằng tiếng Việt có dấu.
QUY TẮC QUAN TRỌNG:
1. Dịp lễ: ${holidayName}.
2. Người nhận: "${safeName || 'người nhận'}", mối quan hệ: ${safeRelationship}. ${safePronoun ? `Cách xưng hô: "${safePronoun}".` : ''}
3. Phong cách: ${safeTone}.
4. Độ dài: ${lengthInstruction}
5. Chủ đề mong muốn: ${safeTheme}. ${safeProfession ? `Nghề nghiệp: ${safeProfession}.` : ''}
6. Nếu là dịp 20/11: Tri ân công ơn Thầy Cô giáo, người lái đò thầm lặng, bục giảng phấn trắng.
7. Nếu là dịp Tết: Chúc an khang thịnh vượng, tài lộc dồi dào, vạn sự như ý, gia đạo bình an.
8. Văn phong tự nhiên, không sáo rỗng, ấm áp và trang trọng.`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out')), 25000)
    );

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const generatePromise = aiClient.models.generateContent({
      model: modelName,
      contents: `Hãy tạo một lời chúc ý nghĩa cho dịp ${holidayName} theo yêu cầu.`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tiêu đề ngắn gọn cho lời chúc' },
            message: { type: Type.STRING, description: 'Nội dung lời chúc hoàn chỉnh' },
            tone: { type: Type.STRING, description: 'Phong cách lời chúc' },
            recipientType: { type: Type.STRING, description: 'Mối quan hệ người nhận' },
          },
          required: ['title', 'message'],
        },
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const text = response.text;
    if (!text) throw new Error('Empty response');

    const parsed = JSON.parse(text);
    return res.json({
      title: parsed.title || `Lời chúc ${holidayName}`,
      message: parsed.message,
      tone: parsed.tone || safeTone,
      recipientType: parsed.recipientType || safeRelationship,
      isAiGenerated: true,
    });
  } catch (err: unknown) {
    console.error('Gemini call error:', err);
    const fallback = fallbackWishes[Math.floor(Math.random() * fallbackWishes.length)];
    let msg = fallback.message;
    if (safeName) msg = `Gửi ${safeName}! ${msg}`;
    return res.json({
      title: fallback.title,
      message: msg,
      tone: safeTone,
      recipientType: safeRelationship,
      isAiGenerated: false,
      modelNote: 'Đã tự động chọn từ kho lời chúc tuyển chọn.',
    });
  }
});
