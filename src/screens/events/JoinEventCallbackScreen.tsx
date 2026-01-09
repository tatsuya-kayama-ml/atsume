import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { Button } from '../../components/common';
import { useEventStore } from '../../stores/eventStore';
import { colors, spacing, typography } from '../../constants/theme';
import { RootStackParamList } from '../../types';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JoinEventCallback'>;
  route: RouteProp<RootStackParamList, 'JoinEventCallback'>;
}

type Status = 'loading' | 'success' | 'error';

export const JoinEventCallbackScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params || {};
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const { joinEvent, fetchEventById, currentEvent } = useEventStore();

  useEffect(() => {
    const processJoin = async () => {
      if (!eventId) {
        setStatus('error');
        setErrorMessage('イベント情報が見つかりません');
        return;
      }

      try {
        // イベント情報を取得
        await fetchEventById(eventId);

        // イベントに参加
        await joinEvent(eventId);
        setStatus('success');
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || 'イベントへの参加に失敗しました');
      }
    };

    processJoin();
  }, [eventId]);

  const handleGoToEvent = () => {
    if (eventId) {
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          { name: 'EventDetail', params: { eventId } },
        ],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>イベントに参加しています...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <View style={[styles.iconContainer, styles.errorIcon]}>
          <XCircle size={48} color={colors.error} />
        </View>
        <Text style={styles.title}>参加できませんでした</Text>
        <Text style={styles.message}>{errorMessage}</Text>
        <Button
          title="ホームに戻る"
          onPress={handleGoHome}
          fullWidth
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, styles.successIcon]}>
        <CheckCircle size={48} color={colors.success} />
      </View>
      <Text style={styles.title}>参加完了!</Text>
      <Text style={styles.message}>
        {currentEvent?.name || 'イベント'}に参加しました
      </Text>
      <Button
        title="イベントを見る"
        onPress={handleGoToEvent}
        fullWidth
        style={styles.button}
      />
      <Button
        title="ホームに戻る"
        onPress={handleGoHome}
        fullWidth
        variant="outline"
        style={styles.secondaryButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successIcon: {
    backgroundColor: colors.success + '20',
  },
  errorIcon: {
    backgroundColor: colors.error + '20',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.fontSize.base * 1.5,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    marginTop: spacing.lg,
  },
  button: {
    marginBottom: spacing.md,
  },
  secondaryButton: {
    marginBottom: spacing.md,
  },
});
