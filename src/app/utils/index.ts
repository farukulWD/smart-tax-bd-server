import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import Tesseract from 'tesseract.js';

export const isPDF = (fileName: string) =>
  fileName.toLowerCase().endsWith('.pdf');

export const isImage = (fileName: string) =>
  ['.jpg', '.jpeg', '.png', '.webp', '.bmp'].some(ext =>
    fileName.toLowerCase().includes(ext)
  );

export const extractText = async (file: Express.Multer.File) => {
  const path = file.path;

  const ext = file.mimetype;

  if (ext === 'application/pdf') {
    const buffer = fs.readFileSync(path);
    const parser = new PDFParse(buffer);
    const pdfData = await parser.getText();
    return pdfData.text;
  }

  if (ext.startsWith('image/')) {
    const result = await Tesseract.recognize(path, 'eng');
    return result.data.text;
  }

  throw new Error('Unsupported file format');
};

export const validateETIN = (text: string) => {
  const keywordRegex = /(e-?tin|tin certificate|taxpayer)/i;

  return keywordRegex.test(text);
};
