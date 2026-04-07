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
    { icon: Brain, text: "Detecção automática de corridas (IA)" },
    { icon: BarChart3, text: "Relatórios completos" },
    { icon: Zap, text: "Insights inteligentes" },
    { icon: BarChart3, text: "Comparação semanal e mensal" },
    { icon: Cloud, text: "Backup na nuvem" },
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
            <div className="relative p-8 pt-10">
              {/* Close Button */}
              <button 
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-4">
                  <Rocket className="text-emerald-500" size={32} />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">
                  🚀 DIRIJA COM CONTROLE TOTAL
                </h2>
                <p className="text-zinc-400 text-sm font-medium">
                  Saiba exatamente quanto você lucra por dia
                </p>
              </div>

              {/* Price */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center mb-8">
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-zinc-400 text-lg font-bold">R$</span>
                  <span className="text-4xl font-black text-white tracking-tighter">9,90</span>
                  <span className="text-zinc-500 font-medium">/mês</span>
                </div>
                <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">
                  7 dias grátis • cancele quando quiser
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-4 mb-10">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <benefit.icon className="text-emerald-500" size={16} />
                    </div>
                    <span className="text-zinc-300 text-sm font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <Button 
                  onClick={handleSubscribe}
                  className="w-full py-6 text-lg font-black tracking-widest uppercase bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
                >
                  COMEÇAR AGORA
                </Button>
                <button 
                  onClick={handleClose}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Continuar no plano grátis
                </button>
              </div>

              {/* Security Footer */}
              <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
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
