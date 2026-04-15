import React, { useEffect, useCallback, useRef } from 'react';
import { useDriverStore } from '../store';
import { toast } from 'sonner';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceAssistant = () => {
  const { 
    settings, 
    voiceState, 
    setVoiceListening, 
    startTrip, 
    endTrip, 
    tracking,
    addMapMarker,
    speak,
    driverProfile,
    plan,
    setPaywallOpen
  } = useDriverStore();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  const processCommand = useCallback((transcript: string) => {
    const command = transcript.toLowerCase().trim();
    console.log('[VOICE] Command received:', command);

    // Trip Management
    if (command.includes('iniciar corrida') || command.includes('começar corrida')) {
      if (tracking.mode !== 'in_trip') {
        startTrip();
        speak('Corrida iniciada. Boa viagem!');
      } else {
        speak('A corrida já está em andamento.');
      }
      return;
    }

    if (command.includes('finalizar corrida') || command.includes('encerrar corrida') || command.includes('parar corrida')) {
      if (tracking.mode === 'in_trip') {
        endTrip();
        speak('Corrida finalizada. Confira o valor.');
      } else {
        speak('Não há nenhuma corrida ativa para finalizar.');
      }
      return;
    }

    if (command.includes('valor da corrida') || command.includes('quanto deu')) {
      if (tracking.mode === 'in_trip') {
        const ratePerKm = driverProfile.avgProfitPerKm || 2.5;
        const distance = tracking.productiveDistance || 0;
        const duration = tracking.productiveTime || 0;
        const suggestedValue = Math.round((distance * ratePerKm + (duration / 60000) * 0.1) * 100) / 100;
        speak(`O valor estimado da corrida é de ${suggestedValue.toFixed(2)} reais.`);
      } else {
        speak('Inicie uma corrida para ver o valor estimado.');
      }
      return;
    }

    if (command.includes('comandos') || command.includes('ajuda')) {
      speak('Comandos disponíveis: Iniciar corrida, Finalizar corrida, Valor da corrida, Polícia, Banheiro e Via interditada.');
      return;
    }

    // Map Markers
    if (command.includes('polícia') || command.includes('blitz')) {
      const lastPoint = tracking.points[tracking.points.length - 1];
      if (lastPoint) {
        addMapMarker({
          type: 'police',
          lat: lastPoint.lat,
          lng: lastPoint.lng,
          description: 'Polícia reportada por voz'
        });
        speak('Polícia marcada no mapa.');
      } else {
        speak('Não consegui obter sua localização atual.');
      }
      return;
    }

    if (command.includes('banheiro')) {
      const lastPoint = tracking.points[tracking.points.length - 1];
      if (lastPoint) {
        addMapMarker({
          type: 'bathroom',
          lat: lastPoint.lat,
          lng: lastPoint.lng,
          description: 'Banheiro reportado por voz'
        });
        speak('Banheiro marcado no mapa.');
      } else {
        speak('Não consegui obter sua localização atual.');
      }
      return;
    }

    if (command.includes('via interditada') || command.includes('rua fechada') || command.includes('interdição')) {
      const lastPoint = tracking.points[tracking.points.length - 1];
      if (lastPoint) {
        addMapMarker({
          type: 'danger',
          lat: lastPoint.lat,
          lng: lastPoint.lng,
          description: 'Via interditada reportada por voz'
        });
        speak('Interdição marcada no mapa.');
      } else {
        speak('Não consegui obter sua localização atual.');
      }
      return;
    }

    // If no command matched but it sounded like one
    if (command.length > 3) {
      console.log('[VOICE] Command not recognized:', command);
    }
  }, [tracking, startTrip, endTrip, addMapMarker, speak]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[VOICE] Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      processCommand(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VOICE] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Permissão de microfone negada para comandos de voz.');
        setVoiceListening(false);
      }
    };

    recognition.onend = () => {
      console.log('[VOICE] Recognition ended');
      if (isListeningRef.current) {
        console.log('[VOICE] Restarting recognition...');
        try {
          recognition.start();
        } catch (e) {
          console.error('[VOICE] Failed to restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      recognition.abort();
    };
  }, [processCommand, setVoiceListening]);

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (voiceState.isListening) {
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
        toast.success('Comandos de voz ativados');
      } catch (e) {
        console.error('[VOICE] Failed to start recognition:', e);
      }
    } else {
      isListeningRef.current = false;
      recognitionRef.current.stop();
    }
  }, [voiceState.isListening]);

  if (!settings.voiceCommandsEnabled) return null;

  return (
    <div className="fixed bottom-28 right-4 z-[110] pointer-events-none">
      <div className="pointer-events-auto">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (plan === 'free') {
              setPaywallOpen(true);
              return;
            }
            setVoiceListening(!voiceState.isListening);
          }}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg",
            voiceState.isListening 
              ? "bg-emerald-500 text-zinc-950 shadow-emerald-500/40 animate-pulse" 
              : "bg-zinc-900 text-zinc-400 border border-white/5"
          )}
        >
          {voiceState.isListening ? <Mic size={20} /> : <MicOff size={20} />}
          
          <AnimatePresence>
            {voiceState.isListening && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-950"
              />
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};
