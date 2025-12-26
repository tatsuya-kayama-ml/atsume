import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle } from 'lucide-react-native';
import { Button, Input } from '../../components/common';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography } from '../../constants/theme';
import { AuthStackParamList } from '../../types';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { resetPassword, isLoading } = useAuthStore();
  const { showToast } = useToast();
  const [isEmailSent, setIsEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await resetPassword(data.email);
      setIsEmailSent(true);
    } catch (error: any) {
      showToast(error.message || 'メールの送信に失敗しました', 'error');
    }
  };

  if (isEmailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContent}>
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.iconContainer}
          >
            <CheckCircle size={48} color={colors.success} />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.delay(200).springify()}
            style={styles.successTitle}
          >
            メールを送信しました
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300).springify()}
            style={styles.successMessage}
          >
            {getValues('email')} 宛にパスワードリセット用のリンクを送信しました。{'\n'}
            メールを確認してください。
          </Animated.Text>
          <Animated.View
            entering={FadeInUp.delay(400).springify()}
            style={styles.buttonContainer}
          >
            <Button
              title="ログイン画面に戻る"
              onPress={() => navigation.navigate('Login')}
              fullWidth
              style={styles.button}
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>パスワードをお忘れですか？</Text>
          <Text style={styles.subtitle}>
            登録したメールアドレスを入力してください。
            パスワードリセット用のリンクをお送りします。
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="メールアドレス"
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Button
            title="リセットリンクを送信"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            fullWidth
          />
        </View>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.backLinkText}>← ログイン画面に戻る</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  form: {
    marginBottom: spacing.xl,
  },
  backLink: {
    alignItems: 'center',
  },
  backLinkText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  buttonContainer: {
    width: '100%',
  },
  button: {
    marginTop: spacing.md,
  },
});
