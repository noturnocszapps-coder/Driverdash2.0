import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedReportData {
  report_type: 'daily' | 'weekly' | 'ride_offer' | 'ride_detail';
  period_start: string;
  period_end: string;
  total_earnings: number;
  cash_earnings: number;
  app_earnings: number;
  platform_fee: number;
  promotions: number;
  taxes: number;
  requests_count: number;
  // Ride specific fields
  ride_km?: number;
  ride_duration_mins?: number;
  passenger_rating?: number;
  surge_multiplier?: number;
  value_per_km?: number;
  value_per_hour?: number;
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
          text: `Analise este print da tela do aplicativo de motorista ${platform}. 
          Pode ser um relatório de ganhos (diário/semanal) ou uma oferta/detalhe de corrida individual.
          
          Extraia os dados financeiros e operacionais. 
          Se um valor não for encontrado, retorne 0 ou null conforme apropriado.
          
          Para relatórios:
          - Identifique se é diário ou semanal.
          - Extraia ganhos totais, taxas e número de viagens.
          
          Para ofertas ou detalhes de corrida:
          - Identifique como 'ride_offer' ou 'ride_detail'.
          - Extraia o valor total da corrida.
          - Extraia a distância em KM.
          - Extraia a duração estimada em minutos.
          - Extraia a nota do passageiro (ex: 4.95).
          - Extraia o multiplicador de preço dinâmico/surge (ex: 1.5x ou valor adicional).
          - Calcule o valor por KM (valor / distância).
          - Calcule o valor por hora (valor / (duração/60)).
          
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
              enum: ["daily", "weekly", "ride_offer", "ride_detail"],
              description: "Tipo do relatório ou tela"
            },
            period_start: { 
              type: Type.STRING, 
              description: "Data de início ou data da corrida" 
            },
            period_end: { 
              type: Type.STRING, 
              description: "Data de fim (mesma do início para corridas)" 
            },
            total_earnings: { 
              type: Type.NUMBER,
              description: "Ganhos totais ou valor da corrida"
            },
            cash_earnings: { 
              type: Type.NUMBER,
              description: "Ganhos em dinheiro"
            },
            app_earnings: { 
              type: Type.NUMBER,
              description: "Ganhos via aplicativo"
            },
            platform_fee: { 
              type: Type.NUMBER,
              description: "Taxa da plataforma"
            },
            promotions: { 
              type: Type.NUMBER,
              description: "Promoções ou bônus"
            },
            taxes: { 
              type: Type.NUMBER,
              description: "Impostos"
            },
            requests_count: { 
              type: Type.NUMBER,
              description: "Número de viagens (1 para corridas individuais)"
            },
            ride_km: {
              type: Type.NUMBER,
              description: "Distância da corrida em KM"
            },
            ride_duration_mins: {
              type: Type.NUMBER,
              description: "Duração da corrida em minutos"
            },
            passenger_rating: {
              type: Type.NUMBER,
              description: "Nota do passageiro"
            },
            surge_multiplier: {
              type: Type.NUMBER,
              description: "Multiplicador de preço dinâmico"
            },
            value_per_km: {
              type: Type.NUMBER,
              description: "Valor por KM calculado"
            },
            value_per_hour: {
              type: Type.NUMBER,
              description: "Valor por hora calculado"
            },
            confidence_score: {
              type: Type.NUMBER,
              description: "Nível de confiança (0-100)"
            },
            uncertain_fields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Campos imprecisos"
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
      console.error("[Gemini] Timeout atingido (20s) - Retornando resultado parcial");
      // Return a partial result so the user can edit it manually instead of a dead-end error
      return {
        report_type: 'daily',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        total_earnings: 0,
        cash_earnings: 0,
        app_earnings: 0,
        platform_fee: 0,
        promotions: 0,
        taxes: 0,
        requests_count: 0,
        confidence_score: 0,
        uncertain_fields: ['all']
      };
    }
    if (error.message === "EMPTY_RESPONSE" || error.message === "PARSE_ERROR") {
      console.error(`[Gemini] ${error.message} - Retornando resultado vazio para preenchimento manual`);
      return {
        report_type: 'daily',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        total_earnings: 0,
        cash_earnings: 0,
        app_earnings: 0,
        platform_fee: 0,
        promotions: 0,
        taxes: 0,
        requests_count: 0,
        confidence_score: 0,
        uncertain_fields: ['all']
      };
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
