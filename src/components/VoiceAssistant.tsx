import React, { useEffect, useCallback, useRef } from 'react';
import { useDriverStore } from '../store';
import { toast } from 'sonner';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useIsMobile } from '../hooks/useIsMobile';

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
    const { setCopilotFeedback } = useDriverStore.getState();
    console.log('[VOICE] Command received:', command);

    // Trip Management
    if (command.includes('iniciar corrida') || command.includes('começar corrida')) {
      if (tracking.mode !== 'in_trip') {
        startTrip();
        speak('Corrida iniciada. Boa viagem!');
        setCopilotFeedback('Corrida iniciada', 'success');
      } else {
        speak('A corrida já está em andamento.');
        setCopilotFeedback('Já em andamento', 'info');
      }
      return;
    }

    if (command.includes('finalizar corrida') || command.includes('encerrar corrida') || command.includes('parar corrida')) {
      if (tracking.mode === 'in_trip') {
        endTrip();
        speak('Corrida finalizada. Confira o valor.');
        setCopilotFeedback('Corrida finalizada', 'success');
      } else {
        speak('Não há nenhuma corrida ativa para finalizar.');
        setCopilotFeedback('Sem corrida ativa', 'info');
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
        setCopilotFeedback(`Valor: R$ ${suggestedValue.toFixed(2)}`, 'success', 5000);
      } else {
        speak('Inicie uma corrida para ver o valor estimado.');
        setCopilotFeedback('Inicie uma corrida', 'info');
      }
      return;
    }

    if (command.includes('comandos') || command.includes('ajuda')) {
      speak('Comandos disponíveis: Iniciar corrida, Finalizar corrida, Valor da corrida, Polícia, Banheiro e Via interditada.');
      setCopilotFeedback('Comandos de voz', 'info');
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
        setCopilotFeedback('Polícia marcada', 'success');
      } else {
        speak('Não consegui obter sua localização atual.');
        setCopilotFeedback('Erro de localização', 'error');
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
        setCopilotFeedback('Banheiro marcado', 'success');
      } else {
        speak('Não consegui obter sua localização atual.');
        setCopilotFeedback('Erro de localização', 'error');
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
        setCopilotFeedback('Interdição marcada', 'success');
      } else {
        speak('Não consegui obter sua localização atual.');
        setCopilotFeedback('Erro de localização', 'error');
      }
      return;
    }

    // If no command matched but it sounded like one
    if (command.length > 3) {
      console.log('[VOICE] Command not recognized:', command);
      setCopilotFeedback('Não entendi', 'info');
    }
  }, [tracking, startTrip, endTrip, addMapMarker, speak, driverProfile]);

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
      useDriverStore.getState().setCopilotFeedback(transcript, 'voice', 2000);
      processCommand(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VOICE] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        useDriverStore.getState().setCopilotFeedback('Microfone bloqueado', 'error', 4000);
        setVoiceListening(false);
      } else if (event.error === 'network') {
        useDriverStore.getState().setCopilotFeedback('Erro de rede', 'error', 4000);
        setVoiceListening(false);
      } else if (event.error === 'no-speech') {
        // Silent error, just log
      } else {
        useDriverStore.getState().setCopilotFeedback('Não consegui ouvir', 'error', 3000);
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

  return null;
};
