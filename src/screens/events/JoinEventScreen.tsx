import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ticket } from 'lucide-react-native';
import { Button, Input } from '../../components/common';
import { useEventStore } from '../../stores/eventStore';
import { useToast } from '../../contexts/ToastContext';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { RootStackParamList } from '../../types';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JoinEvent'>;
  route: RouteProp<RootStackParamList, 'JoinEvent'>;
}

export const JoinEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialCode = route.params?.code || '';
  const [eventCode, setEventCode] = useState(initialCode);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const { joinEventByCode, isLoading } = useEventStore();
  const { showToast } = useToast();

  const handleJoin = async () => {
    if (!eventCode.trim()) {
      showToast('イベントコードを入力してください', 'warning');
      return;
    }

    try {
      await joinEventByCode(eventCode.trim().toUpperCase(), password || undefined);
      showToast('イベントに参加しました', 'success');
      navigation.goBack();
    } catch (error: any) {
      if (error.message === 'パスワードが正しくありません') {
        setNeedsPassword(true);
        showToast('このイベントにはパスワードが設定されています', 'warning');
      } else {
        showToast(error.message || 'イベントへの参加に失敗しました', 'error');
      }
    }
  };

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

          {needsPassword && (
            <Input
              label="パスワード"
              placeholder="パスワードを入力"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}
        </View>

        <Button
          title="参加する"
          onPress={handleJoin}
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
});
