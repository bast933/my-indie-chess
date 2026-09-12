import { useRef, useCallback } from 'react';

const SOUNDS = {
  move: '/sounds/move.mp3',
  capture: '/sounds/capture.mp3',
};

export function useChessSound() {
  const audioRefs = useRef({});

  const playSound = useCallback((type = 'move') => {
    const soundUrl = SOUNDS[type] || SOUNDS.move;
    
    // Create or reuse audio element
    if (!audioRefs.current[type]) {
      audioRefs.current[type] = new Audio(soundUrl);
      audioRefs.current[type].volume = 0.5;
    }
    
    const audio = audioRefs.current[type];
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }, []);

  return { playSound };
}
