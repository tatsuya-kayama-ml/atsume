import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input } from '../../components/common';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

const profileSchema = z.object({
  display_name: z
    .string()
    .min(1, '表示名を入力してください')
    .max(10, '表示名は10文字以内で入力してください')
    .regex(/^[a-zA-Z0-9ぁ-んァ-ヶー一-龯々]+$/, '絵文字や記号は使用できません'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateProfile, updateAvatar, isLoading } = useAuthStore();
  const { showToast } = useToast();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: user?.display_name || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      showToast('プロフィールを更新しました', 'success');
      navigation.goBack();
    } catch (error: any) {
      showToast(error.message || 'プロフィールの更新に失敗しました', 'error');
    }
  };

  const handleAvatarPress = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('画像を選択するには写真へのアクセス許可が必要です', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingAvatar(true);
        try {
          await updateAvatar(result.assets[0].uri);
          showToast('プロフィール画像を更新しました', 'success');
        } catch (error: any) {
          showToast(error.message || 'プロフィール画像の更新に失敗しました', 'error');
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (error: any) {
      showToast('画像の選択に失敗しました', 'error');
    }
  };

  const initial = user?.display_name?.charAt(0) || '?';
  const avatarUrl = user?.avatar_url;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
          >
            <View style={styles.avatarContainer}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="large" color={colors.white} />
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <View style={styles.cameraIconContainer}>
              <Camera size={18} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>
            タップして画像を変更
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formSection}>
          <View style={styles.formCard}>
            <Controller
              control={control}
              name="display_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="表示名"
                  placeholder="あなたの名前"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.display_name?.message}
                  maxLength={50}
                />
              )}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.buttonSection}>
          <Button
            title="保存"
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
  avatarSection: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: 'bold',
    color: colors.white,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[700],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarHint: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
  formSection: {
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  buttonSection: {
    padding: spacing.lg,
  },
});
