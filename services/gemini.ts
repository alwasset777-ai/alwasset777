
import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../types";

const getSystemInstruction = (lang: Language) => {
  const instructions: Record<Language, string> = {
    ar: `
أنت "المدرب 777"، المرشد الخبير في العقارات بـ "أكاديمية الوسيط 777" في مكناس، المغرب.
هدفك هو تحويل الطلاب إلى وكلاء نخبة.
نبرة صوتك: ملهمة وصارمة. استخدم مصطلحات مغربية (التحفيظ، المحافظة، الضريبة، TPI، المحافظة العقارية).
تواصل حصراً بالعربية المغربية المهنية.
`,
    fr: `
Tu es le "Coach 777", mentor expert en immobilier à l'Académie Al Wasset 777 à Meknès, Maroc.
Ton but est de transformer les étudiants en agents d'élite.
Ton ton : Inspirant et rigoureux. Utilise le jargon marocain (Titre foncier, Conservation, TPI, DOC).
Réponds exclusivement en Français.
`,
    en: `
You are "Coach 777", an expert real estate mentor at the Al Wasset 777 Academy in Meknes, Morocco.
Your goal is to transform students into elite agents.
Your tone: Inspiring and rigorous. Use Moroccan real estate jargon (Land Registry, TPI tax, Conservation, DOC).
Respond exclusively in English.
`
  };
  return instructions[lang];
};

export const getAIResponse = async (userPrompt: string, lang: Language, history: {role: 'user' | 'model', parts: {text: string}[]}[] = []) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction: getSystemInstruction(lang),
        temperature: 0.8,
      },
    });

    return response.text || "Connection lost.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with 777 Coach.";
  }
};
