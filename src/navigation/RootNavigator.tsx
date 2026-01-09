import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigatorWithTimer } from './MainNavigator';
import { EventCreateScreen, EventDetailScreen, EventEditScreen, JoinEventScreen } from '../screens/events';
import { TermsOfServiceScreen, PrivacyPolicyScreen, ProfileEditScreen, ChangePasswordScreen, ContactScreen, NotificationSettingsScreen, FAQScreen, EmailSettingsScreen } from '../screens/settings';
import { ResetPasswordScreen } from '../screens/auth';
import { OnboardingScreen } from '../screens/onboarding';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { supabase } from '../services/supabase';
import { logger } from '../utils';
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
  prefixes: [Linking.createURL('/'), 'atsume://', 'https://atsume.vercel.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: 'reset-password',
        },
      },
      Main: 'Main',
      EventDetail: {
        path: 'EventDetail/:eventId',
        screens: {
          Info: 'Info',
          Participants: 'Participants',
          Payment: 'Payment',
          Teams: 'Teams',
          Matches: 'Matches',
          Stats: 'Stats',
        },
      },
      EventCreate: 'EventCreate',
      EventEdit: 'EventEdit/:eventId',
      JoinEvent: 'event/:code',
      TermsOfService: 'TermsOfService',
      PrivacyPolicy: 'PrivacyPolicy',
      ProfileEdit: 'ProfileEdit',
      ChangePassword: 'ChangePassword',
      FAQ: 'FAQ',
      Contact: 'Contact',
      NotificationSettings: 'NotificationSettings',
      EmailSettings: 'EmailSettings',
    },
  },
};

export const RootNavigator: React.FC = () => {
  const { user, isLoading, isInitialized, isPasswordRecovery, initialize } = useAuthStore();
  const hasCompletedWalkthrough = useOnboardingStore((s) => s.hasCompletedWalkthrough);
  const isNewUser = useOnboardingStore((s) => s.isNewUser);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    initialize();
  }, []);

  // Handle deep link for password reset
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      logger.log('[Auth] Deep link received:', url);

      // Check if URL contains auth tokens (password reset callback)
      // Supabase sends tokens in URL fragment: #access_token=...&refresh_token=...&type=recovery
      if (url.includes('access_token') && url.includes('type=recovery')) {
        try {
          // Parse tokens from URL
          // URL format: atsume://reset-password#access_token=xxx&refresh_token=xxx&type=recovery
          const hashIndex = url.indexOf('#');
          if (hashIndex === -1) return;

          const fragment = url.substring(hashIndex + 1);
          const params = new URLSearchParams(fragment);

          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            logger.log('[Auth] Setting session from password reset link');

            // Set session using tokens from URL
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              logger.error('[Auth] Failed to set session from deep link:', error);
            } else {
              logger.log('[Auth] Session set successfully from password reset link');
            }
          }
        } catch (error) {
          logger.error('[Auth] Error handling deep link:', error);
        }
      }
    };

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then(handleDeepLink);

    // Handle URL changes (app already open)
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
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
          isNewUser && !hasCompletedWalkthrough ? (
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
          ) : (
          <>
            <Stack.Screen name="Main" component={MainNavigatorWithTimer} />
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
              name="FAQ"
              component={FAQScreen}
              options={{
                ...modalScreenOptions,
                title: 'よくある質問',
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
            <Stack.Screen
              name="EmailSettings"
              component={EmailSettingsScreen}
              options={{
                ...modalScreenOptions,
                title: 'メールアドレス',
              }}
            />
          </>
          )
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
