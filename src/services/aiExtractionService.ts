import { GoogleGenAI, Type } from "@google/genai";

if (!import.meta.env.VITE_GEMINI_API_KEY) {
  console.error("Gemini API Key não configurada");
}

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
});

export interface ExtractedReportData {
  report_type: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  total_earnings: number;
  cash_earnings: number;
  app_earnings: number;
  platform_fee: number;
  promotions: number;
  taxes: number;
  requests_count: number;
  confidence_score: number;
  uncertain_fields: string[];
}

export const extractReportFromImage = async (base64Image: string, platform: string): Promise<ExtractedReportData> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image.includes(',') ? base64Image.split(',')[1] : base64Image,
        },
      },
      {
        text: `Analise este print da tela de ganhos do aplicativo de motorista ${platform}. 
        Extraia os dados financeiros e operacionais. 
        Se um valor não for encontrado, retorne 0.
        O período deve ser extraído com precisão. Se for um relatório diário, period_start e period_end devem ser o mesmo dia. Se for semanal, identifique o intervalo.
        Use o formato YYYY-MM-DD para datas se possível, caso contrário use a descrição legível do print.
        
        Avalie a confiança da sua extração de 0 a 100 e liste campos onde você teve dúvida ou que podem estar imprecisos.
        
        Retorne os dados estritamente no formato JSON solicitado.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          report_type: { 
            type: Type.STRING, 
            enum: ["daily", "weekly"],
            description: "Tipo do relatório: diário ou semanal"
          },
          period_start: { 
            type: Type.STRING, 
            description: "Data de início do período (YYYY-MM-DD ou descrição legível)" 
          },
          period_end: { 
            type: Type.STRING, 
            description: "Data de fim do período (YYYY-MM-DD ou descrição legível)" 
          },
          total_earnings: { 
            type: Type.NUMBER,
            description: "Ganhos totais brutos"
          },
          cash_earnings: { 
            type: Type.NUMBER,
            description: "Ganhos em dinheiro (recebidos diretamente do passageiro)"
          },
          app_earnings: { 
            type: Type.NUMBER,
            description: "Ganhos via aplicativo (cartão/crédito)"
          },
          platform_fee: { 
            type: Type.NUMBER,
            description: "Taxa da plataforma (se visível)"
          },
          promotions: { 
            type: Type.NUMBER,
            description: "Promoções, incentivos ou bônus"
          },
          taxes: { 
            type: Type.NUMBER,
            description: "Impostos ou taxas governamentais (se visível)"
          },
          requests_count: { 
            type: Type.NUMBER,
            description: "Número de viagens ou solicitações concluídas"
          },
          confidence_score: {
            type: Type.NUMBER,
            description: "Nível de confiança da extração (0-100)"
          },
          uncertain_fields: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Lista de campos que podem estar imprecisos"
          }
        },
        required: ["report_type", "total_earnings", "confidence_score"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Falha na extração de dados da imagem.");
  }

  return JSON.parse(response.text) as ExtractedReportData;
};

export const generateImageHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateContentFingerprint = (userId: string, platform: string, data: ExtractedReportData): string => {
  const { report_type, period_start, period_end, total_earnings } = data;
  return `${userId}|${platform}|${report_type}|${period_start}|${period_end}|${total_earnings}`;
};
