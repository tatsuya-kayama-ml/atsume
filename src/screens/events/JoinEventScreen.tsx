import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ticket, Calendar, MapPin, Users, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { Button, Input, Card } from '../../components/common';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography } from '../../constants/theme';
import { RootStackParamList, Event } from '../../types';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JoinEvent'>;
  route: RouteProp<RootStackParamList, 'JoinEvent'>;
}

type Step = 'code' | 'confirm' | 'success';

export const JoinEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialCode = route.params?.code || '';
  const [eventCode, setEventCode] = useState(initialCode);
  const [step, setStep] = useState<Step>(initialCode ? 'confirm' : 'code');
  const [foundEvent, setFoundEvent] = useState<Event | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSearching, setIsSearching] = useState(!!initialCode);
  const { findEventByCode, joinEvent, isLoading } = useEventStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  // URLパラメータからコードが渡された場合、自動でイベントを検索
  useEffect(() => {
    if (initialCode) {
      handleSearchByCode(initialCode);
    }
  }, [initialCode]);

  const handleSearchByCode = async (code: string) => {
    setIsSearching(true);
    const result = await findEventByCode(code.trim().toUpperCase());

    if (!result) {
      showToast('イベントコードが見つかりません', 'error');
      setStep('code');
      setIsSearching(false);
      return;
    }

    setFoundEvent(result.event);
    setStep('confirm');
    setIsSearching(false);
  };

  const handleSearch = async () => {
    if (!eventCode.trim()) {
      showToast('イベントコードを入力してください', 'warning');
      return;
    }

    await handleSearchByCode(eventCode);
  };

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
        // 参加済みの場合はイベント詳細に遷移
        navigation.replace('EventDetail', { eventId: foundEvent.id });
      } else {
        showToast(error.message || 'イベントへの参加に失敗しました', 'error');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleBack = () => {
    setStep('code');
    setFoundEvent(null);
    setEventCode('');
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

  // ローディング中（URLからのコード検索）
  if (isSearching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>イベントを検索しています...</Text>
      </View>
    );
  }

  // Step 1: イベントコード入力
  if (step === 'code') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ticket size={40} color={colors.primary} />
          </View>

          <Text style={styles.title}>イベントに参加</Text>
          <Text style={styles.subtitle}>
            主催者から共有されたイベントコードを入力してください
          </Text>

          <View style={styles.inputContainer}>
            <Input
              label="イベントコード"
              placeholder="例: ABC123"
              value={eventCode}
              onChangeText={(text) => setEventCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              containerStyle={styles.codeInput}
            />
          </View>

          <Button
            title="次へ"
            onPress={handleSearch}
            loading={isLoading}
            fullWidth
            disabled={!eventCode.trim()}
          />

          <Text style={styles.hint}>
            コードは主催者からの招待リンクまたはメッセージに記載されています
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Step 2: イベント確認
  if (step === 'confirm') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {!initialCode && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={20} color={colors.gray[600]} />
              <Text style={styles.backButtonText}>戻る</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.title}>イベント確認</Text>
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
      </KeyboardAvoidingView>
    );
  }

  // Step 3: 参加成功
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    marginTop: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    marginLeft: spacing.xs,
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
  inputContainer: {
    marginBottom: spacing.lg,
  },
  codeInput: {
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: spacing.lg,
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
