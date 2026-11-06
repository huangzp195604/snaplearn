import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Server-side Gemini AI Client (retrieved dynamically to respect runtime secrets or user provided client key)
function getAIClient(clientApiKey?: string) {
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ============ 国内多模态模型适配层（OpenAI 兼容格式） ============
// 支持智谱 GLM-4V / 阿里 Qwen-VL / 硅基流动 等任何 OpenAI 兼容的视觉模型
// 通过 .env 中 VISION_API_KEY / VISION_API_BASE / VISION_MODEL 配置
// 内置模型备胎链：一个模型限流(429)自动尝试下一个
// glm-4.5v 的空间定位（bbox）精度明显优于 flash 系列，放在首位
const VISION_MODEL_CHAIN = [
  'glm-4.5v',
  ...(process.env.VISION_MODEL ? [process.env.VISION_MODEL] : []),
  'glm-4.6v-flash',
  'glm-4.1v-thinking-flash',
  'glm-4v-plus',
  'glm-4v-flash',
];

async function callVisionAPIOnce(
  apiKey: string,
  baseUrl: string,
  model: string,
  imageBase64: string,
  mimeType: string,
  promptText: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: 'text', text: promptText },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: maxTokensFor(model),
      // 关闭深度思考：海报生成追求速度，82s -> 大幅缩短
      thinking: { type: 'disabled' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`视觉模型 API 返回 ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data: any = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`视觉模型未返回内容: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return content;
}

// 带备胎链的视觉模型调用：遍历候选模型，限流/输出截断/失败自动降级到下一个
async function callVisionRaw(
  promptText: string,
  imageBase64: string,
  mimeType: string
): Promise<{ content: string; model: string }> {
  const apiKey = process.env.VISION_API_KEY as string;
  const baseUrl = (process.env.VISION_API_BASE || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '');

  // 去重备胎链
  const models = [...new Set(VISION_MODEL_CHAIN)];
  const errors: string[] = [];

  for (const model of models) {
    try {
      const content = await callVisionAPIOnce(apiKey, baseUrl, model, imageBase64, mimeType, promptText);
      return { content, model };
    } catch (err: any) {
      errors.push(`${model}: ${err.message}`);
      console.warn(`[SnapLearn] 视觉模型 ${model} 失败，尝试下一个 ->`, err.message?.slice(0, 120));
    }
  }

  throw new Error(`所有视觉模型均失败: ${errors.join(' | ').slice(0, 400)}`);
}

// 从模型返回中稳健地提取 JSON（兼容 markdown 代码块包裹、字符串内裸控制字符的情况）
function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('模型未返回有效 JSON');
  }
  let jsonStr = raw.slice(start, end + 1);
  // 模型偶尔会在 JSON 字符串值里输出裸换行/制表符，JSON.parse 会报
  // "Bad control character"，这里统一替换成空格再解析
  jsonStr = jsonStr.replace(/[\u0000-\u001F]+/g, ' ');
  // 视觉模型经常把 bbox 写坏：{"x":176,54,270,442} 或 {"x":177,"54,"w":158,"h":416}
  jsonStr = repairBboxObjects(jsonStr);
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(jsonStr);
}

/** 修复被模型写坏的 bbox 对象：允许键丢失、数字被误加引号、裸数字按 x/y/w/h 顺序补齐 */
function repairBboxObjects(text: string): string {
  return text.replace(/((?:"bbox"|"subjectBBox")\s*:\s*)\{([^{}]*)\}/g, (_m, prefix, body: string) => {
    const cleaned = body.replace(/"\s*(-?\d+(?:\.\d+)?)\s*"/g, '$1');
    const vals: Record<string, number> = {};
    const rest = cleaned.replace(/([xywh])\s*:\s*(-?\d+(?:\.\d+)?)/g, (_m2, k: string, v: string) => {
      vals[k] = Number(v);
      return ' ';
    });
    const nums = (rest.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    for (const k of ['x', 'y', 'w', 'h']) {
      if (vals[k] === undefined && nums.length) vals[k] = nums.shift() as number;
    }
    const fixed = { x: vals.x ?? 0, y: vals.y ?? 0, w: vals.w ?? 0, h: vals.h ?? 0 };
    return `${prefix}${JSON.stringify(fixed)}`;
  });
}

// 各模型的 max_tokens 上限不同，超了直接 400
function maxTokensFor(model: string): number {
  if (model.includes('glm-4v-plus')) return 2048;
  if (model.includes('glm-4v-flash') && !model.includes('thinking') && !model.includes('4.6') && !model.includes('4.1')) return 1024;
  return 8192;
}

// ============ 独立「视觉定位」阶段 ============
// 大而全的 JSON 生成会让模型把注意力放在文案上，坐标只能是"大概齐"。
// 这里拆成一次只做定位的调用，输出格式极简，坐标精度显著提升。
const GROUNDING_PROMPT = (userPrompt = '') => `
你是视觉定位专家。请在这张用户上传的真实生活照片中，定位 4-6 个最适合教学标注的独立物体（必须是具体可辨识的单一物体，不要泛称变体，两个物体的包围盒不要重叠）。
坐标使用 0-1000 归一化：左上角 (0,0)，右下角 (1000,1000)；x/y 是包围盒左上角，w/h 是宽高。
先在心里判断物体在画面中的实际位置，再给出刚好包住它的紧密包围盒（只覆盖物体可见像素，不要包含背景或相邻物体）。
严格按下面格式逐行输出，每行一个物体，不要输出 JSON、不要输出任何解释文字：
english | chinese | phonetic | x y w h
第一列 english 必须是**纯英文**（只允许 a-z A-Z 空格和连字符，绝不允许出现中文字符），第二列 chinese 必须是简体中文，第三列 phonetic 是 IPA 音标（可留空）。
示例：
chimney | 烟囱 | /ˈtʃɪmni/ | 176 54 270 442
front wheel | 前轮 |  | 102 662 343 332
${userPrompt ? `用户补充要求：${userPrompt}` : ''}
`;

function clampNum(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** 解析定位模型的输出（兼容逐行竖线格式与 JSON），并统一换算成百分比坐标 */
function parseGroundingText(text: string): Array<{
  english: string;
  chinese: string;
  phonetic: string;
  box: { x: number; y: number; w: number; h: number };
}> {
  const raw: Array<{ english: string; chinese: string; phonetic: string; box: any }> = [];

  // 1) 万一模型还是输出了 JSON
  try {
    const json = extractJson(text);
    const arr = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
    arr.forEach((it: any) =>
      raw.push({
        english: it.english,
        chinese: it.chinese,
        phonetic: it.phonetic,
        box: it.bbox || it,
      })
    );
  } catch {
    /* 不是 JSON，走逐行解析 */
  }

  // 2) 逐行竖线格式
  if (!raw.length) {
    for (const line of text.split(/\r?\n/)) {
      if (!line.includes('|')) continue;
      const parts = line
        .replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, '')
        .split('|')
        .map((s) => s.trim());
      if (parts.length < 3) continue;
      const nums = (parts[parts.length - 1].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      if (nums.length < 4) continue;
      raw.push({
        english: parts[0],
        chinese: parts[1],
        phonetic: parts[2],
        box: { x: nums[0], y: nums[1], w: nums[2], h: nums[3] },
      });
    }
  }

  if (!raw.length) return [];

  // 全局判定坐标尺度：0-1000 归一化 / 0-100 百分比 / 0-1
  let maxV = 0;
  raw.forEach((r) => {
    ['x', 'y', 'w', 'h'].forEach((k) => {
      const n = Number(r.box?.[k]);
      if (Number.isFinite(n)) maxV = Math.max(maxV, n);
    });
  });
  const scale = maxV > 105 ? 0.1 : maxV > 1.5 ? 1 : 100;

  const out: Array<{ english: string; chinese: string; phonetic: string; box: { x: number; y: number; w: number; h: number } }> = [];
  for (const r of raw) {
    const b = r.box;
    if (!b || !['x', 'y', 'w', 'h'].every((k) => Number.isFinite(Number(b[k])))) continue;
    let x = Number(b.x) * scale;
    let y = Number(b.y) * scale;
    let w = Number(b.w) * scale;
    let h = Number(b.h) * scale;
    if (w < 0) {
      x += w;
      w = -w;
    }
    if (h < 0) {
      y += h;
      h = -h;
    }
    x = clampNum(x, 0, 98);
    y = clampNum(y, 0, 98);
    w = clampNum(w, 2, 100 - x);
    h = clampNum(h, 2, 100 - y);
    const english = String(r.english || '').trim();
    if (!english) continue;
    out.push({
      english,
      chinese: String(r.chinese || '').trim(),
      phonetic: String(r.phonetic || '').trim(),
      box: { x, y, w, h },
    });
  }
  return out;
}

/** 由包围盒位置自动决定标签伸出方向，避免标签互相压在一起 */
function pickLabelSide(box: { x: number; y: number; w: number; h: number }): string {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  if (cy < 36) return 'bottom';
  if (cy > 64) return 'top';
  return cx < 50 ? 'left' : 'right';
}

// Response schema for structured card generation
const cardAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: 'Catchy, emotional or aesthetic handwritten-style English title for the scene (e.g., "a plate to Start the day", "a quiet afternoon latte")',
    },
    headlineChinese: {
      type: Type.STRING,
      description: 'Chinese translation of the headline title (e.g., "开启美好一天的一盘早餐")',
    },
    sceneCategory: {
      type: Type.STRING,
      description: 'Category: food, coffee, pet, street, supermarket, outfit, study, or other',
    },
    floatingPhrases: {
      type: Type.ARRAY,
      description: '3-4 inspiring natural spoken phrases / idioms connected to this scene',
      items: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING },
          chinese: { type: Type.STRING },
        },
        required: ['english', 'chinese'],
      },
    },
    detectedItems: {
      type: Type.ARRAY,
      description: 'Key visible objects in the photo with leader-line pin coordinates. Range: 4 to 8 objects.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          english: { type: Type.STRING, description: 'Single noun or short item name (e.g. banana, toast, bacon, salad)' },
          chinese: { type: Type.STRING, description: 'Accurate everyday Chinese translation' },
          phonetic: { type: Type.STRING, description: 'IPA phonetic representation, e.g. /bəˈnænə/' },
          x: { type: Type.NUMBER, description: 'Horizontal center percentage of the object bbox (0 to 100), relative to the FULL original photo' },
          y: { type: Type.NUMBER, description: 'Vertical center percentage of the object bbox (0 to 100), relative to the FULL original photo' },
          bbox: {
            type: Type.OBJECT,
            description: 'Tight bounding box around the object itself, percentage coordinates of the FULL original photo',
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              w: { type: Type.NUMBER },
              h: { type: Type.NUMBER },
            },
            required: ['x', 'y', 'w', 'h'],
          },
          labelSide: {
            type: Type.STRING,
            description: 'Best quadrant for the leader line and text: top-left, top-right, bottom-left, bottom-right, left, right, top, or bottom',
          },
          curvature: { type: Type.NUMBER, description: 'Leader line curvature offset between -40 and 40' },
        },
        required: ['id', 'english', 'chinese', 'phonetic', 'x', 'y', 'bbox', 'labelSide'],
      },
    },
    keyVocabulary: {
      type: Type.ARRAY,
      description: '8 to 10 essential vocabulary words related to the scene (including labeled items + attributes)',
      items: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING },
          chinese: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING, description: 'e.g., n., v., adj.' },
        },
        required: ['english', 'chinese', 'phonetic', 'partOfSpeech'],
      },
    },
    naturalPhrases: {
      type: Type.ARRAY,
      description: '6 to 8 idiomatic collocations and phrases for daily communication',
      items: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING },
          chinese: { type: Type.STRING },
        },
        required: ['english', 'chinese'],
      },
    },
    usefulPatterns: {
      type: Type.ARRAY,
      description: '5 to 7 high-frequency sentence templates with blanks or examples',
      items: {
        type: Type.OBJECT,
        properties: {
          pattern: { type: Type.STRING, description: 'e.g. This is a plate of ... / It includes ...' },
          meaning: { type: Type.STRING, description: 'Chinese meaning' },
          example: { type: Type.STRING, description: 'Concrete example sentence from this photo' },
        },
        required: ['pattern', 'meaning', 'example'],
      },
    },
    sceneDescription: {
      type: Type.OBJECT,
      description: 'Contextual paragraph describing the photo, strictly 45-65 English words',
      properties: {
        english: { type: Type.STRING, description: 'Natural English paragraph (45-65 words)' },
        chinese: { type: Type.STRING, description: 'Fluid Chinese translation' },
        wordCount: { type: Type.INTEGER },
      },
      required: ['english', 'chinese', 'wordCount'],
    },
    prompts: {
      type: Type.ARRAY,
      description: '3 speaking and writing interactive prompts/questions based on this card',
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          questionEn: { type: Type.STRING },
          questionZh: { type: Type.STRING },
          hint: { type: Type.STRING },
        },
        required: ['index', 'questionEn', 'questionZh'],
      },
    },
    studyTip: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        tipEn: { type: Type.STRING },
        tipZh: { type: Type.STRING },
      },
      required: ['title', 'tipEn', 'tipZh'],
    },
  },
  required: [
    'headline',
    'headlineChinese',
    'sceneCategory',
    'floatingPhrases',
    'detectedItems',
    'keyVocabulary',
    'naturalPhrases',
    'usefulPatterns',
    'sceneDescription',
    'prompts',
    'studyTip',
  ],
};

// Smart fallback card generator when GEMINI_API_KEY is not yet configured or on error
function generateFallbackCardForPhoto(userPrompt = '') {
  return {
    headline: 'a hearty Sandwich & Warm Soup',
    headlineChinese: '金黄三明治与暖胃丸子汤',
    sceneCategory: 'food',
    floatingPhrases: [
      { english: 'warm and hearty', chinese: '温暖又治愈的饱腹感' },
      { english: 'a bite of comfort', chinese: '一口治愈身心' },
      { english: 'crispy on the outside', chinese: '外皮金黄酥脆' },
      { english: 'comfort food bliss', chinese: '家常暖胃的幸福感' },
    ],
    detectedItems: [
      { id: 'item-sw-1', english: 'toasted sandwich', chinese: '煎吐司三明治', phonetic: '/ˈtəʊstɪd ˈsænwɪtʃ/', x: 48, y: 28, labelSide: 'top-right', curvature: 15 },
      { id: 'item-sw-2', english: 'beef meatball soup', chinese: '牛肉丸清汤', phonetic: '/biːf ˈmiːtbɔːl suːp/', x: 38, y: 76, labelSide: 'bottom-left', curvature: -20 },
      { id: 'item-sw-3', english: 'crispy bacon', chinese: '酥脆培根', phonetic: '/ˈkrɪspi ˈbeɪkən/', x: 44, y: 44, labelSide: 'left', curvature: -15 },
      { id: 'item-sw-4', english: 'fresh lettuce', chinese: '新鲜脆生菜', phonetic: '/freʃ ˈletɪs/', x: 34, y: 35, labelSide: 'top-left', curvature: -10 },
      { id: 'item-sw-5', english: 'steamed rice', chinese: '白米饭 / 饭团', phonetic: '/stiːmd raɪs/', x: 23, y: 45, labelSide: 'bottom-left', curvature: -15 },
      { id: 'item-sw-6', english: 'gingham tablecloth', chinese: '蓝白方格桌布', phonetic: '/ˈɡɪŋəm ˈteɪblklɒθ/', x: 68, y: 65, labelSide: 'bottom-right', curvature: 20 },
    ],
    keyVocabulary: [
      { english: 'sandwich', chinese: '三明治', phonetic: '/ˈsænwɪtʃ/', partOfSpeech: 'n.' },
      { english: 'meatball', chinese: '肉丸', phonetic: '/ˈmiːtbɔːl/', partOfSpeech: 'n.' },
      { english: 'broth', chinese: '高汤/清汤', phonetic: '/brɒθ/', partOfSpeech: 'n.' },
      { english: 'bacon', chinese: '培根', phonetic: '/ˈbeɪkən/', partOfSpeech: 'n.' },
      { english: 'lettuce', chinese: '生菜', phonetic: '/ˈletɪs/', partOfSpeech: 'n.' },
      { english: 'steamed rice', chinese: '白米饭', phonetic: '/stiːmd raɪs/', partOfSpeech: 'n.' },
      { english: 'comfort food', chinese: '治愈系美食', phonetic: '/ˈkʌmfət fuːd/', partOfSpeech: 'n.' },
      { english: 'hearty', chinese: '丰盛饱腹的', phonetic: '/ˈhɑːti/', partOfSpeech: 'adj.' },
      { english: 'savory', chinese: '咸香诱人的', phonetic: '/ˈseɪvəri/', partOfSpeech: 'adj.' },
      { english: 'crispy', chinese: '酥脆的', phonetic: '/ˈkrɪspi/', partOfSpeech: 'adj.' },
    ],
    naturalPhrases: [
      { english: 'warm and hearty', chinese: '温暖又治愈的饱腹感' },
      { english: 'a bite of comfort', chinese: '一口治愈身心' },
      { english: 'crispy on the outside', chinese: '外皮金黄酥脆' },
      { english: 'comfort food bliss', chinese: '家常暖胃的幸福感' },
      { english: 'piping-hot soup', chinese: '热气腾腾的汤' },
      { english: 'packed with flavor', chinese: '风味十足' },
    ],
    usefulPatterns: [
      { pattern: 'There is nothing more comforting than a hot bowl of ...', meaning: '没有什么比一碗热腾腾的……更治愈人的了', example: 'There is nothing more comforting than a hot bowl of beef meatball soup.' },
      { pattern: 'The sandwich is filled with ...', meaning: '三明治里夹着……', example: 'The toasted sandwich is filled with crispy bacon and fresh greens.' },
      { pattern: 'It pairs perfectly with ...', meaning: '它与……简直是绝配', example: 'A hot savory broth pairs perfectly with crunchy golden toast.' },
      { pattern: 'It looks so appetizing on ...', meaning: '摆在……上看起来格外诱人', example: 'It looks so appetizing on the blue gingham tablecloth.' },
    ],
    sceneDescription: {
      english: 'This satisfying meal features a golden toasted sandwich filled with savory bacon and fresh lettuce, paired with a piping-hot bowl of homemade beef meatball soup. A small portion of steamed rice sits on the floral plate, laid out on a cozy blue gingham tablecloth. It is pure comfort food that warms both the body and soul.',
      chinese: '这顿令人满足的餐食包含一份金黄煎吐司三明治，夹着咸香酥脆的培根和新鲜生菜，旁边搭配着一碗热气腾腾的自制牛肉丸清汤。碎花盘里还有一小份白米饭，摆在温馨的蓝白格子桌布上。这是温暖身心的纯粹治愈系美食。',
      wordCount: 57,
    },
    prompts: [
      { index: 1, questionEn: 'Which one would you try first: the crispy sandwich or the hot meatball soup? Why?', questionZh: '酥脆的三明治和热腾腾的肉丸汤，你会先尝哪一个？为什么？' },
      { index: 2, questionEn: 'What is your favorite comfort food when you are tired or hungry?', questionZh: '当你感到疲惫或饥饿时，你最喜欢的治愈系美食是什么？' },
      { index: 3, questionEn: 'Describe the texture of this meal using words like "crispy" and "savory".', questionZh: '用 crispy（酥脆）和 savory（咸香）描述这餐饭的口感层次。' },
    ],
    studyTip: {
      title: 'Study Tip 美食感官表达法',
      tipEn: 'Describe food with two contrasting textures (e.g. crispy bread vs warm savory broth) to make English speakings vivid.',
      tipZh: '用两组对比口感（如酥脆的面包 vs 咸香温热的汤汁）来描述美食，会让英文口语表达极其生动传神。',
    },
  };
}

// API Route: Analyze Image & Generate Card Data
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', userPrompt = '', customApiKey } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '请提供图片数据 (imageBase64 is required)' });
    }

    // Safely extract raw Base64 string
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const ai = getAIClient(customApiKey);

    const promptText = `
你是一个专业的“拍照场景化英语教学专家”及视觉设计策划师。
用户上传了一张日常生活照片（如美食餐盘、咖啡、超市货架、穿搭或宠物）。
你的任务：
1. 识别图片中最核心、最具辨识度的 4-6 个物品（宁少勿滥，每个物品必须是独特的具体对象）。
   严格规则：
   - 禁止输出同一类物品的多个泛称变体（如 pink flower / yellow flower / white flower 都算泛称泛标，改用具体名称如 poppy 虞美人、daisy 雏菊；如果无法区分具体品种，只保留 1 个最具代表性的）
   - 禁止两个物品的标注点落在重叠区域（物体间距过近时只标注其中一个）
   - 每个物品必须给出 bbox（物体本身的紧密包围盒，w/h 只覆盖该物体的可见像素，不能把背景或相邻物品框进去）
   - x/y 必须等于该 bbox 的几何中心，且中心点必须落在物体可见像素上；宁可框小一点，也不要把箭头指到桌面/墙面/背景
   - 所有坐标（含 bbox、subjectBBox）一律使用相对**整张上传原图**的百分比：左上角为 (0,0)，右下角为 (100,100)，不要相对任何裁切区域
   - labelSide 尽量互相分散、指向离物体最近的空白边缘，避免标签文字相互遮挡
   - 同时给出主体包围盒 subjectBBox（画面中主体/视觉焦点所在的矩形区域，百分比坐标）
   - 给出最适合引线伸出的方向 (labelSide: 'top-left'|'top-right'|'bottom-left'|'bottom-right'|'left'|'right'|'top'|'bottom')。
2. 翻译与标注：
   - 提取精准的地道英文单词（非机械死板的直译，遵循英语母语者的日常称呼）。
   - 提供标准国际音标 (IPA) 和精准简洁的中文释义。
3. 场景化英语教学拓展（严格参考经典生活海报卡片排版结构）：
   - Headline: 文艺、生动、富有生活质感的标题（如 "a plate to Start the day"）与中文翻译。
   - Floating Phrases: 3-4 个充满生活气息的短语或口语习惯表达（如 "start the day right", "set me up for the day", "keep me going"）。
   - 01 Key Vocabulary: 8-10 个核心词汇（含物名及形容词，如 healthy, energy, balanced, delicious）。
   - 02 Natural Phrases: 6-8 个场景短语。
   - 03 Useful Sentence Patterns: 5-7 个实用句型模板（如 "This is a plate of...", "It includes...", "It helps me..."）。
   - 04 Scene Description: 45-65 个单词的高水准地道英语小短文，串联上述词汇，附中文。
   - 05 Speaking & Writing Prompts: 3 个口语/写作提问，引导学习者开口或造句。
   - Study Tip: 1 条实用的日常英语记忆锦囊。
4. 视觉风格决策（posterStyle）：根据照片的色调、光线、内容氛围，从以下 6 个主题中选出最匹配的一个：
   - "warm-cream"：暖奶油风，适合美食、咖啡、烘焙、brunch 等温暖明亮场景
   - "fresh-green"：清新绿，适合沙拉、健康餐、超市生鲜、果蔬等自然清新场景
   - "cool-street"：街拍冷调，适合穿搭、街景、夜景、潮酷等冷色场景
   - "soft-pastel"：治愈粉彩，适合宠物、花束、甜品等软萌治愈场景
   - "paper-kraft"：牛皮纸手账风，适合书桌、文具、笔记、书店等学习场景
   - "chalkboard-dark"：经典黑板风，适合暗调背景、高级餐厅、深夜食堂等深色场景
   同时挑选 3-4 个与画面内容相关的 emoji 作为海报装饰贴纸（motifs）。
${userPrompt ? `用户特别补充要求: ${userPrompt}` : ''}
严格输出符合以下结构的 JSON（不要输出 JSON 以外的任何文字）：
{
  "headline": "英文标题",
  "headlineChinese": "中文标题",
  "sceneCategory": "food|coffee|pet|street|supermarket|outfit|study|other",
  "posterStyle": { "theme": "warm-cream|fresh-green|cool-street|soft-pastel|paper-kraft|chalkboard-dark", "motifs": ["🍅", "🥗", "🍞"], "moodNote": "一句话说明选择该风格的理由" },
  "subjectBBox": { "x": 20, "y": 15, "w": 60, "h": 70 },
  "floatingPhrases": [{ "english": "...", "chinese": "..." }],
  "detectedItems": [{ "id": "item-1", "english": "banana", "chinese": "香蕉", "phonetic": "/bəˈnænə/", "bbox": { "x": 25, "y": 34, "w": 10, "h": 12 }, "x": 30, "y": 40, "labelSide": "top-left", "curvature": 10 }],
  "keyVocabulary": [{ "english": "...", "chinese": "...", "phonetic": "/.../", "partOfSpeech": "n." }],
  "naturalPhrases": [{ "english": "...", "chinese": "..." }],
  "usefulPatterns": [{ "pattern": "...", "meaning": "...", "example": "..." }],
  "sceneDescription": { "english": "45-65词短文", "chinese": "中文翻译", "wordCount": 55 },
  "prompts": [{ "index": 1, "questionEn": "...", "questionZh": "...", "hint": "..." }],
  "studyTip": { "title": "...", "tipEn": "...", "tipZh": "..." }
}
`;

    // Ensure valid mime type for Gemini
    const safeMimeType = mimeType.includes('png')
      ? 'image/png'
      : mimeType.includes('webp')
      ? 'image/webp'
      : 'image/jpeg';

    // If no Gemini key, try domestic vision model first (OpenAI-compatible)
    if (!ai) {
      const visionKey = process.env.VISION_API_KEY;
      if (visionKey && visionKey !== 'MY_VISION_API_KEY') {
        console.log('[SnapLearn Server] GEMINI_API_KEY not present, trying vision model chain...');
        try {
          // 文案与定位并行：定位单独走一次精简输出，坐标精度远高于"一次生成全部 JSON"
          const [contentRes, groundingRes] = await Promise.allSettled([
            callVisionRaw(promptText, cleanBase64, safeMimeType),
            callVisionRaw(GROUNDING_PROMPT(userPrompt), cleanBase64, safeMimeType),
          ]);

          if (contentRes.status === 'rejected') throw contentRes.reason;

          const cardData = extractJson(contentRes.value.content);
          let model = contentRes.value.model;

          if (groundingRes.status === 'fulfilled') {
            const grounded = parseGroundingText(groundingRes.value.content);
            if (grounded.length >= 2) {
              const contentItems: any[] = Array.isArray(cardData.detectedItems) ? cardData.detectedItems : [];
              const keyVocab: any[] = Array.isArray(cardData.keyVocabulary) ? cardData.keyVocabulary : [];
              const hasCjk = /[\u4e00-\u9fff]/;
              // 文案模型可能用不同中文描述同一物体（如"调速器" vs "控制器"），用模糊匹配 + 最近位置找回英文/音标
              const buildCandidates = () => {
                const arr: Array<{ english: string; chinese: string; phonetic: string; x: number; y: number }> = [];
                contentItems.forEach((ci) => {
                  arr.push({
                    english: String(ci.english || '').trim(),
                    chinese: String(ci.chinese || '').trim(),
                    phonetic: String(ci.phonetic || '').trim(),
                    x: Number(ci.x) || 50,
                    y: Number(ci.y) || 50,
                  });
                });
                keyVocab.forEach((v) => {
                  arr.push({
                    english: String(v.english || '').trim(),
                    chinese: String(v.chinese || '').trim(),
                    phonetic: String(v.phonetic || '').trim(),
                    x: 50,
                    y: 50,
                  });
                });
                return arr.filter((c) => c.english);
              };
              const candidates = buildCandidates();
              const cjkChars = (s: string) => (s.match(/[\u4e00-\u9fff]/g) || []);
              const matchLabel = (it: { english: string; chinese: string; box: { x: number; y: number; w: number; h: number } }) => {
                const gx = it.box.x + it.box.w / 2;
                const gy = it.box.y + it.box.h / 2;
                const gCjk = cjkChars(it.chinese).join('');
                let best: any = null;
                let bestScore = 0;
                for (const c of candidates) {
                  const cCjk = cjkChars(c.chinese).join('');
                  let score = 0;
                  if (cCjk && gCjk) {
                    if (cCjk === gCjk) score = 100;
                    else if (gCjk.includes(cCjk) || cCjk.includes(gCjk)) score = 70;
                    else {
                      const common = new Set([...gCjk].filter((ch) => cCjk.includes(ch))).size;
                      const total = new Set([...gCjk, ...cCjk]).size || 1;
                      score = 40 * (common / total);
                    }
                  }
                  // 位置距离加成（文案坐标不准，但仍可作弱信号）
                  const dist = Math.hypot(c.x - gx, c.y - gy);
                  score += Math.max(0, 25 - dist * 0.25);
                  if (score > bestScore) {
                    bestScore = score;
                    best = c;
                  }
                }
                return best;
              };
              cardData.detectedItems = grounded.map((it, i) => {
                let english = it.english;
                let phonetic = it.phonetic;
                if (hasCjk.test(english)) {
                  const match = matchLabel(it);
                  if (match && !hasCjk.test(match.english)) {
                    english = match.english;
                    phonetic = match.phonetic || phonetic;
                  }
                }
                return {
                  id: `item-${i + 1}`,
                  english,
                  chinese: it.chinese,
                  phonetic,
                  x: it.box.x + it.box.w / 2,
                  y: it.box.y + it.box.h / 2,
                  bbox: it.box,
                  labelSide: pickLabelSide(it.box),
                  curvature: 0,
                };
              });
              const ux = Math.min(...grounded.map((g) => g.box.x));
              const uy = Math.min(...grounded.map((g) => g.box.y));
              const ur = Math.max(...grounded.map((g) => g.box.x + g.box.w));
              const ub = Math.max(...grounded.map((g) => g.box.y + g.box.h));
              cardData.subjectBBox = { x: ux, y: uy, w: ur - ux, h: ub - uy };
              model = `${contentRes.value.model} + ${groundingRes.value.model}(grounding)`;
              console.log(`[SnapLearn Server] Grounding OK: ${grounded.length} items`);
            }
          } else {
            console.warn(
              '[SnapLearn] 定位阶段失败，回退使用文案阶段坐标:',
              (groundingRes.reason as any)?.message?.slice(0, 120)
            );
          }

          console.log(`[SnapLearn Server] Card generated by model: ${model}`);
          return res.json({ success: true, card: cardData, provider: model });
        } catch (visionErr: any) {
          console.error('Vision model failed:', visionErr.message);
          // 视觉模型失败时降级到演示卡片，并把原因带给前端
          const fallbackCard = generateFallbackCardForPhoto(userPrompt);
          return res.json({
            success: true,
            card: fallbackCard,
            isDemo: true,
            notice: `视觉模型调用失败（${visionErr.message.slice(0, 120)}），已降级为演示卡片。`,
          });
        }
      }

      // Nothing configured at all -> offline intelligent demo card
      console.log('[SnapLearn Server] No API key configured, using adaptive demo generator');
      const fallbackCard = generateFallbackCardForPhoto(userPrompt);
      return res.json({
        success: true,
        card: fallbackCard,
        isDemo: true,
        notice: '当前未配置有效 API Key，已自动启动本地多模态演示引擎生成卡片。可在 .env 中配置 VISION_API_KEY。',
      });
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMimeType,
                data: cleanBase64,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: cardAnalysisSchema,
        },
      });
    } catch (modelErr: any) {
      console.warn('Primary model failed, trying fallback model gemini-flash-latest:', modelErr.message);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMimeType,
                data: cleanBase64,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: cardAnalysisSchema,
        },
      });
    }

    const text = response.text;
    if (!text) {
      throw new Error('模型未返回有效文本');
    }

    const cardData = JSON.parse(text);
    return res.json({ success: true, card: cardData });
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error('Error analyzing image with Gemini:', errorMsg);
    
    // Return explicit error details to the frontend
    return res.status(400).json({
      success: false,
      error: `Gemini API 调用失败: ${errorMsg}。请检查 API Key 是否有效或网络连接。`,
    });
  }
});

// Setup Vite or production static serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[SnapLearn Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
