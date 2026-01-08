import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ticket, Calendar, MapPin, Users, Lock, ArrowLeft } from 'lucide-react-native';
import { Button, Input, Card } from '../../components/common';
import { useEventStore } from '../../stores/eventStore';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { RootStackParamList, Event } from '../../types';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JoinEvent'>;
  route: RouteProp<RootStackParamList, 'JoinEvent'>;
}

type Step = 'code' | 'confirm';

export const JoinEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialCode = route.params?.code || '';
  const [eventCode, setEventCode] = useState(initialCode);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<Step>('code');
  const [foundEvent, setFoundEvent] = useState<Event | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const { findEventByCode, joinEvent, isLoading } = useEventStore();
  const { showToast } = useToast();

  const handleSearch = async () => {
    if (!eventCode.trim()) {
      showToast('イベントコードを入力してください', 'warning');
      return;
    }

    const result = await findEventByCode(eventCode.trim().toUpperCase());

    if (!result) {
      showToast('イベントコードが見つかりません', 'error');
      return;
    }

    setFoundEvent(result.event);
    setNeedsPassword(result.needsPassword);
    setStep('confirm');
  };

  const handleJoin = async () => {
    if (!foundEvent) return;

    if (needsPassword && !password.trim()) {
      showToast('パスワードを入力してください', 'warning');
      return;
    }

    try {
      await joinEvent(foundEvent.id, eventCode, password || undefined);
      navigation.goBack();
    } catch (error: any) {
      if (error.message === 'パスワードが正しくありません') {
        showToast('パスワードが正しくありません', 'error');
      } else {
        showToast(error.message || 'イベントへの参加に失敗しました', 'error');
      }
    }
  };

  const handleBack = () => {
    setStep('code');
    setFoundEvent(null);
    setPassword('');
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
            コードは主催者からの招待メッセージに記載されています
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Step 2: イベント確認 & パスワード入力
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={20} color={colors.gray[600]} />
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>

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

            {needsPassword && (
              <View style={styles.passwordSection}>
                <View style={styles.passwordHeader}>
                  <Lock size={16} color={colors.warning} />
                  <Text style={styles.passwordLabel}>
                    このイベントはパスワードで保護されています
                  </Text>
                </View>
                <Input
                  label="パスワード"
                  placeholder="パスワードを入力"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            )}
          </Card>
        )}

        <Button
          title="参加する"
          onPress={handleJoin}
          loading={isLoading}
          fullWidth
          disabled={needsPassword && !password.trim()}
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
  passwordSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  passwordLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    fontWeight: '500',
    flex: 1,
  },
});
