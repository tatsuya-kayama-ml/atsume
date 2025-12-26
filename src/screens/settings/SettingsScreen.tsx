import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/common';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut, deleteAccount, updateAvatar, isLoading } = useAuthStore();
  const { showToast } = useToast();
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);

  // ユーザー情報の安全な取得
  const displayName = user?.display_name || '名前未設定';
  const email = user?.email || '';
  const initial = displayName.charAt(0) || '?';
  const avatarUrl = user?.avatar_url;

  const handleAvatarPress = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('画像を選択するには写真へのアクセス許可が必要です', 'error');
        return;
      }

      // Launch image picker
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

  const handleSignOut = async () => {
    const performSignOut = async () => {
      try {
        await signOut();
        showToast('ログアウトしました', 'info');
      } catch (error: any) {
        showToast(error.message || 'ログアウトに失敗しました', 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('ログアウトしますか？')) {
        await performSignOut();
      }
    } else {
      Alert.alert(
        'ログアウト',
        'ログアウトしますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'ログアウト',
            style: 'destructive',
            onPress: performSignOut,
          },
        ]
      );
    }
  };

  const handleDeleteAccount = async () => {
    const performDelete = async () => {
      try {
        await deleteAccount();
        showToast('アカウントを削除しました', 'info');
      } catch (error: any) {
        showToast(error.message || 'アカウント削除に失敗しました', 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('本当にアカウントを削除しますか？\n\nこの操作は取り消せません。すべてのイベントデータが削除されます。')) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'アカウント削除',
        'この操作は取り消せません。すべてのイベントデータが削除されます。\n\n本当にアカウントを削除しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除する',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.profileSection}>
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
            <Camera size={16} color={colors.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
        <Text style={styles.sectionTitle}>プロフィール</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileEdit')}
          >
            <Text style={styles.menuLabel}>表示名</Text>
            <View style={styles.menuValueRow}>
              <Text style={styles.menuValue}>{displayName}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
        <Text style={styles.sectionTitle}>通知設定</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <Text style={styles.menuLabel}>通知設定</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
        <Text style={styles.sectionTitle}>その他</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <Text style={styles.menuLabel}>利用規約</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Text style={styles.menuLabel}>プライバシーポリシー</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Contact')}
          >
            <Text style={styles.menuLabel}>お問い合わせ</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuLabel}>アプリバージョン</Text>
            <Text style={styles.menuValue}>1.0.0</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Text style={styles.menuLabel}>パスワード変更</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.dangerLabel}>アカウントを削除</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.logoutSection}>
        <Button
          title="ログアウト"
          onPress={handleSignOut}
          variant="outline"
          fullWidth
          loading={isLoading}
        />
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  profileSection: {
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.white,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray[700],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  displayName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[500],
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuLabel: {
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
  },
  dangerLabel: {
    fontSize: typography.fontSize.base,
    color: colors.error,
  },
  menuValue: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
  },
  menuValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  menuArrow: {
    fontSize: typography.fontSize.xl,
    color: colors.gray[400],
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: spacing.md,
  },
  logoutSection: {
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
