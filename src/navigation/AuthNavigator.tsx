import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen, SignUpScreen, ForgotPasswordScreen, ResetPasswordScreen } from '../screens/auth';
import { TermsOfServiceScreen, PrivacyPolicyScreen } from '../screens/settings';
import { AuthStackParamList } from '../types';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{
          headerShown: true,
          title: '利用規約',
          headerTintColor: colors.primary,
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerShown: true,
          title: 'プライバシーポリシー',
          headerTintColor: colors.primary,
        }}
      />
    </Stack.Navigator>
  );
};
