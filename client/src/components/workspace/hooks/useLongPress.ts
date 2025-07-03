import { useState, useCallback } from "react";

interface UseLongPressOptions {
  onLongPress?: () => void;
  delay?: number;
}

export const useLongPress = ({
  onLongPress,
  delay = 1000,
}: UseLongPressOptions = {}) => {
  const [pressTimer, setPressTimer] = useState<number | null>(null);

  const handleTouchStart = useCallback(() => {
    const timerId = setTimeout(() => {
      onLongPress?.();
    }, delay);
    setPressTimer(timerId);
  }, [onLongPress, delay]);

  const handleTouchMove = useCallback(() => {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
