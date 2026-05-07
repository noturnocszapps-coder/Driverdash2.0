/**
 * Hook para disparar sons de feedback de interface (UX Sound Design).
 * Utiliza sons sintéticos ou bipes curtos de alta frequência.
 */
export const useSound = () => {
    const playSound = (type: 'success' | 'error' | 'click' | 'start') => {
      // In a real app, we would load audio files.
      // For this environment, we can use the Web Audio API to generate beeps.
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
  
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
  
        if (type === 'start') {
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'success') {
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(1320, audioCtx.currentTime); // E6
          gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'click') {
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'error') {
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
          oscillator.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.3);
        }
      } catch (e) {
        // Silently fail if AudioContext is not supported/blocked
        console.warn('Audio feedback blocked by browser policy');
      }
    };
  
    return { playSound };
  };
