import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { WheelPicker } from './WheelPicker';
import { colors, typography, spacing, borderRadius } from '../../constants/theme';

interface DateTimePickerProps {
  visible: boolean;
  mode: 'date' | 'time';
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  visible,
  mode,
  value,
  onConfirm,
  onCancel,
}) => {
  const [tempDate, setTempDate] = useState(value);

  // Reset tempDate when modal opens
  React.useEffect(() => {
    if (visible) {
      setTempDate(value);
    }
  }, [visible, value]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const items = [];
    for (let i = currentYear; i <= currentYear + 5; i++) {
      items.push({ label: `${i}年`, value: i });
    }
    return items;
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}月`,
      value: i + 1,
    }));
  }, []);

  const days = useMemo(() => {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: `${i + 1}日`,
      value: i + 1,
    }));
  }, [tempDate.getFullYear(), tempDate.getMonth()]);

  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      label: i.toString().padStart(2, '0'),
      value: i,
    }));
  }, []);

  const minutes = useMemo(() => {
    // 30分単位で選択
    return [
      { label: '00', value: 0 },
      { label: '30', value: 30 },
    ];
  }, []);

  const handleYearChange = (year: number | string) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(year as number);
    setTempDate(newDate);
  };

  const handleMonthChange = (month: number | string) => {
    const newDate = new Date(tempDate);
    newDate.setMonth((month as number) - 1);
    setTempDate(newDate);
  };

  const handleDayChange = (day: number | string) => {
    const newDate = new Date(tempDate);
    newDate.setDate(day as number);
    setTempDate(newDate);
  };

  const handleHourChange = (hour: number | string) => {
    const newDate = new Date(tempDate);
    newDate.setHours(hour as number);
    setTempDate(newDate);
  };

  const handleMinuteChange = (minute: number | string) => {
    const newDate = new Date(tempDate);
    newDate.setMinutes(minute as number);
    setTempDate(newDate);
  };

  const handleConfirm = () => {
    onConfirm(tempDate);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>
            {mode === 'date' ? '日付を選択' : '時間を選択'}
          </Text>

          <View style={styles.pickersContainer}>
            {mode === 'date' ? (
              <>
                <WheelPicker
                  items={years}
                  selectedValue={tempDate.getFullYear()}
                  onValueChange={handleYearChange}
                  width={90}
                />
                <WheelPicker
                  items={months}
                  selectedValue={tempDate.getMonth() + 1}
                  onValueChange={handleMonthChange}
                  width={70}
                />
                <WheelPicker
                  items={days}
                  selectedValue={tempDate.getDate()}
                  onValueChange={handleDayChange}
                  width={70}
                />
              </>
            ) : (
              <>
                <WheelPicker
                  items={hours}
                  selectedValue={tempDate.getHours()}
                  onValueChange={handleHourChange}
                  width={80}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <WheelPicker
                  items={minutes}
                  selectedValue={tempDate.getMinutes() < 15 ? 0 : tempDate.getMinutes() < 45 ? 30 : 0}
                  onValueChange={handleMinuteChange}
                  width={80}
                />
              </>
            )}
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>確定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  pickersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timeSeparator: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '600',
    color: colors.gray[900],
    marginHorizontal: spacing.sm,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.gray[700],
    fontWeight: '600',
    fontSize: typography.fontSize.base,
  },
  confirmButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: typography.fontSize.base,
  },
});
