const MAX_IMAGE_DIMENSION = 1440;
const OUTPUT_QUALITY = 0.82;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve(reader.result);
        return;
      }
      reject(new Error(`Không thể đọc ảnh "${file.name}".`));
    };
    reader.onerror = () => reject(new Error(`Không thể đọc ảnh "${file.name}".`));
    reader.readAsDataURL(file);
  });

const loadImage = (dataUrl: string, fileName: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Không thể xử lý ảnh "${fileName}".`));
    image.src = dataUrl;
  });

const toOptimizedDataUrl = async (file: File) => {
  const source = await readFileAsDataUrl(file);
  if (!/image\/(png|jpe?g|webp)/i.test(file.type)) {
    return source;
  }

  const image = await loadImage(source, file.name);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / image.width, MAX_IMAGE_DIMENSION / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(`Không thể xử lý ảnh "${file.name}".`);
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', OUTPUT_QUALITY);
};

export const readFilesAsDataUrls = async (files: FileList | File[]) => {
  const entries = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'));
  return Promise.all(entries.map(toOptimizedDataUrl));
};
