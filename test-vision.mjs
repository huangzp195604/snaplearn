// 端到端测试：真实图片 → GLM-4V-Flash 识别 → 返回卡片 JSON
import fs from 'fs';

const imagePath = 'C:/Users/19560/.workbuddy/clipboard-images/clipboard-2026-11-05T14-45-28-576Z-b568ad8d.jpg';
const imageBase64 = fs.readFileSync(imagePath).toString('base64');

console.log('图片大小:', (imageBase64.length / 1024).toFixed(0), 'KB (base64)');

const res = await fetch('http://localhost:3000/api/analyze-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
});

const data = await res.json();
console.log('HTTP', res.status, '| success:', data.success, '| provider:', data.provider || '(demo)');

if (data.card) {
  const c = data.card;
  console.log('\n=== 识别结果 ===');
  console.log('标题:', c.headline, '/', c.headlineChinese);
  console.log('场景:', c.sceneCategory);
  console.log('识别物品 (' + (c.detectedItems || []).length + ' 个):');
  (c.detectedItems || []).forEach((i) => console.log(`  - ${i.english} (${i.chinese}) ${i.phonetic} @(${i.x}%,${i.y}%)`));
  console.log('核心词汇数:', (c.keyVocabulary || []).length, '| 短语数:', (c.naturalPhrases || []).length, '| 句型数:', (c.usefulPatterns || []).length);
  console.log('场景短文:', (c.sceneDescription?.english || '').slice(0, 100) + '...');
} else {
  console.log('返回数据:', JSON.stringify(data).slice(0, 500));
}
if (data.notice) console.log('\n提示:', data.notice);
