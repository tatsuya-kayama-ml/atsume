import React, { useRef, useEffect } from 'react';
import { Animated, ViewStyle, Easing } from 'react-native';

interface AnimatedViewProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale' | 'bounce';
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 300,
  style,
}) => {
  const opacity = useRef(new Animated.Value(animation === 'fadeIn' || animation.startsWith('slide') ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animation === 'slideUp' ? 20 : animation === 'slideDown' ? -20 : 0)).current;
  const translateX = useRef(new Animated.Value(animation === 'slideLeft' ? 20 : animation === 'slideRight' ? -20 : 0)).current;
  const scale = useRef(new Animated.Value(animation === 'scale' ? 0.8 : animation === 'bounce' ? 0 : 1)).current;

  useEffect(() => {
    const animationConfig = {
      duration,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    };

    switch (animation) {
      case 'fadeIn':
        Animated.timing(opacity, { ...animationConfig, toValue: 1 }).start();
        break;

      case 'slideUp':
      case 'slideDown':
        Animated.parallel([
          Animated.timing(opacity, { ...animationConfig, toValue: 1 }),
          Animated.timing(translateY, {
            ...animationConfig,
            toValue: 0,
            easing: Easing.out(Easing.back(1.2)),
          }),
        ]).start();
        break;

      case 'slideLeft':
      case 'slideRight':
        Animated.parallel([
          Animated.timing(opacity, { ...animationConfig, toValue: 1 }),
          Animated.timing(translateX, {
            ...animationConfig,
            toValue: 0,
            easing: Easing.out(Easing.back(1.2)),
          }),
        ]).start();
        break;

      case 'scale':
        Animated.parallel([
          Animated.timing(opacity, { ...animationConfig, toValue: 1 }),
          Animated.timing(scale, {
            ...animationConfig,
            toValue: 1,
            easing: Easing.out(Easing.back(1.5)),
          }),
        ]).start();
        break;

      case 'bounce':
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 120,
          delay,
          useNativeDriver: true,
        }).start();
        break;
    }
  }, [animation, delay, duration]);

  const getAnimatedStyle = (): Animated.WithAnimatedObject<ViewStyle> => {
    const animatedStyle: Animated.WithAnimatedObject<ViewStyle> = { opacity };

    if (animation === 'slideUp' || animation === 'slideDown') {
      animatedStyle.transform = [{ translateY }];
    } else if (animation === 'slideLeft' || animation === 'slideRight') {
      animatedStyle.transform = [{ translateX }];
    } else if (animation === 'scale' || animation === 'bounce') {
      animatedStyle.transform = [{ scale }];
    }

    return animatedStyle;
  };

  return (
    <Animated.View style={[getAnimatedStyle(), style]}>
      {children}
    </Animated.View>
  );
};

// Pressable wrapper with scale animation
interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  pressScale?: number;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  disabled = false,
  style,
  pressScale = 0.97,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.timing(scale, {
      toValue: pressScale,
      duration: 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, style]}
      onTouchStart={handlePressIn}
      onTouchEnd={() => {
        handlePressOut();
        if (!disabled && onPress) {
          onPress();
        }
      }}
      onTouchCancel={handlePressOut}
    >
      {children}
    </Animated.View>
  );
};

// Staggered list container
interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  animation?: 'fadeIn' | 'slideUp';
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 50,
  animation = 'slideUp',
}) => {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <AnimatedView
          key={index}
          animation={animation}
          delay={index * staggerDelay}
        >
          {child}
        </AnimatedView>
      ))}
    </>
  );
};
