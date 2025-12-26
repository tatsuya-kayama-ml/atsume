import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

export const TermsOfServiceScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.lastUpdated}>最終更新日: 2025年12月26日</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第1条（適用）</Text>
          <Text style={styles.paragraph}>
            本利用規約（以下「本規約」）は、ATSUME（以下「本アプリ」）の利用条件を定めるものです。ユーザーの皆様には、本規約に従って本アプリをご利用いただきます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第2条（利用登録）</Text>
          <Text style={styles.paragraph}>
            1. 本アプリの利用を希望する方は、本規約に同意の上、所定の方法により利用登録を行うものとします。
          </Text>
          <Text style={styles.paragraph}>
            2. 当社は、以下の場合に利用登録を拒否することがあります：
          </Text>
          <Text style={styles.listItem}>・虚偽の情報を登録した場合</Text>
          <Text style={styles.listItem}>・過去に本規約に違反したことがある場合</Text>
          <Text style={styles.listItem}>・その他、当社が不適当と判断した場合</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第3条（アカウント管理）</Text>
          <Text style={styles.paragraph}>
            1. ユーザーは、自己の責任においてアカウント情報を管理するものとします。
          </Text>
          <Text style={styles.paragraph}>
            2. ユーザーは、アカウントを第三者に譲渡・貸与することはできません。
          </Text>
          <Text style={styles.paragraph}>
            3. アカウント情報の管理不十分による損害について、当社は責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第4条（禁止事項）</Text>
          <Text style={styles.paragraph}>
            ユーザーは、本アプリの利用にあたり、以下の行為を行ってはなりません：
          </Text>
          <Text style={styles.listItem}>・法令または公序良俗に違反する行為</Text>
          <Text style={styles.listItem}>・犯罪行為に関連する行為</Text>
          <Text style={styles.listItem}>・当社または第三者の知的財産権を侵害する行為</Text>
          <Text style={styles.listItem}>・当社または第三者の名誉・信用を毀損する行為</Text>
          <Text style={styles.listItem}>・他のユーザーの個人情報を不正に収集する行為</Text>
          <Text style={styles.listItem}>・本アプリの運営を妨害する行為</Text>
          <Text style={styles.listItem}>・不正アクセスまたはこれを試みる行為</Text>
          <Text style={styles.listItem}>・反社会的勢力への利益供与</Text>
          <Text style={styles.listItem}>・その他、当社が不適切と判断する行為</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第5条（サービスの提供停止）</Text>
          <Text style={styles.paragraph}>
            当社は、以下の場合にサービスの提供を停止することがあります：
          </Text>
          <Text style={styles.listItem}>・システムの保守・点検を行う場合</Text>
          <Text style={styles.listItem}>・天災・事故等によりサービス提供が困難な場合</Text>
          <Text style={styles.listItem}>・その他、当社が必要と判断した場合</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第6条（利用制限・登録抹消）</Text>
          <Text style={styles.paragraph}>
            当社は、ユーザーが本規約に違反した場合、事前の通知なくサービスの利用制限または登録抹消を行うことができます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第7条（免責事項）</Text>
          <Text style={styles.paragraph}>
            1. 当社は、本アプリに事実上または法律上の瑕疵がないことを保証しません。
          </Text>
          <Text style={styles.paragraph}>
            2. 当社は、本アプリの利用により生じた損害について、一切の責任を負いません。
          </Text>
          <Text style={styles.paragraph}>
            3. ユーザー間のトラブルについて、当社は一切関与しません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第8条（サービス内容の変更）</Text>
          <Text style={styles.paragraph}>
            当社は、ユーザーへの事前の通知なく、本アプリの内容を変更または提供を中止することができます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第9条（利用規約の変更）</Text>
          <Text style={styles.paragraph}>
            当社は、必要に応じて本規約を変更することがあります。変更後の規約は、本アプリ上に表示した時点から効力を生じます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第10条（準拠法・裁判管轄）</Text>
          <Text style={styles.paragraph}>
            本規約の解釈は日本法に準拠し、本アプリに関する紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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
