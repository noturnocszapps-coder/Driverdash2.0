import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Rocket, Zap, BarChart3, Brain, Cloud, ShieldCheck } from 'lucide-react';
import { useDriverStore } from '../store';
import { Button } from './UI';
import { cn } from '../utils';

interface PaywallProps {
  onSubscribe?: () => void;
  onClose?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onSubscribe, onClose }) => {
  const { setPlan, setPaywallOpen, isPaywallOpen } = useDriverStore();

  const handleSubscribe = () => {
    setPlan('pro');
    setPaywallOpen(false);
    if (onSubscribe) onSubscribe();
  };

  const handleClose = () => {
    setPaywallOpen(false);
    if (onClose) onClose();
  };

  const benefits = [
    { icon: Brain, text: "Detecção automática de corridas" },
    { icon: BarChart3, text: "Relatórios completos do seu dia" },
    { icon: Zap, text: "Insights para ganhar mais" },
    { icon: BarChart3, text: "Comparação semanal e mensal" },
    { icon: Cloud, text: "Backup seguro dos seus dados" },
  ];

  return (
    <AnimatePresence>
      {isPaywallOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-zinc-950 border-t border-white/10 rounded-t-[2.5rem] overflow-hidden max-w-lg mx-auto"
          >
            <div className="relative p-8 pt-12">
              {/* Close Button */}
              <button 
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/10 mb-6">
                  <Rocket className="text-emerald-500" size={32} />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-3 leading-tight">
                  DESCUBRA QUANTO VOCÊ REALMENTE LUCRA
                </h2>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed px-4">
                  Pare de dirigir no escuro. O DriverDash PRO mostra seus ganhos reais, automatiza a análise e ajuda você a tomar decisões melhores.
                </p>
              </div>

              {/* Price Block - Conversion Focused */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 text-center mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30" />
                <p className="text-emerald-500 text-xl font-black uppercase tracking-widest mb-1">
                  7 DIAS GRÁTIS
                </p>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-zinc-400 text-sm font-bold">Depois, R$</span>
                  <span className="text-2xl font-black text-white tracking-tighter">9,90</span>
                  <span className="text-zinc-500 text-sm font-medium">/mês</span>
                </div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  Cancele quando quiser
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Check className="text-emerald-500" size={12} />
                    </div>
                    <span className="text-zinc-300 text-sm font-bold tracking-tight">{benefit.text}</span>
                  </div>
                ))}
              </div>

              {/* Emotional Reinforcement */}
              <div className="text-center mb-8">
                <p className="text-zinc-500 text-[11px] font-bold italic">
                  "Quanto vale descobrir onde você está perdendo dinheiro todos os dias?"
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <Button 
                  onClick={handleSubscribe}
                  className="w-full py-7 text-lg font-black tracking-widest uppercase bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-[0_10px_30px_rgba(16,185,129,0.2)] active:scale-95 transition-all rounded-2xl"
                >
                  TESTAR PRO GRÁTIS
                </Button>
                <button 
                  onClick={handleClose}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                >
                  Continuar no plano grátis
                </button>
              </div>

              {/* Security Footer */}
              <div className="mt-8 flex items-center justify-center gap-2 text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                <ShieldCheck size={12} />
                <span>Pagamento Seguro • SSL Encrypted</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
