
import { GoogleGenAI, Modality } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const fetchVerseText = async (reference: string): Promise<string> => {
  const ai = getAIClient();
  const prompt = `
    Atue como uma API da Bíblia sagrada. 
    Retorne apenas o texto do versículo solicitado, sem comentários adicionais.
    Se a referência for inválida, diga "Referência não encontrada".
    Referência: "${reference}"
    Idioma: Português (Nova Versão Internacional ou similar).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || "Não foi possível carregar o texto do versículo.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao buscar versículo.";
  }
};

export const generateSpiritualCommentary = async (verse: string, userThoughts: string): Promise<string> => {
  const ai = getAIClient();
  const prompt = `
    Você é um conselheiro espiritual profundo e empático.
    Com base no versículo bíblico: "${verse}"
    E nos seguintes pensamentos do fiel: "${userThoughts}"
    
    Crie um comentário meditativo curto (máximo 3 parágrafos) que traga conforto, sabedoria e aplicação prática para a vida.
    Use um tom acolhedor e poético em português.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a reflexão no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a sabedoria divina digital. Tente novamente mais tarde.";
  }
};

export const generatePersonalDeclaration = async (verse: string): Promise<string> => {
  const ai = getAIClient();
  const prompt = `
    Com base no versículo bíblico: "${verse}"
    Escreva uma "Declaração de Fé" ou Oração Pessoal curta e poderosa.
    A escrita deve ser na primeira pessoa ("Eu declaro...", "Senhor, eu te agradeço porque...").
    O objetivo é que o usuário possa ler em voz alta para fortalecer seu espírito.
    Máximo de 4 frases impactantes em português.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a declaração.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ocorreu um erro ao gerar sua declaração.";
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Leia com calma e serenidade: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return undefined;
  }
};
