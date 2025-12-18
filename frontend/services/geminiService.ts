
import { GoogleGenAI } from "@google/genai";
import { ProductionOrder, Seamstress } from "../types";

export const generateProductionInsights = async (
  orders: ProductionOrder[],
  seamstresses: Seamstress[]
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "IA não configurada.";

    const ai = new GoogleGenAI({ apiKey });
    const dataContext = JSON.stringify({
      orders: orders.map(o => ({ ref: o.referenceCode, status: o.status, pieces: o.items.reduce((a,i) => a+i.actualPieces, 0) })),
      seamstresses: seamstresses.map(s => ({ name: s.name }))
    });

    const prompt = `Analise a produção da Kavin's: ${dataContext}. Gere um relatório curto e profissional em Markdown.`;
    // Updated to gemini-3-flash-preview for text analysis task
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Relatório indisponível.";
  } catch (error) {
    return "Erro ao gerar insights.";
  }
};
