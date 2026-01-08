// Web実装 - ScrollViewベースのシンプルなPagerView
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, ViewStyle, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PagerViewProps {
  style?: ViewStyle;
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children: React.ReactNode;
}

export interface PagerViewRef {
  setPage: (page: number) => void;
}

export const PagerView = forwardRef<PagerViewRef, PagerViewProps>(
  ({ style, initialPage = 0, onPageSelected, children }, ref) => {
    const scrollRef = useRef<ScrollView>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const childArray = React.Children.toArray(children);

    useImperativeHandle(ref, () => ({
      setPage: (page: number) => {
        scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
      },
    }));

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / SCREEN_WIDTH);
      if (page !== currentPage && page >= 0 && page < childArray.length) {
        setCurrentPage(page);
        onPageSelected?.({ nativeEvent: { position: page } });
      }
    };

    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={style}
        contentOffset={{ x: initialPage * SCREEN_WIDTH, y: 0 }}
      >
        {childArray.map((child, index) => (
          <View key={index} style={[styles.page, { width: SCREEN_WIDTH }]}>
            {child}
          </View>
        ))}
      </ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
});

export default PagerView;
