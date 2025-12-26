import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyRound, CheckCircle, ShieldCheck } from 'lucide-react-native';
import { Button, Input, Card } from '../../components/common';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .min(8, 'パスワードは8文字以上で入力してください'),
  confirmPassword: z
    .string()
    .min(1, 'パスワード（確認）を入力してください'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordScreen: React.FC = () => {
  const { updatePassword, clearPasswordRecovery, isLoading } = useAuthStore();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await updatePassword(data.password);
      setIsPasswordReset(true);
    } catch (error: any) {
      showToast(error.message || 'パスワードの更新に失敗しました', 'error');
    }
  };

  if (isPasswordReset) {
    return (
      <View style={styles.container}>
        {/* Background decoration */}
        <View style={styles.bgDecoration}>
          <View style={[styles.bgCircle, styles.bgCircleSuccess1]} />
          <View style={[styles.bgCircle, styles.bgCircleSuccess2]} />
        </View>

        <View style={[styles.successContent, { paddingTop: insets.top + 60 }]}>
          <Animated.View
            entering={FadeIn.delay(100).duration(600)}
            style={styles.successIconContainer}
          >
            <View style={styles.successIconInner}>
              <CheckCircle size={56} color={colors.white} strokeWidth={2.5} />
            </View>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(300).springify()}
            style={styles.successTitle}
          >
            パスワードを更新しました
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(400).springify()}
            style={styles.successMessage}
          >
            新しいパスワードでログインできます。{'\n'}
            セキュリティのため再ログインをお願いします。
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.delay(500).springify()}
            style={styles.successButtonContainer}
          >
            <Button
              title="ログイン画面へ"
              onPress={() => clearPasswordRecovery()}
              fullWidth
            />
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background decoration */}
      <View style={styles.bgDecoration}>
        <View style={[styles.bgCircle, styles.bgCircle1]} />
        <View style={[styles.bgCircle, styles.bgCircle2]} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with icon */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconInner}>
              <KeyRound size={32} color={colors.white} strokeWidth={2} />
            </View>
          </View>
          <Text style={styles.title}>新しいパスワードを設定</Text>
          <Text style={styles.subtitle}>
            安全なパスワードを設定してください
          </Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
        >
          <Card style={styles.formCard}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="新しいパスワード"
                  placeholder="8文字以上で入力"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="パスワード確認"
                  placeholder="もう一度入力してください"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              title="パスワードを更新"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              fullWidth
              style={styles.submitButton}
            />
          </Card>
        </Animated.View>

        {/* Security hint */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={styles.securityHint}
        >
          <ShieldCheck size={16} color={colors.gray[400]} />
          <Text style={styles.securityHintText}>
            パスワードは暗号化されて安全に保存されます
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  bgDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  bgCircle1: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: colors.primary + '08',
    top: -width * 0.3,
    right: -width * 0.2,
  },
  bgCircle2: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: colors.primary + '05',
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  bgCircleSuccess1: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: colors.success + '10',
    top: -width * 0.3,
    right: -width * 0.2,
  },
  bgCircleSuccess2: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: colors.success + '08',
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  securityHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  securityHintText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
  },
  // Success state styles
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  successButtonContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
});
