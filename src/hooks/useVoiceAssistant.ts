
import { useCallback } from 'react';
import { useDriverStore } from '../store';
import { speak as libSpeak, startListening as libStartListening } from '../lib/voiceAssistant';
import { toast } from 'sonner';

export const useVoiceAssistant = () => {
  const { 
    settings, 
    voiceState, 
    setVoiceListening, 
    setLastSpoken,
    userLearning,
    startTracking,
    stopTracking,
    setMiniMapOpen,
    updateSettings,
    setQuickActionsOpen
  } = useDriverStore();
  
  const speak = useCallback((text: string, priority: 'low' | 'normal' | 'high' = 'normal') => {
    if (!settings.voiceEnabled) return;
    
    // Verbosity check
    if (settings.voiceVerbosity === 'low' && priority !== 'high') return;
    if (settings.voiceVerbosity === 'normal' && priority === 'low') return;
    
    // Silent mode check
    if (userLearning.isSilentMode && priority !== 'high') return;
    
    // Cooldown check (10 seconds)
    const now = Date.now();
    const lastSpokenAt = voiceState.lastSpokenAt || 0;
    const cooldown = 10000; 
    
    if (now - lastSpokenAt < cooldown && priority !== 'high') {
      console.log('[VOICE] Skipped due to cooldown');
      return;
    }
    
    // Repetition check (don't repeat same message within 1 minute)
    if (text === voiceState.lastSpokenMessage && now - lastSpokenAt < 60000) {
      return;
    }
    
    libSpeak(text, settings.voiceVolume || 1);
    setLastSpoken(text);
  }, [settings.voiceEnabled, settings.voiceVerbosity, settings.voiceVolume, userLearning.isSilentMode, voiceState.lastSpokenAt, voiceState.lastSpokenMessage, setLastSpoken]);

  const parseCommand = useCallback((text: string) => {
    const cmd = text.toLowerCase();
    console.log('[VOICE] Parsing command:', cmd);
    
    if (cmd.includes('iniciar corrida') || cmd.includes('começar corrida')) {
      startTracking();
      speak('Corrida iniciada', 'high');
      return;
    }
    
    if (cmd.includes('parar corrida') || cmd.includes('finalizar corrida') || cmd.includes('encerrar corrida')) {
      stopTracking();
      speak('Corrida finalizada', 'high');
      return;
    }
    
    if (cmd.includes('abrir mapa')) {
      setMiniMapOpen(true);
      speak('Abrindo mapa', 'normal');
      return;
    }
    
    if (cmd.includes('lançar ganho') || cmd.includes('novo ganho')) {
      window.dispatchEvent(new CustomEvent('open-quick-entry', { detail: { type: 'income' } }));
      speak('Abrindo lançamento de ganho', 'normal');
      return;
    }
    
    if (cmd.includes('lançar despesa') || cmd.includes('nova despesa')) {
      window.dispatchEvent(new CustomEvent('open-quick-entry', { detail: { type: 'expense' } }));
      speak('Abrindo lançamento de despesa', 'normal');
      return;
    }
    
    if (cmd.includes('silenciar voz')) {
      updateSettings({ voiceEnabled: false });
      toast.info('Voz desativada');
      return;
    }
    
    if (cmd.includes('ativar voz')) {
      updateSettings({ voiceEnabled: true });
      speak('Voz ativada', 'high');
      return;
    }
    
    // Fallback
    toast.error(`Comando não entendido: "${text}"`);
    speak('Comando não entendido', 'low');
  }, [startTracking, stopTracking, setMiniMapOpen, updateSettings, speak]);

  const listen = useCallback(() => {
    if (!settings.voiceCommandsEnabled) {
      toast.error('Comandos de voz desativados nas configurações');
      return;
    }
    
    setVoiceListening(true);
    libStartListening(
      (text) => {
        parseCommand(text);
      },
      () => {
        setVoiceListening(false);
      }
    );
  }, [settings.voiceCommandsEnabled, setVoiceListening, parseCommand]);

  return { speak, listen, isListening: voiceState.isListening };
};
