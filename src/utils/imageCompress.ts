/**
 * 客户端图片压缩：上传前把照片缩到最长边 ≤1280px、JPEG 85% 质量。
 * 好处：上传快、模型处理快、内存占用低；1280px 对海报 1080px 宽的画布绰绰有余。
 */
export async function compressImage(
  file: File,
  maxSide = 1280,
  quality = 0.85
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('读取图片文件失败，请重新选择'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = dataUrl;
  });

  const { naturalWidth: w, naturalHeight: h } = img;
  // 已经足够小就直接用，避免二次有损压缩
  if (Math.max(w, h) <= maxSide) return dataUrl;

  const scale = maxSide / Math.max(w, h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, newW, newH);
  return canvas.toDataURL('image/jpeg', quality);
}
