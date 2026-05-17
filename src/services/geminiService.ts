import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateBirthdayMessage = async (name: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `اكتب رسالة تهنئة بعيد ميلاد قصيرة ومبهجة للمخدوم ${name} من كنيسته وخدمته.`,
  });
  return response.text;
};
