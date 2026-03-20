import { GoogleGenAI, Type } from "@google/genai";

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

const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Gemini] VITE_GEMINI_API_KEY não encontrada no runtime");
    throw new Error("API Key do Gemini não configurada. Verifique as configurações do projeto.");
  }
  return new GoogleGenAI({ apiKey });
};

export const extractReportFromImage = async (base64Image: string, platform: string): Promise<ExtractedReportData> => {
  console.log(`[Gemini] Iniciando extração para plataforma: ${platform}`);
  console.log(`[Gemini] API Key presente: ${!!import.meta.env.VITE_GEMINI_API_KEY}`);

  const ai = getAIClient();
  
  // Timeout safeguard: 20 seconds
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("TIMEOUT")), 20000)
  );

  try {
    const analysisPromise = ai.models.generateContent({
      model: "gemini-flash-latest",
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

    const response = await Promise.race([analysisPromise, timeoutPromise]) as any;
    
    console.log("[Gemini] Resposta recebida com sucesso");

    if (!response.text) {
      console.error("[Gemini] Resposta vazia do modelo");
      throw new Error("EMPTY_RESPONSE");
    }

    try {
      const parsedData = JSON.parse(response.text);
      console.log("[Gemini] JSON parseado com sucesso");
      return parsedData as ExtractedReportData;
    } catch (parseError) {
      console.error("[Gemini] Erro ao parsear JSON:", response.text);
      throw new Error("PARSE_ERROR");
    }
  } catch (error: any) {
    if (error.message === "TIMEOUT") {
      console.error("[Gemini] Timeout atingido (20s)");
      throw new Error("A análise demorou mais do que o esperado. Tente novamente.");
    }
    if (error.message === "EMPTY_RESPONSE") {
      throw new Error("Falha ao analisar o print. O Gemini não retornou dados.");
    }
    if (error.message === "PARSE_ERROR") {
      throw new Error("Não foi possível interpretar os dados extraídos pelo Gemini.");
    }
    
    console.error("[Gemini] Erro na requisição:", error);
    throw new Error("Falha ao analisar o print. Verifique sua conexão e tente novamente.");
  }
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
