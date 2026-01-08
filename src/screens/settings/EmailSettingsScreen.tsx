import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mail } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input } from '../../components/common';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

const emailSchema = z.object({
  newEmail: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
});

type EmailFormData = z.infer<typeof emailSchema>;

export const EmailSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateEmail, isLoading } = useAuthStore();
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: '',
    },
  });

  const onSubmit = async (data: EmailFormData) => {
    try {
      await updateEmail(data.newEmail);
      showToast('確認メールを送信しました。メールを確認して変更を完了してください。', 'success');
      navigation.goBack();
    } catch (error: any) {
      showToast(error.message || 'メールアドレスの変更に失敗しました', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.iconContainer}>
            <Mail size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>メールアドレス</Text>
          <Text style={styles.subtitle}>
            現在のメールアドレスの確認と変更ができます。
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.currentEmailSection}>
          <Text style={styles.sectionTitle}>現在のメールアドレス</Text>
          <View style={styles.currentEmailCard}>
            <Text style={styles.currentEmail}>{user?.email}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.formSection}>
          <Text style={styles.sectionTitle}>メールアドレスの変更</Text>
          <View style={styles.formCard}>
            <Controller
              control={control}
              name="newEmail"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="新しいメールアドレス"
                  placeholder="example@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.newEmail?.message}
                />
              )}
            />
            <Text style={styles.helperText}>
              変更後、新しいメールアドレスに確認メールが送信されます。
              メール内のリンクをクリックすると変更が完了します。
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.buttonSection}>
          <Button
            title="変更する"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={!isDirty}
            fullWidth
          />
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.6,
  },
  currentEmailSection: {
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[500],
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  currentEmailCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  currentEmail: {
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
  },
  formSection: {
    padding: spacing.md,
    paddingTop: 0,
    marginTop: spacing.md,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.sm,
    lineHeight: typography.fontSize.xs * 1.6,
  },
  buttonSection: {
    padding: spacing.lg,
  },
});
