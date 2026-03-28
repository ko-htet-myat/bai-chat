import { PdfReader } from "pdfreader";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = "";
    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) {
        console.error("PdfReader Error:", err);
        reject(err);
      } else if (!item) {
        // End of file
        const finalResult = text.trim();
        if (!finalResult) {
          console.warn("PdfReader: No text items were found in the buffer. The PDF might be scanned/image-based.");
        }
        resolve(finalResult);
      } else if (item.text) {
        text += item.text + " ";
      }
    });
  });
}
