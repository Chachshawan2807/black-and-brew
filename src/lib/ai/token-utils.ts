import { encoding_for_model, TiktokenModel } from "js-tiktoken";

/**
 * คำนวณจำนวน Token สำหรับโมเดล Gemini (โดยใช้การประมาณการแบบเดียวกับ GPT-4)
 */
export function countTokens(text: string, model: string = "gpt-4"): number {
  try {
    const enc = encoding_for_model(model as TiktokenModel);
    const tokens = enc.encode(text);
    return tokens.length;
  } catch (error) {
    console.error("Error counting tokens:", error);
    // กรณี Error ให้ประมาณการด้วยสูตร: 1 token ≈ 4 ตัวอักษรภาษาอังกฤษ หรือ 1 ตัวอักษรภาษาไทย
    return Math.ceil(text.length * 0.5); 
  }
}
