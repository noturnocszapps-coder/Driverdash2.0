import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button } from '../components/UI';
import { ChevronLeft, FlaskConical, Zap, Bug, Play, Trash2, RefreshCw } from 'lucide-react';
import { useDriverStore } from '../store';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { cn } from '../utils';

const DevLab = () => {
  const navigate = useNavigate();
  const { clearData, syncData, cycles, tracking } = useDriverStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResetData = async () => {
    if (!window.confirm('Isso apagará TODOS os seus dados locais e na nuvem. Tem certeza?')) return;
    
    setIsProcessing(true);
    try {
      await clearData();
      toast.success('Dados resetados com sucesso');
    } catch (error) {
      toast.error('Erro ao resetar dados');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceSync = async () => {
    setIsProcessing(true);
    try {
      await syncData();
      toast.success('Sincronização forçada concluída');
    } catch (error) {
      toast.error('Erro na sincronização');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      <header className="p-4 flex items-center gap-3 border-b border-zinc-800 bg-[#0B0B0B] sticky top-0 z-[1001]">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <FlaskConical size={20} className="text-emerald-500" />
            Developer Lab
          </h1>
          <p className="text-xs text-zinc-500">Área de testes e depuração</p>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-2xl mx-auto w-full">
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 px-1">Controles de Dados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Sincronização</h3>
                    <p className="text-[10px] text-zinc-500">Forçar push/pull com Supabase</p>
                  </div>
                </div>
                <Button 
                  onClick={handleForceSync} 
                  disabled={isProcessing}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase text-[10px]"
                >
                  {isProcessing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Reset Total</h3>
                    <p className="text-[10px] text-zinc-500">Apagar tudo (Local + Cloud)</p>
                  </div>
                </div>
                <Button 
                  onClick={handleResetData} 
                  disabled={isProcessing}
                  variant="secondary"
                  className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 font-black uppercase text-[10px]"
                >
                  Resetar Banco de Dados
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 px-1">Estado Interno</h2>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
                  <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Ciclos Totais</p>
                  <p className="text-xl font-black">{cycles.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
                  <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Tracking Ativo</p>
                  <p className={cn("text-xl font-black", tracking.isActive ? "text-emerald-500" : "text-zinc-500")}>
                    {tracking.isActive ? 'SIM' : 'NÃO'}
                  </p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-black/40 border border-zinc-800 space-y-2">
                <p className="text-[9px] font-black text-zinc-500 uppercase">Heurísticas de Tracking</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400">Modo:</span>
                    <span className="text-[10px] font-bold uppercase">{tracking.mode || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400">Override:</span>
                    <span className="text-[10px] font-bold uppercase">{tracking.isManualOverride ? 'SIM' : 'NÃO'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400">Detecção:</span>
                    <span className="text-[10px] font-bold uppercase">{tracking.tripDetectionState || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400">Pontos:</span>
                    <span className="text-[10px] font-bold uppercase">{tracking.points?.length || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 px-1">Novas Funcionalidades (Sandbox)</h2>
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-zinc-900 border-zinc-800 opacity-50">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                <Bug size={32} className="text-zinc-700" />
                <div>
                  <h3 className="text-sm font-bold">Simulador de Trajeto</h3>
                  <p className="text-[10px] text-zinc-500">Simular movimentação GPS para testes de eficiência</p>
                </div>
                <Button disabled size="sm" className="bg-zinc-800 text-zinc-500 font-black uppercase text-[9px]">
                  Em Breve
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="pt-8 text-center">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">DriverDash Beta • v2.1.0-dev</p>
        </div>
      </div>
    </div>
  );
};

export default DevLab;
