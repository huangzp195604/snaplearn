import { LearningCard } from '../types';
import { pickPosterTheme } from './posterThemes';

/**
 * High-definition Canvas Poster Generator
 * Produces a high-res (1200px width) shareable poster
 * with reference image aesthetic, leader lines, learning sections, and mini-program watermark.
 * 千图千面：主题配色由 AI 依据图片内容选定（见 posterThemes.ts）
 */
export async function generatePosterCanvas(card: LearningCard): Promise<HTMLCanvasElement> {
  const width = 1200;
  // Dynamic height calculation based on sections
  const height = 1860;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 选定主题与装饰 emoji（AI 决策 → 类别兜底 → 经典黑板）
  const { theme, motifs } = pickPosterTheme(card);

  // Load photo
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback: draw placeholder if image fails to load
      resolve(img);
    };
    img.src = card.imageUrl;
  });

  // Background - theme-driven
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle gradient on top
  const headerGrad = ctx.createLinearGradient(0, 0, 0, 720);
  headerGrad.addColorStop(0, theme.headerTop);
  headerGrad.addColorStop(1, theme.headerBottom);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, 720);

  // --- TOP HEADER ---
  // Stylized handwritten English title
  ctx.save();
  ctx.fillStyle = theme.titleColor;
  ctx.font = 'bold 54px "Caveat", "Brush Script MT", "Segoe Print", cursive, sans-serif';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText(card.title, 60, 95);
  ctx.restore();

  // Yellow badge for Chinese subtitle
  const titleZh = card.titleChinese;
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  const zhWidth = ctx.measureText(titleZh).width;
  ctx.save();
  ctx.fillStyle = theme.badgeBg;
  ctx.beginPath();
  ctx.roundRect(60, 115, zhWidth + 36, 44, 22);
  ctx.fill();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = 'left';
  ctx.fillText(titleZh, 78, 145);
  ctx.restore();

  // Floating phrases bubbles (on top right like in reference image)
  const phrases = card.floatingPhrases.slice(0, 4);
  const colors = theme.bubbles;

  let phraseY = 60;
  phrases.forEach((phrase, i) => {
    const c = colors[i % colors.length];
    ctx.save();
    ctx.font = 'bold 19px "Caveat", cursive, sans-serif';
    const enW = ctx.measureText(phrase.english).width;
    ctx.font = '13px -apple-system, sans-serif';
    const zhW = ctx.measureText(phrase.chinese).width;
    const boxW = Math.max(enW, zhW) + 32;

    const boxX = width - 60 - boxW;

    ctx.fillStyle = c.bg;
    ctx.beginPath();
    ctx.roundRect(boxX, phraseY, boxW, 46, 23);
    ctx.fill();

    ctx.fillStyle = c.text;
    ctx.font = 'bold 17px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(phrase.english, boxX + boxW / 2, phraseY + 20);

    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText(phrase.chinese, boxX + boxW / 2, phraseY + 38);
    ctx.restore();

    phraseY += 56;
  });

  // --- PHOTO WITH LEADER LINES ---
  const photoX = 60;
  const photoY = 175;
  const photoW = width - 120; // 1080
  const photoH = 540;

  // Clip and draw photo with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoW, photoH, 20);
  ctx.clip();

  if (image && image.complete && image.naturalWidth > 0) {
    // Fill aspect ratio
    const imgAspect = image.naturalWidth / image.naturalHeight;
    const targetAspect = photoW / photoH;
    let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
    if (imgAspect > targetAspect) {
      sw = image.naturalHeight * targetAspect;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / targetAspect;
      sy = (image.naturalHeight - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
  } else {
    // Fallback gradient if no photo
    const pGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    pGrad.addColorStop(0, theme.photoFallbackTop);
    pGrad.addColorStop(1, theme.photoFallbackBottom);
    ctx.fillStyle = pGrad;
    ctx.fillRect(photoX, photoY, photoW, photoH);
  }

  // Soft dark vignette overlay on photo to ensure white leader lines and text pop
  const vignette = ctx.createRadialGradient(
    photoX + photoW / 2, photoY + photoH / 2, photoW * 0.25,
    photoX + photoW / 2, photoY + photoH / 2, photoW * 0.7
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0.05)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(photoX, photoY, photoW, photoH);

  ctx.restore();

  // Subtle border around photo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoW, photoH, 20);
  ctx.stroke();

  // AI 挑选的场景装饰 emoji —— 以贴纸形式点缀在照片四角
  if (motifs.length > 0) {
    const corners = [
      { x: photoX + 18, y: photoY + 18, rot: -0.18 },
      { x: photoX + photoW - 18, y: photoY + 18, rot: 0.15 },
      { x: photoX + 18, y: photoY + photoH - 18, rot: 0.2 },
      { x: photoX + photoW - 18, y: photoY + photoH - 18, rot: -0.14 },
    ];
    motifs.slice(0, 4).forEach((emoji, i) => {
      const c = corners[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.font = '42px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 6;
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    });
  }

  // DRAW LEADER LINES AND LABELS ON PHOTO
  card.detectedItems.forEach((item) => {
    const pinX = photoX + (item.x / 100) * photoW;
    const pinY = photoY + (item.y / 100) * photoH;

    // Determine label target position based on labelSide or manual offset
    let targetX = pinX;
    let targetY = pinY;
    const side = item.labelSide || 'top';
    const lineLen = 85;

    if (side.includes('left')) targetX -= lineLen;
    if (side.includes('right')) targetX += lineLen;
    if (side.includes('top')) targetY -= lineLen * 0.8;
    if (side.includes('bottom')) targetY += lineLen * 0.8;

    // Apply manual user offset if any
    if (item.labelOffsetX) targetX += item.labelOffsetX;
    if (item.labelOffsetY) targetY += item.labelOffsetY;

    // Clamp inside photo bounds + padding
    targetX = Math.max(photoX + 70, Math.min(photoX + photoW - 70, targetX));
    targetY = Math.max(photoY + 30, Math.min(photoY + photoH - 30, targetY));

    // Draw Pin Point
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Outer ripple ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Curved Leader Line (hand-drawn dashed or smooth curve aesthetic)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pinX, pinY);

    const cpX = (pinX + targetX) / 2 + (item.curvature || 0);
    const cpY = (pinY + targetY) / 2 - 15;
    ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Word Bubble (Black translucent pill with white text)
    ctx.font = 'bold 22px "Caveat", -apple-system, sans-serif';
    const enWidth = ctx.measureText(item.english).width;
    ctx.font = '15px -apple-system, sans-serif';
    const zhWidth = ctx.measureText(item.chinese).width;
    const badgeW = Math.max(enWidth, zhWidth) + 28;
    const badgeH = 50;
    const badgeX = targetX - badgeW / 2;
    const badgeY = targetY - badgeH / 2;

    ctx.fillStyle = 'rgba(15, 20, 26, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.stroke();

    // English word in handwritten cursive/clean style
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Caveat", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.english, targetX, badgeY + 22);

    // Chinese meaning
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(item.chinese, targetX, badgeY + 41);

    ctx.restore();
  });

  // --- LOWER LEARNING MODULES CONTAINER (Warm Cream Paper / Modern Card) ---
  const sheetY = 740;
  const sheetH = height - sheetY - 140; // leave bottom space for watermark

  ctx.save();
  ctx.fillStyle = theme.sheetBg;
  ctx.beginPath();
  ctx.roundRect(40, sheetY, width - 80, sheetH, 24);
  ctx.fill();

  // Border
  ctx.strokeStyle = theme.sheetBorder;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Grid layout for 01, 02, 03
  const colW = (width - 120) / 3;
  const topRowY = sheetY + 20;

  // 01 Key Vocabulary
  drawSectionBadge(ctx, 60, topRowY, '01', 'Key Vocabulary', '核心词汇', theme.accents.s1, theme);
  let vocabY = topRowY + 70;
  card.keyVocabulary.slice(0, 7).forEach((vocab) => {
    ctx.save();
    ctx.fillStyle = theme.accents.s1;
    ctx.beginPath();
    ctx.arc(75, vocabY - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme.sectionText;
    ctx.font = 'bold 17px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(vocab.english, 88, vocabY);

    ctx.fillStyle = theme.sectionSub;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(vocab.chinese, 230, vocabY);
    ctx.restore();
    vocabY += 28;
  });

  // 02 Natural Phrases
  drawSectionBadge(ctx, 60 + colW, topRowY, '02', 'Natural Phrases', '常用短语', theme.accents.s2, theme);
  let phraseColY = topRowY + 70;
  card.naturalPhrases.slice(0, 6).forEach((item) => {
    ctx.save();
    ctx.fillStyle = theme.accents.s2;
    ctx.beginPath();
    ctx.arc(60 + colW + 15, phraseColY - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme.sectionText;
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.english, 60 + colW + 28, phraseColY);

    ctx.fillStyle = theme.sectionSub;
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillText(item.chinese, 60 + colW + 28, phraseColY + 18);
    ctx.restore();
    phraseColY += 40;
  });

  // 03 Useful Sentence Patterns
  drawSectionBadge(ctx, 60 + colW * 2, topRowY, '03', 'Useful Sentence Patterns', '实用句型', theme.accents.s3, theme);
  let patternColY = topRowY + 70;
  card.usefulPatterns.slice(0, 5).forEach((p) => {
    ctx.save();
    ctx.fillStyle = theme.accents.s3;
    ctx.beginPath();
    ctx.arc(60 + colW * 2 + 15, patternColY - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme.sectionText;
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(p.pattern, 60 + colW * 2 + 28, patternColY);

    ctx.fillStyle = theme.sectionSub;
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillText(p.meaning, 60 + colW * 2 + 28, patternColY + 18);
    ctx.restore();
    patternColY += 40;
  });

  // Divider line
  const midRowY = sheetY + 340;
  ctx.strokeStyle = theme.sheetBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, midRowY);
  ctx.lineTo(width - 60, midRowY);
  ctx.stroke();

  // Bottom Row: 04 Scene Description (Left) and 05 Speaking & Writing Prompts (Right)
  const leftBoxW = (width - 150) * 0.52;
  const rightBoxW = (width - 150) * 0.48;
  const bottomRowY = midRowY + 25;

  // 04 Scene Description
  drawSectionBadge(ctx, 60, bottomRowY, '04', 'Scene Description', `场景描述 (${card.sceneDescription.wordCount}词)`, theme.accents.s4, theme);
  ctx.save();
  ctx.fillStyle = theme.sectionText;
  ctx.font = '15px -apple-system, sans-serif';
  ctx.textAlign = 'left';

  // Wrap English text
  wrapText(ctx, card.sceneDescription.english, 70, bottomRowY + 75, leftBoxW - 30, 22);

  // Chinese translation in subtle box
  const zhBoxY = bottomRowY + 200;
  ctx.fillStyle = theme.sheetBg === '#f8f9fa' ? '#f1f5f9' : theme.headerTop;
  ctx.beginPath();
  ctx.roundRect(65, zhBoxY, leftBoxW - 20, 110, 12);
  ctx.fill();

  ctx.fillStyle = theme.sectionSub;
  ctx.font = '13px -apple-system, sans-serif';
  wrapText(ctx, card.sceneDescription.chinese, 80, zhBoxY + 25, leftBoxW - 50, 20);
  ctx.restore();

  // 05 Speaking & Writing Prompts
  const pRightX = 60 + leftBoxW + 30;
  drawSectionBadge(ctx, pRightX, bottomRowY, '05', 'Speaking & Writing Prompts', '口语与写作练习', theme.accents.s5, theme);

  let promptY = bottomRowY + 75;
  card.prompts.slice(0, 3).forEach((item, idx) => {
    ctx.save();
    // Index Circle
    ctx.fillStyle = theme.accents.s5;
    ctx.beginPath();
    ctx.arc(pRightX + 15, promptY - 4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${idx + 1}`, pRightX + 15, promptY);

    // Text
    ctx.fillStyle = theme.sectionText;
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.questionEn, pRightX + 38, promptY - 5);

    ctx.fillStyle = theme.sectionSub;
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText(item.questionZh, pRightX + 38, promptY + 14);
    ctx.restore();

    promptY += 46;
  });

  // Study Tip box
  const tipY = promptY + 15;
  ctx.save();
  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(pRightX, tipY, rightBoxW - 20, 85, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 13px -apple-system, sans-serif';
  ctx.fillText('💡 Study Tip 学习建议', pRightX + 16, tipY + 24);

  ctx.fillStyle = '#78350f';
  ctx.font = '12px -apple-system, sans-serif';
  wrapText(ctx, `${card.studyTip.tipEn} (${card.studyTip.tipZh})`, pRightX + 16, tipY + 46, rightBoxW - 50, 18);
  ctx.restore();

  // --- BOTTOM WATERMARK & WECHAT MINI-PROGRAM QR FOR VIRAL SHARING ---
  const footerY = height - 120;
  ctx.save();
  // Watermark QR code container
  const qrX = width - 180;
  const qrY = footerY + 10;
  drawMockQRCode(ctx, qrX, qrY, 80);

  // App Title & Tagline
  ctx.fillStyle = theme.titleColor;
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('拍照学英语 · SnapLearn 微信小程序', 60, footerY + 38);

  ctx.fillStyle = theme.watermarkSub;
  ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('认知之物皆为英语教材 | 扫码拍照一键生成你的专属场景英语学习海报', 60, footerY + 68);

  ctx.font = '12px -apple-system, sans-serif';
  ctx.fillStyle = theme.watermarkSub;
  ctx.fillText('微信长按识别小程序码 · 每天5次免费学习', qrX - 250, footerY + 54);
  ctx.restore();

  return canvas;
}

function drawSectionBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  num: string,
  enTitle: string,
  zhTitle: string,
  badgeBg: string,
  theme: { sectionText: string; sectionSub: string; badgeText: string }
) {
  ctx.save();
  // Number Pill
  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect(x, y, 42, 42, 12);
  ctx.fill();

  ctx.fillStyle = theme.badgeText;
  ctx.font = 'bold 20px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(num, x + 21, y + 28);

  // English Title
  ctx.fillStyle = theme.sectionText;
  ctx.font = 'bold 18px "Caveat", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(enTitle, x + 52, y + 20);

  // Chinese Title
  ctx.fillStyle = theme.sectionSub;
  ctx.font = '13px -apple-system, sans-serif';
  ctx.fillText(zhTitle, x + 52, y + 38);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}

function drawMockQRCode(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 8);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw QR patterns
  ctx.fillStyle = '#0f172a';
  const dotSize = size / 10;

  // 3 Finder patterns (corners)
  drawFinderPattern(ctx, x + dotSize, y + dotSize, dotSize * 3);
  drawFinderPattern(ctx, x + size - dotSize * 4, y + dotSize, dotSize * 3);
  drawFinderPattern(ctx, x + dotSize, y + size - dotSize * 4, dotSize * 3);

  // Inner matrix dots
  for (let r = 2; r < 8; r++) {
    for (let c = 2; c < 8; c++) {
      if ((r + c) % 2 === 0 && Math.random() > 0.3) {
        ctx.fillRect(x + c * dotSize + 2, y + r * dotSize + 2, dotSize - 3, dotSize - 3);
      }
    }
  }

  // Mini WeChat center icon
  ctx.fillStyle = '#07c160';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, dotSize * 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFinderPattern(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.6, size * 0.6);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + size * 0.35, y + size * 0.35, size * 0.3, size * 0.3);
}

/**
 * Generate focused Annotated Photo Card Canvas (图片加引线标注 + 默认品牌水印)
 * Tailored specifically for exporting the annotated photo snapshot with brand watermark.
 */
export async function generateAnnotatedPhotoCanvas(card: LearningCard): Promise<HTMLCanvasElement> {
  const width = 1200;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Load photo
  const image = await new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = card.imageUrl;
  });

  // Background - Dark slate chalkboard style matching reference
  ctx.fillStyle = '#181f26';
  ctx.fillRect(0, 0, width, height);

  // Gradient atmosphere
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#13181d');
  bgGrad.addColorStop(1, '#1b232c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // --- TOP HEADER ---
  // Stylized handwritten English title
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Caveat", "Brush Script MT", "Segoe Print", cursive, sans-serif';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText(card.title, 60, 75);
  ctx.restore();

  // Yellow badge for Chinese subtitle
  const titleZh = card.titleChinese;
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  const zhWidth = ctx.measureText(titleZh).width;
  ctx.save();
  ctx.fillStyle = '#ffd13b';
  ctx.beginPath();
  ctx.roundRect(60, 95, zhWidth + 32, 40, 20);
  ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'left';
  ctx.fillText(titleZh, 76, 122);
  ctx.restore();

  // Top right floating phrase chips
  const phrases = card.floatingPhrases.slice(0, 3);
  const colors = [
    { bg: '#8ec07c', text: '#1b2b1a' },
    { bg: '#fabd2f', text: '#2b2208' },
    { bg: '#fb4934', text: '#ffffff' },
  ];

  let phraseRightX = width - 60;
  phrases.forEach((phrase, i) => {
    const c = colors[i % colors.length];
    ctx.save();
    ctx.font = 'bold 15px -apple-system, sans-serif';
    const enW = ctx.measureText(phrase.english).width;
    ctx.font = '12px -apple-system, sans-serif';
    const zhW = ctx.measureText(phrase.chinese).width;
    const boxW = Math.max(enW, zhW) + 26;
    const boxX = phraseRightX - boxW;

    ctx.fillStyle = c.bg;
    ctx.beginPath();
    ctx.roundRect(boxX, 60 + i * 36, boxW, 30, 15);
    ctx.fill();

    ctx.fillStyle = c.text;
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${phrase.english} • ${phrase.chinese}`, boxX + boxW / 2, 60 + i * 36 + 20);
    ctx.restore();
  });

  // --- PHOTO AREA WITH LEADER LINES ---
  const photoX = 60;
  const photoY = 150;
  const photoW = width - 120; // 1080
  const photoH = 680;

  // Clip and draw photo with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoW, photoH, 24);
  ctx.clip();

  if (image && image.complete && image.naturalWidth > 0) {
    const imgAspect = image.naturalWidth / image.naturalHeight;
    const targetAspect = photoW / photoH;
    let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
    if (imgAspect > targetAspect) {
      sw = image.naturalHeight * targetAspect;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / targetAspect;
      sy = (image.naturalHeight - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
  } else {
    const pGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    pGrad.addColorStop(0, '#3a4454');
    pGrad.addColorStop(1, '#232b36');
    ctx.fillStyle = pGrad;
    ctx.fillRect(photoX, photoY, photoW, photoH);
  }

  // Soft dark vignette overlay on photo
  const vignette = ctx.createRadialGradient(
    photoX + photoW / 2, photoY + photoH / 2, photoW * 0.25,
    photoX + photoW / 2, photoY + photoH / 2, photoW * 0.75
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0.05)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(photoX, photoY, photoW, photoH);

  // Subtle translucent photo corner watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = '12px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SnapLearn 拍照学英语 · 认知范围内的真实场景', photoX + photoW - 20, photoY + photoH - 20);

  ctx.restore();

  // Photo border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoW, photoH, 24);
  ctx.stroke();

  // DRAW LEADER LINES AND LABELS ON PHOTO
  card.detectedItems.forEach((item) => {
    const pinX = photoX + (item.x / 100) * photoW;
    const pinY = photoY + (item.y / 100) * photoH;

    let targetX = pinX;
    let targetY = pinY;
    const side = item.labelSide || 'top';
    const lineLen = 95;

    if (side.includes('left')) targetX -= lineLen;
    if (side.includes('right')) targetX += lineLen;
    if (side.includes('top')) targetY -= lineLen * 0.75;
    if (side.includes('bottom')) targetY += lineLen * 0.75;

    if (item.labelOffsetX) targetX += item.labelOffsetX;
    if (item.labelOffsetY) targetY += item.labelOffsetY;

    targetX = Math.max(photoX + 80, Math.min(photoX + photoW - 80, targetX));
    targetY = Math.max(photoY + 36, Math.min(photoY + photoH - 36, targetY));

    // Pin Point
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Outer ripple ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Curved Leader Line (hand-drawn dashed aesthetic)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pinX, pinY);

    const cpX = (pinX + targetX) / 2 + (item.curvature || 0);
    const cpY = (pinY + targetY) / 2 - 16;
    ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Word Bubble Pill
    ctx.font = 'bold 22px "Caveat", -apple-system, sans-serif';
    const enWidth = ctx.measureText(item.english).width;
    ctx.font = '15px -apple-system, sans-serif';
    const zhWidth = ctx.measureText(item.chinese).width;
    const badgeW = Math.max(enWidth, zhWidth) + 32;
    const badgeH = 54;
    const badgeX = targetX - badgeW / 2;
    const badgeY = targetY - badgeH / 2;

    ctx.fillStyle = 'rgba(12, 17, 23, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
    ctx.fill();
    ctx.stroke();

    // English word
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px "Caveat", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.english, targetX, badgeY + 23);

    // Chinese meaning
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(item.chinese, targetX, badgeY + 43);

    ctx.restore();
  });

  // --- DEFAULT BRAND WATERMARK AT BOTTOM ---
  const footerY = 855;
  ctx.save();
  // Watermark bar background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.roundRect(60, footerY - 5, photoW, 90, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // App Title with Emerald Brand Icon
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(88, footerY + 40, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EN', 88, footerY + 45);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SnapLearn 拍照学英语 · 微信小程序', 118, footerY + 34);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('认知之物皆为英语教材 | 扫码拍照一键生成你的专属场景英语学习卡', 118, footerY + 58);

  // Right side Mini-Program QR Code
  const qrX = width - 150;
  const qrY = footerY + 8;
  drawMockQRCode(ctx, qrX, qrY, 64);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('微信扫码或长按识别', qrX - 16, footerY + 35);
  ctx.fillText('每日 5 次免费学地道英语', qrX - 16, footerY + 52);

  ctx.restore();

  return canvas;
}

/**
 * Utility to download canvas as PNG and trigger album saving
 */
export function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename: string): string {
  const dataUrl = canvas.toDataURL('image/png', 0.95);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}

