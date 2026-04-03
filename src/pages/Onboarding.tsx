import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useDriverStore } from '../store';
import { 
  TrendingUp, 
  Clock, 
  MapPin, 
  Car, 
  Smartphone, 
  CheckCircle2, 
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '../utils';

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { settings, updateSettings, vehicles } = useDriverStore();

  const nextStep = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      updateSettings({ onboardingCompleted: true });
      navigate('/');
    }
  };

  const steps = [
    {
      title: "Lucro Inteligente",
      description: "O DriverDash analisa seu lucro real por KM e por Hora, descontando todos os custos automaticamente.",
      icon: <TrendingUp className="w-12 h-12 text-orange-500" />,
      color: "from-orange-500/20 to-transparent"
    },
    {
      title: "Melhores Horários e Regiões",
      description: "Descubra onde e quando é mais lucrativo dirigir. Evite áreas de baixo ganho e maximize seu tempo.",
      icon: <Zap className="w-12 h-12 text-yellow-500" />,
      color: "from-yellow-500/20 to-transparent"
    },
    {
      title: "Configuração Rápida",
      description: "Seu veículo e apps configurados para o cálculo mais preciso do mercado.",
      icon: <Car className="w-12 h-12 text-blue-500" />,
      color: "from-blue-500/20 to-transparent",
      isSetup: true
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-b transition-colors duration-700 -z-10",
        currentStep.color
      )} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl">
              {currentStep.icon}
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              {currentStep.title}
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {currentStep.isSetup && (
            <div className="space-y-4 text-left bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Veículo Ativo</p>
                  <p className="text-xs text-gray-400">
                    {vehicles.length > 0 ? vehicles[0].name : 'Nenhum veículo cadastrado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Apps Conectados</p>
                  <p className="text-xs text-gray-400">Uber, 99 e outros</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-12 left-6 right-6 max-w-md mx-auto space-y-6">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-orange-500" : "w-2 bg-white/20"
              )}
            />
          ))}
        </div>

        <button
          onClick={nextStep}
          className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
        >
          {step === 2 ? 'Começar Agora' : 'Próximo'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
