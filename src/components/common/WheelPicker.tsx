import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

interface WheelPickerProps {
  items: { label: string; value: number | string }[];
  selectedValue: number | string;
  onValueChange: (value: number | string) => void;
  width?: number;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedValue,
  onValueChange,
  width = 80,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const selectedIndex = items.findIndex((item) => item.value === selectedValue);

  useEffect(() => {
    if (scrollViewRef.current && selectedIndex >= 0) {
      scrollViewRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, []);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

    if (items[clampedIndex]) {
      onValueChange(items[clampedIndex].value);

      // Web: Snap to position manually since snapToInterval doesn't work
      if (Platform.OS === 'web' && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: clampedIndex * ITEM_HEIGHT,
          animated: true,
        });
      }
    }
  };

  const handleItemPress = (item: { label: string; value: number | string }, index: number) => {
    onValueChange(item.value);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: true,
      });
    }
  };

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.selectedIndicator} />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={Platform.OS !== 'web' ? ITEM_HEIGHT : undefined}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
      >
        {items.map((item, index) => {
          const isSelected = item.value === selectedValue;
          return (
            <TouchableOpacity
              key={`${item.value}-${index}`}
              style={styles.item}
              onPress={() => handleItemPress(item, index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.selectedItemText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  selectedIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    zIndex: -1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: typography.fontSize.lg,
    color: colors.gray[400],
  },
  selectedItemText: {
    color: colors.gray[900],
    fontWeight: '600',
  },
});
