import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  ChevronLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  DollarSign, 
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDriverStore } from '../store';
import { cn } from '../utils';
import { Button, Card, Input } from '../components/UI';
import { 
  extractReportFromImage, 
  generateImageHash, 
  generateContentFingerprint,
  ExtractedReportData 
} from '../services/aiExtractionService';
import { AppType } from '../types';

export const ImportReport = () => {
  const navigate = useNavigate();
  const { user, settings, importedReports, addImportedReport } = useDriverStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    console.log('DEBUG - VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY);
    console.log('DEBUG - import.meta.env:', import.meta.env);
  }, []);

  const [step, setStep] = useState<'upload' | 'analyzing' | 'review' | 'success'>('upload');
  const [loadingStep, setLoadingStep] = useState(0);
  const [platform, setPlatform] = useState<AppType>('Uber');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReportData | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{ date: string; platform: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setDuplicateInfo(null);
      setExtractedData(null);
    }
  };

  const handlePlatformChange = (p: AppType) => {
    setPlatform(p);
    setError(null);
    setDuplicateInfo(null);
    setExtractedData(null);
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setStep('analyzing');
    setLoadingStep(0);
    setError(null);
    setDuplicateInfo(null);
    setExtractedData(null);

    console.log("[ImportReport] Iniciando análise...");
    
    try {
      // Step 0: Enviando imagem
      setLoadingStep(0);
      await new Promise(r => setTimeout(r, 800));

      // 1. Generate hash for duplicate check
      const imageHash = await generateImageHash(selectedFile);
      
      // Step 1: Lendo print
      setLoadingStep(1);
      
      // 2. Convert to base64 for AI
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Erro ao ler o arquivo de imagem."));
        reader.readAsDataURL(selectedFile);
      });
      const base64Image = await base64Promise;

      // Step 2: Extraindo valores
      setLoadingStep(2);
      
      // 3. Extract data using AI
      const data = await extractReportFromImage(base64Image, platform);
      
      // Step 3: Organizando relatório
      setLoadingStep(3);
      await new Promise(r => setTimeout(r, 600));
      
      setExtractedData(data);

      // 4. Duplicate check (Hash + Fingerprint)
      const fingerprint = generateContentFingerprint(user?.id || '', platform, data);
      
      const duplicate = importedReports.find(r => 
        r.image_hash === imageHash || r.content_fingerprint === fingerprint
      );
      
      if (duplicate) {
        setDuplicateInfo({
          date: new Date(duplicate.imported_at).toLocaleDateString('pt-BR'),
          platform: duplicate.platform
        });
      }

      setStep('review');
      console.log("[ImportReport] Análise concluída com sucesso.");
    } catch (err: any) {
      console.error('[ImportReport] Erro na análise:', err);
      setError(err.message || 'Ocorreu um erro ao analisar a imagem. Tente novamente.');
      setStep('upload');
    }
  };

  const handleConfirmImport = async () => {
    if (!extractedData || !user) return;

    try {
      const imageHash = selectedFile ? await generateImageHash(selectedFile) : '';
      const fingerprint = generateContentFingerprint(user.id, platform, extractedData);

      await addImportedReport({
        vehicle_id: settings.currentVehicleProfileId,
        platform,
        report_type: extractedData.report_type,
        period_start: extractedData.period_start,
        period_end: extractedData.period_end,
        total_earnings: extractedData.total_earnings,
        cash_earnings: extractedData.cash_earnings,
        app_earnings: extractedData.app_earnings,
        platform_fee: extractedData.platform_fee,
        promotions: extractedData.promotions,
        taxes: extractedData.taxes,
        requests_count: extractedData.requests_count,
        image_hash: imageHash,
        content_fingerprint: fingerprint,
        source: 'screenshot',
        status: 'confirmed',
        confidence_score: extractedData.confidence_score,
        uncertain_fields: extractedData.uncertain_fields
      });

      setStep('success');
    } catch (err) {
      console.error('[ImportReport] Save error:', err);
      setError('Erro ao salvar o relatório. Tente novamente.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Importar Relatório</h1>
          <p className="text-sm text-zinc-500 font-medium">Extraia dados financeiros de seus prints</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-4">
                Selecione a Plataforma
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Uber', '99', 'inDrive'] as AppType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePlatformChange(p)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      platform === p 
                        ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' 
                        : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400'
                    }`}
                  >
                    <span className="text-sm font-bold">{p}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-4">
                Upload do Print
              </label>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />

              {!selectedFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 transition-colors">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">Clique para selecionar</p>
                    <p className="text-xs text-zinc-500">ou arraste o arquivo aqui</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <img 
                      src={previewUrl!} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setError(null);
                        setExtractedData(null);
                        setDuplicateInfo(null);
                      }}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <AlertCircle size={20} />
                    </button>
                  </div>
                  
                  <div className="mb-4 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">Status da IA</p>
                    <p className="text-xs font-bold">
                      {import.meta.env.VITE_GEMINI_API_KEY 
                        ? "Pronto para analisar"
                        : "Aguardando configuração da API Key"}
                    </p>
                  </div>

                  <Button 
                    variant="primary" 
                    className="w-full h-14"
                    onClick={handleStartAnalysis}
                  >
                    Analisar com IA
                  </Button>
                </div>
              )}
            </Card>

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-start gap-3">
              <Info size={20} className="text-zinc-400 mt-0.5" />
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Dica: Para melhores resultados, certifique-se de que o print mostra claramente os valores de ganhos e o período (dia ou semana).
              </p>
            </div>
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="relative w-32 h-32 mb-12">
              <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full" />
              <motion.div 
                className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Camera size={40} />
                </motion.div>
              </div>
              
              {/* Progress dots */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                      loadingStep >= i ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                    )}
                    animate={loadingStep === i ? { scale: [1, 1.5, 1] } : {}}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight">
                {loadingStep === 0 && "Enviando imagem..."}
                {loadingStep === 1 && "Lendo print..."}
                {loadingStep === 2 && "Extraindo valores..."}
                {loadingStep === 3 && "Organizando relatório..."}
              </h2>
              <p className="text-sm text-zinc-500 font-medium max-w-xs mx-auto leading-relaxed">
                Nossa IA está processando os dados financeiros para gerar sua análise automática.
              </p>
            </div>
          </motion.div>
        )}

        {step === 'review' && extractedData && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {duplicateInfo && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-600 dark:text-amber-400">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black uppercase tracking-tight">Possível Duplicata</p>
                  <p className="text-xs font-medium opacity-80 leading-relaxed">
                    Este relatório parece já ter sido importado anteriormente em <span className="font-black">{duplicateInfo.date}</span> via <span className="font-black">{duplicateInfo.platform}</span>. 
                    Verifique os dados antes de confirmar para evitar duplicidade nas suas estatísticas.
                  </p>
                </div>
              </div>
            )}

            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-tight">Revisar Dados</h2>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                  Extraído com IA
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Layers size={10} /> Tipo de Relatório
                  </label>
                  <select
                    value={extractedData.report_type}
                    onChange={(e) => setExtractedData({ ...extractedData, report_type: e.target.value as any })}
                    className="w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Calendar size={10} /> Início do Período
                  </label>
                  <Input
                    value={extractedData.period_start}
                    onChange={(e) => setExtractedData({ ...extractedData, period_start: e.target.value })}
                    className="h-12 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <DollarSign size={10} /> Ganhos Totais
                  </label>
                  <Input
                    type="number"
                    value={extractedData.total_earnings}
                    onChange={(e) => setExtractedData({ ...extractedData, total_earnings: parseFloat(e.target.value) })}
                    className="h-12 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <DollarSign size={10} /> Ganhos em Dinheiro
                  </label>
                  <Input
                    type="number"
                    value={extractedData.cash_earnings}
                    onChange={(e) => setExtractedData({ ...extractedData, cash_earnings: parseFloat(e.target.value) })}
                    className="h-12 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <DollarSign size={10} /> Taxa Plataforma
                  </label>
                  <Input
                    type="number"
                    value={extractedData.platform_fee}
                    onChange={(e) => setExtractedData({ ...extractedData, platform_fee: parseFloat(e.target.value) })}
                    className="h-12 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <FileText size={10} /> Total de Viagens
                  </label>
                  <Input
                    type="number"
                    value={extractedData.requests_count}
                    onChange={(e) => setExtractedData({ ...extractedData, requests_count: parseInt(e.target.value) })}
                    className="h-12 font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14"
                  onClick={() => setStep('upload')}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 h-14"
                  onClick={handleConfirmImport}
                >
                  Confirmar Importação
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
        {step === 'success' && extractedData && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-8 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 size={48} />
            </motion.div>

            <div className="space-y-2 mb-12">
              <h2 className="text-3xl font-black tracking-tight">Importado com Sucesso!</h2>
              <p className="text-zinc-500 font-medium">
                <span className="text-emerald-500 font-black">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extractedData.total_earnings)}
                </span> adicionados à sua análise.
              </p>
            </div>

            <Card className="w-full p-6 mb-8 text-left space-y-4">
              <div className="flex justify-between items-center pb-4 border-bottom border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-black uppercase text-zinc-400">Plataforma</span>
                <span className="text-sm font-black">{platform}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-bottom border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-black uppercase text-zinc-400">Tipo</span>
                <span className="text-sm font-black">{extractedData.report_type === 'daily' ? 'Diário' : 'Semanal'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-zinc-400">Período</span>
                <span className="text-sm font-black">{extractedData.period_start}</span>
              </div>
            </Card>

            <Button 
              variant="primary" 
              className="w-full h-14"
              onClick={() => navigate('/reports')}
            >
              Ver Relatórios
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
