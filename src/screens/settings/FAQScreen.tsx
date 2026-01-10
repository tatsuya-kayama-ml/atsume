import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, typography } from '../../constants/theme';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FAQ'>;
}

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'イベントの作成方法を教えてください',
    answer: 'ホーム画面の「＋」ボタンをタップし、イベント名、日時、場所、参加費などの必要情報を入力してください。作成後、招待コードが発行されます。',
  },
  {
    question: '招待コードはどこで確認できますか？',
    answer: 'イベント詳細画面の上部に招待コードが表示されています。「コピー」ボタンで簡単にコピーでき、「共有する」ボタンで他のアプリと共有できます。',
  },
  {
    question: 'パスワード付きイベントの作成方法は？',
    answer: 'イベント作成時または編集時に「参加パスワード」欄にパスワードを入力してください。参加者は招待コードとパスワードの両方が必要になります。',
  },
  {
    question: '参加者の支払い状況を確認したい',
    answer: 'イベント詳細画面の「集金」タブで、各参加者の支払いステータス（未払い・確認待ち・支払済）を確認できます。参加者が支払い報告をすると通知が届きます。',
  },
  {
    question: '参加者を手動で追加できますか？',
    answer: 'はい。イベント詳細の「参加受付」タブで「＋」ボタンをタップし、名前を入力することで手動で参加者を追加できます。',
  },
  {
    question: 'トーナメントの作成方法は？',
    answer: 'イベント詳細画面の「トーナメント」タブから作成できます。まずチームを作成し、参加者を各チームに振り分けてから、トーナメント形式を選択してください。',
  },
  {
    question: 'イベントのステータスを変更するには？',
    answer: 'イベント詳細画面の「情報」タブで、主催者は「実施予定」と「終了」の間でステータスを切り替えられます。',
  },
  {
    question: '参加をキャンセルしたい',
    answer: 'イベント詳細画面の「情報」タブ下部にある「参加をキャンセル」ボタンから退会できます。',
  },
  {
    question: 'イベントを削除できますか？',
    answer: 'はい。イベント編集画面の下部にある「イベントを削除」ボタンから削除できます。削除すると復元できませんのでご注意ください。',
  },
  {
    question: 'パスワードを忘れた場合は？',
    answer: 'ログイン画面の「パスワードをお忘れですか？」をタップし、登録したメールアドレスを入力してください。パスワードリセット用のリンクが送信されます。',
  },
  {
    question: 'プロフィール画像を変更したい',
    answer: '「その他」→「プロフィール編集」から、プロフィール画像、表示名、スキルレベルを変更できます。',
  },
  {
    question: 'アカウントを削除したい',
    answer: 'お問い合わせフォームからアカウント削除の依頼をお送りください。確認後、対応させていただきます。',
  },
];

const FAQScreen: React.FC<Props> = ({ navigation }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>よくある質問</Text>
          <Text style={styles.subtitle}>
            お困りのことがあれば、まずこちらをご確認ください
          </Text>
        </View>

        {faqData.map((faq, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.questionContainer}
              onPress={() => toggleExpand(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.questionNumber}>Q{index + 1}</Text>
              <Text style={styles.question}>{faq.question}</Text>
              {expandedIndex === index ? (
                <ChevronUp size={20} color={colors.primary} />
              ) : (
                <ChevronDown size={20} color={colors.gray[400]} />
              )}
            </TouchableOpacity>

            {expandedIndex === index && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerLabel}>A</Text>
                <Text style={styles.answer}>{faq.answer}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            上記で解決しない場合は、お問い合わせフォームからご連絡ください。
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => navigation.navigate('Contact')}
            activeOpacity={0.7}
          >
            <Text style={styles.contactButtonText}>お問い合わせ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    lineHeight: 20,
  },
  faqItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  questionNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
    minWidth: 28,
  },
  question: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
    lineHeight: 22,
  },
  answerContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingTop: 0,
    backgroundColor: colors.gray[50],
  },
  answerLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.success,
    marginRight: spacing.sm,
    minWidth: 28,
  },
  answer: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
  },
  footer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
});

export { FAQScreen };
