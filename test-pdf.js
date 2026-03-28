const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function test() {
  try {
    console.log('PDFParse type:', typeof PDFParse);
    if (typeof PDFParse !== 'function') {
      console.log('PDFParse is not a function/class!');
      return;
    }
    
    // Create a dummy PDF buffer or just test instantiation
    const parser = new PDFParse({ data: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000062 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF') });
    console.log('Parser instantiated!');
    const text = await parser.getText();
    console.log('Text result:', typeof text, text.text);
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

test();
