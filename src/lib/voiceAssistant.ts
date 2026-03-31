
export const canUseTTS = () => 'speechSynthesis' in window;
export const canUseSpeechRecognition = () => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

let recognition: any = null;

export const speak = (text: string, volume = 1) => {
  if (!canUseTTS()) return;
  
  // Cancel any ongoing speech to avoid queueing up old messages
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.volume = volume;
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if (canUseTTS()) {
    window.speechSynthesis.cancel();
  }
};

export const startListening = (onResult: (text: string) => void, onEnd: () => void) => {
  if (!canUseSpeechRecognition()) {
    console.warn('[VOICE] Speech recognition not supported');
    onEnd();
    return;
  }
  
  try {
    if (recognition) {
      recognition.stop();
    }
    
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };
    
    recognition.onend = () => {
      onEnd();
      recognition = null;
    };
    
    recognition.onerror = (event: any) => {
      console.error('[VOICE] Speech recognition error:', event.error);
      onEnd();
      recognition = null;
    };
    
    recognition.start();
  } catch (error) {
    console.error('[VOICE] Failed to start recognition:', error);
    onEnd();
  }
};

export const stopListening = () => {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
};
