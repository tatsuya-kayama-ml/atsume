import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

export const PrivacyPolicyScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.lastUpdated}>最終更新日: 2025年12月26日</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. はじめに</Text>
          <Text style={styles.paragraph}>
            ATSUME（以下「本アプリ」）は、ユーザーの皆様のプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーは、本アプリにおける個人情報の取り扱いについて説明します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 収集する情報</Text>
          <Text style={styles.paragraph}>
            本アプリでは、以下の情報を収集することがあります：
          </Text>
          <Text style={styles.subTitle}>2.1 アカウント情報</Text>
          <Text style={styles.listItem}>・メールアドレス</Text>
          <Text style={styles.listItem}>・表示名</Text>
          <Text style={styles.listItem}>・パスワード（暗号化して保存）</Text>

          <Text style={styles.subTitle}>2.2 イベント関連情報</Text>
          <Text style={styles.listItem}>・作成したイベント情報</Text>
          <Text style={styles.listItem}>・参加したイベント情報</Text>
          <Text style={styles.listItem}>・出欠状況・支払い状況</Text>
          <Text style={styles.listItem}>・スキルレベル・性別（任意）</Text>

          <Text style={styles.subTitle}>2.3 利用情報</Text>
          <Text style={styles.listItem}>・アプリの利用履歴</Text>
          <Text style={styles.listItem}>・デバイス情報</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 情報の利用目的</Text>
          <Text style={styles.paragraph}>
            収集した情報は、以下の目的で利用します：
          </Text>
          <Text style={styles.listItem}>・本アプリのサービス提供</Text>
          <Text style={styles.listItem}>・ユーザー認証とアカウント管理</Text>
          <Text style={styles.listItem}>・イベントの作成・参加・管理機能の提供</Text>
          <Text style={styles.listItem}>・通知の送信</Text>
          <Text style={styles.listItem}>・サービスの改善と新機能の開発</Text>
          <Text style={styles.listItem}>・お問い合わせへの対応</Text>
          <Text style={styles.listItem}>・不正利用の防止</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 情報の共有</Text>
          <Text style={styles.paragraph}>
            以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません：
          </Text>
          <Text style={styles.listItem}>・ユーザーの同意がある場合</Text>
          <Text style={styles.listItem}>・法令に基づく場合</Text>
          <Text style={styles.listItem}>・人の生命・身体・財産の保護に必要な場合</Text>
          <Text style={styles.listItem}>・サービス提供に必要な業務委託先への提供</Text>
          <Text style={styles.paragraph}>
            なお、イベント参加者同士では、イベント主催者が設定した範囲で情報が共有されます（表示名、出欠状況、支払い状況など）。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 情報の保護</Text>
          <Text style={styles.paragraph}>
            ユーザーの個人情報を保護するため、以下の対策を講じています：
          </Text>
          <Text style={styles.listItem}>・SSL/TLSによる通信の暗号化</Text>
          <Text style={styles.listItem}>・パスワードのハッシュ化</Text>
          <Text style={styles.listItem}>・アクセス制御の実施</Text>
          <Text style={styles.listItem}>・定期的なセキュリティ監査</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. データの保存期間</Text>
          <Text style={styles.paragraph}>
            ユーザーの個人情報は、アカウントが有効な間、またはサービス提供に必要な期間保存されます。アカウント削除後は、法令で定められた期間を除き、速やかに削除します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. ユーザーの権利</Text>
          <Text style={styles.paragraph}>
            ユーザーは以下の権利を有します：
          </Text>
          <Text style={styles.listItem}>・自己の個人情報へのアクセス</Text>
          <Text style={styles.listItem}>・個人情報の訂正・削除の要求</Text>
          <Text style={styles.listItem}>・アカウントの削除</Text>
          <Text style={styles.listItem}>・通知の受信停止</Text>
          <Text style={styles.paragraph}>
            これらの権利を行使する場合は、アプリ内の設定画面またはお問い合わせ窓口よりご連絡ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cookie等の使用</Text>
          <Text style={styles.paragraph}>
            本アプリでは、サービス提供のためにCookieおよび類似の技術を使用することがあります。これらはセッション管理やユーザー体験の向上に使用されます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. 子どものプライバシー</Text>
          <Text style={styles.paragraph}>
            本アプリは13歳未満の子どもからの個人情報を意図的に収集することはありません。13歳未満の方は、保護者の同意を得てからご利用ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. プライバシーポリシーの変更</Text>
          <Text style={styles.paragraph}>
            本プライバシーポリシーは、必要に応じて変更されることがあります。重要な変更がある場合は、アプリ内で通知します。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. お問い合わせ</Text>
          <Text style={styles.paragraph}>
            本プライバシーポリシーに関するお問い合わせは、アプリ内のお問い合わせ機能よりご連絡ください。
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>以上</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  lastUpdated: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  subTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[800],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    lineHeight: typography.fontSize.base * 1.7,
    marginBottom: spacing.sm,
  },
  listItem: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    lineHeight: typography.fontSize.base * 1.7,
    marginLeft: spacing.md,
    marginBottom: spacing.xs,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
  },
});
