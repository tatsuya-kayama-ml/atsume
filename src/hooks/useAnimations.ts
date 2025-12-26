import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { animation } from '../constants/theme';

/**
 * Hook for fade-in animation
 */
export const useFadeIn = (delay: number = 0, duration: number = animation.normal) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [delay, duration]);

  return { opacity };
};

/**
 * Hook for slide-up animation with fade
 */
export const useSlideUp = (delay: number = 0, duration: number = animation.normal) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration]);

  return { opacity, transform: [{ translateY }] };
};

/**
 * Hook for scale animation (press feedback)
 */
export const useScalePress = (
  pressedScale: number = 0.97,
  duration: number = animation.fast
) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scale, {
      toValue: pressedScale,
      duration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return {
    scale,
    transform: [{ scale }],
    onPressIn,
    onPressOut,
  };
};

/**
 * Hook for staggered list animation
 */
export const useStaggeredList = (itemCount: number, staggerDelay: number = 50) => {
  const animations = useRef(
    Array.from({ length: itemCount }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(15),
    }))
  ).current;

  useEffect(() => {
    const animationSequence = animations.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 300,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 300,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(staggerDelay, animationSequence).start();
  }, [itemCount, staggerDelay]);

  return animations.map((anim) => ({
    opacity: anim.opacity,
    transform: [{ translateY: anim.translateY }],
  }));
};

/**
 * Hook for pulse animation (attention grabber)
 */
export const usePulse = (minScale: number = 0.95, maxScale: number = 1.05) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [minScale, maxScale]);

  return { scale, transform: [{ scale }] };
};

/**
 * Hook for shake animation (error feedback)
 */
export const useShake = () => {
  const translateX = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  return { translateX, transform: [{ translateX }], shake };
};

/**
 * Hook for bounce animation
 */
export const useBounce = () => {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  return { scale, transform: [{ scale }] };
};

/**
 * Hook for progress bar animation
 */
export const useProgress = (targetValue: number, duration: number = 800) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: targetValue,
      duration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false, // Width animation can't use native driver
    }).start();
  }, [targetValue, duration]);

  return progress;
};

/**
 * Hook for rotating animation (loading spinner)
 */
export const useRotate = () => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    spin.start();

    return () => spin.stop();
  }, []);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return { rotate, transform: [{ rotate }] };
};
