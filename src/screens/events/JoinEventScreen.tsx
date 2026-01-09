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
import { Ticket, Calendar, MapPin, Users, Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { Button, Input, Card } from '../../components/common';
import { useEventStore } from '../../stores/eventStore';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { RootStackParamList, Event } from '../../types';
import { supabase } from '../../services/supabase';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JoinEvent'>;
  route: RouteProp<RootStackParamList, 'JoinEvent'>;
}

type Step = 'code' | 'confirm' | 'email' | 'sent';

// Get redirect URL for magic link
const getMagicLinkRedirectUrl = (eventId: string, eventCode: string): string => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/join-event-callback?eventId=${eventId}&code=${eventCode}`
      : `http://localhost:8081/join-event-callback?eventId=${eventId}&code=${eventCode}`;
  }
  return `atsume://join-event-callback?eventId=${eventId}&code=${eventCode}`;
};

export const JoinEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialCode = route.params?.code || '';
  const [eventCode, setEventCode] = useState(initialCode);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('code');
  const [foundEvent, setFoundEvent] = useState<Event | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { findEventByCode, isLoading } = useEventStore();
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
    setStep('confirm');
  };

  const handleProceedToEmail = () => {
    setStep('email');
  };

  const handleSendMagicLink = async () => {
    if (!foundEvent) return;

    if (!email.trim()) {
      showToast('メールアドレスを入力してください', 'warning');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('有効なメールアドレスを入力してください', 'error');
      return;
    }

    setIsSendingEmail(true);

    try {
      const redirectUrl = getMagicLinkRedirectUrl(foundEvent.id, eventCode);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            event_id: foundEvent.id,
            event_code: eventCode,
            action: 'join_event',
          },
        },
      });

      if (error) throw error;

      setStep('sent');
    } catch (error: any) {
      showToast(error.message || 'メール送信に失敗しました', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('code');
      setFoundEvent(null);
    } else if (step === 'email') {
      setStep('confirm');
      setEmail('');
    } else if (step === 'sent') {
      setStep('email');
    }
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

  // Step 2: イベント確認
  if (step === 'confirm') {
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
            </Card>
          )}

          <Button
            title="参加する"
            onPress={handleProceedToEmail}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Step 3: メールアドレス入力
  if (step === 'email') {
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

          <View style={styles.iconContainer}>
            <Mail size={40} color={colors.primary} />
          </View>

          <Text style={styles.title}>メールアドレスを入力</Text>
          <Text style={styles.subtitle}>
            参加確認のためのリンクをメールでお送りします
          </Text>

          <View style={styles.inputContainer}>
            <Input
              label="メールアドレス"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={styles.emailInput}
            />
          </View>

          <Button
            title="確認メールを送信"
            onPress={handleSendMagicLink}
            loading={isSendingEmail}
            fullWidth
            disabled={!email.trim()}
          />

          <Text style={styles.hint}>
            メールに届くリンクをクリックすると参加が確定します
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Step 4: メール送信完了
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, styles.successIcon]}>
          <CheckCircle size={40} color={colors.success} />
        </View>

        <Text style={styles.title}>メールを送信しました</Text>
        <Text style={styles.subtitle}>
          {email} に確認メールを送信しました。{'\n'}
          メール内のリンクをクリックして参加を確定してください。
        </Text>

        <Card variant="default" style={styles.infoCard}>
          <Text style={styles.infoTitle}>メールが届かない場合</Text>
          <Text style={styles.infoText}>
            • 迷惑メールフォルダをご確認ください{'\n'}
            • メールアドレスが正しいかご確認ください{'\n'}
            • 数分経っても届かない場合は再送信してください
          </Text>
        </Card>

        <Button
          title="メールを再送信"
          onPress={handleSendMagicLink}
          loading={isSendingEmail}
          fullWidth
          variant="outline"
        />

        <TouchableOpacity
          style={styles.changeEmailButton}
          onPress={handleBack}
        >
          <Text style={styles.changeEmailText}>
            別のメールアドレスを使用する
          </Text>
        </TouchableOpacity>

        <Button
          title="ホームに戻る"
          onPress={() => navigation.goBack()}
          fullWidth
          variant="ghost"
          style={styles.homeButton}
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
  emailInput: {
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
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.gray[50],
  },
  infoTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    lineHeight: typography.fontSize.sm * 1.6,
  },
  changeEmailButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  changeEmailText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  homeButton: {
    marginTop: spacing.sm,
  },
});
