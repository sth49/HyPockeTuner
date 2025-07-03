import { useState, useCallback } from "react";

export const useLongPress = (onLongPress: () => void, delay = 1000) => {
  const [pressTimer, setPressTimer] = useState<number | null>(null);
  const [isScroll, setIsScroll] = useState(false);

  const handleTouchStart = useCallback(() => {
    setPressTimer(
      setTimeout(() => {
        if (!isScroll) {
          onLongPress();
        }
      }, delay)
    );
  }, [isScroll, onLongPress, delay]);

  const handleTouchMove = useCallback(() => {
    setIsScroll(true);
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
    }
  }, [pressTimer]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
    }
    setIsScroll(false);
  }, [pressTimer]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
