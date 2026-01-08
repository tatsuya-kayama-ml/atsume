import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingSlide } from './components/OnboardingSlide';
import { OnboardingDots } from './components/OnboardingDots';
import { OnboardingControls } from './components/OnboardingControls';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { PagerView } from '../../components/PagerView';
import { colors } from '../../constants/theme';

// スライドデータ
const slides = [
  {
    id: 'welcome',
    icon: 'calendar-check',
    title: 'あつめへようこそ',
    description: 'イベントの参加管理を\nもっと簡単に',
    backgroundColor: colors.primarySoft,
  },
  {
    id: 'create',
    icon: 'plus-circle',
    title: 'イベントを作成',
    description: '日時・場所・参加費を設定して\n招待コードを共有',
    backgroundColor: colors.secondarySoft,
  },
  {
    id: 'manage',
    icon: 'users',
    title: '参加者を管理',
    description: '出欠・支払い状況を\nリアルタイムで確認',
    backgroundColor: colors.infoSoft,
  },
  {
    id: 'team',
    icon: 'trophy',
    title: 'チーム分けも簡単',
    description: '自動チーム分け機能で\n公平なチームを作成',
    backgroundColor: colors.warningSoft,
  },
];

export const OnboardingScreen: React.FC = () => {
  const pagerRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const insets = useSafeAreaInsets();
  const completeWalkthrough = useOnboardingStore((s) => s.completeWalkthrough);

  const isLastPage = currentPage === slides.length - 1;

  const handlePageSelected = (e: { nativeEvent: { position: number } }) => {
    setCurrentPage(e.nativeEvent.position);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isLastPage) {
      completeWalkthrough();
    } else {
      pagerRef.current?.setPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    completeWalkthrough();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.page}>
            <OnboardingSlide
              icon={slide.icon}
              title={slide.title}
              description={slide.description}
              backgroundColor={slide.backgroundColor}
            />
          </View>
        ))}
      </PagerView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <OnboardingDots total={slides.length} current={currentPage} />
        <OnboardingControls
          onSkip={handleSkip}
          onNext={handleNext}
          isLastPage={isLastPage}
          showSkip={!isLastPage}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 24,
  },
});
