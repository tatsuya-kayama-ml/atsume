import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Calendar, MapPin, Users, CheckCircle, AlertCircle } from 'lucide-react-native';
import { Button, Card } from '../../components/common';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography } from '../../constants/theme';
import { RootStackParamList, Event } from '../../types';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JoinEvent'>;
  route: RouteProp<RootStackParamList, 'JoinEvent'>;
}

type Step = 'loading' | 'confirm' | 'success' | 'error';

export const JoinEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const code = route.params?.code;
  const [step, setStep] = useState<Step>('loading');
  const [foundEvent, setFoundEvent] = useState<Event | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { findEventByCode, joinEvent } = useEventStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  // 招待リンクからコードを取得してイベントを検索
  useEffect(() => {
    const searchEvent = async () => {
      if (!code) {
        setErrorMessage('招待リンクが無効です');
        setStep('error');
        return;
      }

      const result = await findEventByCode(code.trim().toUpperCase());

      if (!result) {
        setErrorMessage('イベントが見つかりません');
        setStep('error');
        return;
      }

      setFoundEvent(result.event);
      setStep('confirm');
    };

    searchEvent();
  }, [code]);

  const handleJoin = async () => {
    if (!foundEvent) return;

    if (!user) {
      showToast('参加するにはログインが必要です', 'warning');
      navigation.navigate('Auth');
      return;
    }

    setIsJoining(true);

    try {
      await joinEvent(foundEvent.id);
      setStep('success');
    } catch (error: any) {
      if (error.message === 'すでにこのイベントに参加しています') {
        showToast('すでにこのイベントに参加しています', 'info');
        navigation.replace('EventDetail', { eventId: foundEvent.id });
      } else {
        showToast(error.message || 'イベントへの参加に失敗しました', 'error');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToEvent = () => {
    if (foundEvent) {
      navigation.replace('EventDetail', { eventId: foundEvent.id });
    }
  };

  const handleGoHome = () => {
    navigation.goBack();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ローディング中
  if (step === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>イベントを読み込んでいます...</Text>
      </View>
    );
  }

  // エラー
  if (step === 'error') {
    return (
      <View style={styles.centerContainer}>
        <View style={[styles.iconContainer, styles.errorIcon]}>
          <AlertCircle size={40} color={colors.error} />
        </View>
        <Text style={styles.title}>エラー</Text>
        <Text style={styles.subtitle}>{errorMessage}</Text>
        <Button
          title="ホームに戻る"
          onPress={handleGoHome}
          fullWidth
          style={styles.button}
        />
      </View>
    );
  }

  // イベント確認
  if (step === 'confirm') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>イベントに参加</Text>
        <Text style={styles.subtitle}>
          以下のイベントに参加しますか？
        </Text>

        {foundEvent && (
          <Card variant="elevated" style={styles.eventCard}>
            <Text style={styles.eventName}>{foundEvent.name}</Text>

            <View style={styles.eventInfo}>
              <View style={styles.eventInfoRow}>
                <Calendar size={16} color={colors.gray[500]} />
                <Text style={styles.eventInfoText}>
                  {formatDate(foundEvent.date_time)}
                </Text>
              </View>

              <View style={styles.eventInfoRow}>
                <MapPin size={16} color={colors.gray[500]} />
                <Text style={styles.eventInfoText}>{foundEvent.location}</Text>
              </View>

              {foundEvent.capacity && (
                <View style={styles.eventInfoRow}>
                  <Users size={16} color={colors.gray[500]} />
                  <Text style={styles.eventInfoText}>
                    定員: {foundEvent.capacity}人
                  </Text>
                </View>
              )}

              {foundEvent.fee > 0 && (
                <Text style={styles.eventFee}>
                  参加費: ¥{foundEvent.fee.toLocaleString()}
                </Text>
              )}
            </View>
          </Card>
        )}

        <Button
          title="参加する"
          onPress={handleJoin}
          loading={isJoining}
          fullWidth
        />

        {!user && (
          <Text style={styles.loginHint}>
            参加するにはログインが必要です
          </Text>
        )}
      </View>
    );
  }

  // 参加成功
  return (
    <View style={styles.centerContainer}>
      <View style={[styles.iconContainer, styles.successIcon]}>
        <CheckCircle size={40} color={colors.success} />
      </View>

      <Text style={styles.title}>参加完了!</Text>
      <Text style={styles.subtitle}>
        {foundEvent?.name || 'イベント'}に参加しました
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
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
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  loginHint: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  eventCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  eventName: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  eventInfo: {
    gap: spacing.sm,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    flex: 1,
  },
  eventFee: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  button: {
    marginBottom: spacing.md,
  },
});
