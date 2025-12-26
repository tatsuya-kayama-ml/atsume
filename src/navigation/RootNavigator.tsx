import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { EventCreateScreen, EventDetailScreen, EventEditScreen, JoinEventScreen } from '../screens/events';
import { TermsOfServiceScreen, PrivacyPolicyScreen, ProfileEditScreen, ChangePasswordScreen, ContactScreen, NotificationSettingsScreen } from '../screens/settings';
import { ResetPasswordScreen } from '../screens/auth';
import { useAuthStore } from '../stores/authStore';
import { RootStackParamList } from '../types';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
  animationDuration: 250,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

const modalScreenOptions: NativeStackNavigationOptions = {
  headerShown: true,
  presentation: 'card',
  animation: Platform.OS === 'ios' ? 'slide_from_bottom' : 'slide_from_right',
  headerBackTitle: '戻る',
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontWeight: '600',
  },
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: colors.white,
  },
};

// Deep linking configuration
const linking = {
  prefixes: [Linking.createURL('/'), 'atsume://'],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: 'reset-password',
        },
      },
      JoinEvent: 'event/:code',
    },
  },
};

export const RootNavigator: React.FC = () => {
  const { user, isLoading, isInitialized, isPasswordRecovery, initialize } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    initialize();
  }, []);

  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={screenOptions}>
        {isPasswordRecovery ? (
          // Password recovery mode - show reset password screen
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{
              ...modalScreenOptions,
              title: 'パスワード再設定',
              headerLeft: () => null,
              gestureEnabled: false,
            }}
          />
        ) : user ? (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen
              name="EventCreate"
              component={EventCreateScreen}
              options={{
                ...modalScreenOptions,
                title: 'イベント作成',
              }}
            />
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{
                ...modalScreenOptions,
                title: 'イベント詳細',
              }}
            />
            <Stack.Screen
              name="JoinEvent"
              component={JoinEventScreen}
              options={{
                ...modalScreenOptions,
                title: 'イベントに参加',
              }}
            />
            <Stack.Screen
              name="EventEdit"
              component={EventEditScreen}
              options={{
                ...modalScreenOptions,
                title: 'イベント編集',
              }}
            />
            <Stack.Screen
              name="TermsOfService"
              component={TermsOfServiceScreen}
              options={{
                ...modalScreenOptions,
                title: '利用規約',
              }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{
                ...modalScreenOptions,
                title: 'プライバシーポリシー',
              }}
            />
            <Stack.Screen
              name="ProfileEdit"
              component={ProfileEditScreen}
              options={{
                ...modalScreenOptions,
                title: 'プロフィール編集',
              }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{
                ...modalScreenOptions,
                title: 'パスワード変更',
              }}
            />
            <Stack.Screen
              name="Contact"
              component={ContactScreen}
              options={{
                ...modalScreenOptions,
                title: 'お問い合わせ',
              }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{
                ...modalScreenOptions,
                title: '通知設定',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});
