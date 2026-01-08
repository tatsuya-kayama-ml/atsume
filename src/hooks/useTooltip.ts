import { useRef, useCallback, useState, useEffect } from 'react';
import { View } from 'react-native';
import { useOnboardingStore, TooltipId } from '../stores/onboardingStore';

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseTooltipReturn {
  ref: React.RefObject<View>;
  show: () => void;
  dismiss: () => void;
  isVisible: boolean;
  targetRect: TargetRect | null;
}

export const useTooltip = (tooltipId: TooltipId): UseTooltipReturn => {
  const ref = useRef<View>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const activeTooltip = useOnboardingStore((s) => s.activeTooltip);
  const setActiveTooltip = useOnboardingStore((s) => s.setActiveTooltip);
  const markTooltipAsShown = useOnboardingStore((s) => s.markTooltipAsShown);
  const shouldShowTooltip = useOnboardingStore((s) => s.shouldShowTooltip);

  const isVisible = activeTooltip === tooltipId;

  const measureAndShow = useCallback(() => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setTargetRect({ x, y, width, height });
          setActiveTooltip(tooltipId);
        }
      });
    }
  }, [tooltipId, setActiveTooltip]);

  // 初回マウント時に表示判定
  useEffect(() => {
    if (shouldShowTooltip(tooltipId)) {
      // 少し遅延させて画面遷移後に表示
      const timer = setTimeout(() => {
        measureAndShow();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [tooltipId, shouldShowTooltip, measureAndShow]);

  const show = useCallback(() => {
    if (shouldShowTooltip(tooltipId)) {
      measureAndShow();
    }
  }, [tooltipId, shouldShowTooltip, measureAndShow]);

  const dismiss = useCallback(() => {
    markTooltipAsShown(tooltipId);
    setTargetRect(null);
  }, [tooltipId, markTooltipAsShown]);

  return {
    ref,
    show,
    dismiss,
    isVisible,
    targetRect,
  };
};
