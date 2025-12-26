import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, MapPin, Banknote, Users, Ticket, Plus, ChevronRight, List, CalendarDays } from 'lucide-react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { Card, Badge, Avatar, SkeletonList, AnimatedRefreshControl } from '../../components/common';
import { Event, RootStackParamList } from '../../types';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

// Configure Japanese locale for calendar
LocaleConfig.locales['ja'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

type ViewMode = 'list' | 'calendar';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

const formatDate = (dateString: string): { date: string; time: string; isToday: boolean; isTomorrow: boolean } => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];

  return {
    date: isToday ? '今日' : isTomorrow ? '明日' : `${month}/${day}(${weekday})`,
    time: `${hours}:${minutes}`,
    isToday,
    isTomorrow,
  };
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'open':
      return { color: 'success' as const, label: '募集中' };
    case 'in_progress':
      return { color: 'primary' as const, label: '開催中' };
    case 'completed':
      return { color: 'default' as const, label: '終了' };
    case 'closed':
      return { color: 'error' as const, label: '締切' };
    case 'draft':
      return { color: 'default' as const, label: '下書き' };
    default:
      return { color: 'default' as const, label: status };
  }
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { events, isLoading, fetchMyEvents } = useEventStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Create marked dates for calendar
  const markedDates = useMemo(() => {
    const marks: { [key: string]: any } = {};
    events.forEach((event) => {
      const dateKey = event.date_time.split('T')[0];
      const isOrganizer = event.organizer_id === user?.id;
      if (marks[dateKey]) {
        marks[dateKey].dots.push({
          key: event.id,
          color: isOrganizer ? colors.primary : colors.success,
        });
      } else {
        marks[dateKey] = {
          dots: [{
            key: event.id,
            color: isOrganizer ? colors.primary : colors.success,
          }],
        };
      }
    });

    // Add selected date styling
    if (selectedDate) {
      if (marks[selectedDate]) {
        marks[selectedDate].selected = true;
        marks[selectedDate].selectedColor = colors.primary;
      } else {
        marks[selectedDate] = {
          selected: true,
          selectedColor: colors.primary,
          dots: [],
        };
      }
    }

    return marks;
  }, [events, user?.id, selectedDate]);

  // Filter events by selected date
  const filteredEvents = useMemo(() => {
    if (!selectedDate) return events;
    return events.filter((event) => event.date_time.startsWith(selectedDate));
  }, [events, selectedDate]);

  // FAB animations
  const primaryFabScale = useSharedValue(1);
  const secondaryFabScale = useSharedValue(1);

  const primaryFabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: primaryFabScale.value }],
  }));

  const secondaryFabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: secondaryFabScale.value }],
  }));

  const handlePrimaryFabPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate('EventCreate');
  };

  const handleSecondaryFabPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('JoinEvent', {});
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyEvents();
    }, [])
  );

  const renderEventItem = ({ item, index }: { item: Event; index: number }) => {
    const isOrganizer = item.organizer_id === user?.id;
    const { date, time, isToday, isTomorrow } = formatDate(item.date_time);
    const statusConfig = getStatusConfig(item.status);

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 80).springify().damping(15)}
        style={styles.cardWrapper}
      >
        <Card
          variant="elevated"
          onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
          style={styles.eventCard}
        >
          {/* Date Banner */}
          <View style={[
            styles.dateBanner,
            (isToday || isTomorrow) && styles.dateBannerHighlight,
          ]}>
            <Text style={[
              styles.dateText,
              (isToday || isTomorrow) && styles.dateTextHighlight,
            ]}>
              {date}
            </Text>
            <Text style={[
              styles.timeText,
              (isToday || isTomorrow) && styles.timeTextHighlight,
            ]}>
              {time}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.badges}>
                {isOrganizer && (
                  <Badge label="主催" color="primary" size="sm" />
                )}
                <Badge
                  label={statusConfig.label}
                  color={statusConfig.color}
                  size="sm"
                />
              </View>
            </View>

            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.gray[400]} style={styles.metaIconStyle} />
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Banknote size={14} color={colors.gray[400]} style={styles.metaIconStyle} />
                  <Text style={styles.feeText}>¥{item.fee.toLocaleString()}</Text>
                </View>
                {item.capacity && (
                  <View style={styles.metaItem}>
                    <Users size={14} color={colors.gray[400]} style={styles.metaIconStyle} />
                    <Text style={styles.metaText}>定員 {item.capacity}名</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Arrow indicator */}
          <View style={styles.arrowContainer}>
            <ChevronRight size={20} color={colors.gray[300]} />
          </View>
        </Card>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Animated.View
        entering={FadeIn.delay(100).duration(400)}
        style={styles.emptyIconContainer}
      >
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
        >
          <CalendarIcon size={48} color={colors.primary} />
        </Animated.View>
      </Animated.View>
      <Animated.Text
        entering={FadeInDown.delay(300).springify()}
        style={styles.emptyTitle}
      >
        イベントがありません
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(400).springify()}
        style={styles.emptyMessage}
      >
        新しいイベントを作成するか、{'\n'}招待コードでイベントに参加しましょう
      </Animated.Text>
    </View>
  );

  // Avatar animation
  const avatarScale = useSharedValue(1);
  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const handleAvatarPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('Main', { screen: 'Settings' } as any);
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'おはようございます';
    if (hour < 18) return 'こんにちは';
    return 'こんばんは';
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      {/* Top row with greeting and avatar */}
      <View style={styles.headerTop}>
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{user?.display_name || 'ゲスト'}</Text>
            <Text style={styles.userNameSuffix}>さん</Text>
          </View>
        </Animated.View>
        <AnimatedPressable
          style={[styles.avatarButton, avatarAnimatedStyle]}
          onPress={handleAvatarPress}
          onPressIn={() => {
            avatarScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            avatarScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
        >
          <View style={styles.avatarWrapper}>
            <Avatar name={user?.display_name || 'G'} imageUrl={user?.avatar_url || undefined} size="md" />
            <View style={styles.avatarBadge} />
          </View>
        </AnimatedPressable>
      </View>

      {/* View mode toggle and Stats */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.viewModeAndStats}>
        {/* View Mode Toggle */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
            onPress={() => {
              setViewMode('list');
              setSelectedDate(null);
            }}
            activeOpacity={0.7}
          >
            <List size={16} color={viewMode === 'list' ? colors.white : colors.gray[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'calendar' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.7}
          >
            <CalendarDays size={16} color={viewMode === 'calendar' ? colors.white : colors.gray[500]} />
          </TouchableOpacity>
        </View>

        {/* Stats cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <View style={styles.statIconContainer}>
              <CalendarIcon size={18} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{events.length}</Text>
            <Text style={styles.statLabel}>参加イベント</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSecondary]}>
            <View style={[styles.statIconContainer, styles.statIconContainerAlt]}>
              <Users size={18} color={colors.success} />
            </View>
            <Text style={styles.statValue}>
              {events.filter(e => e.organizer_id === user?.id).length}
            </Text>
            <Text style={styles.statLabel}>主催</Text>
          </View>
          <View style={[styles.statCard, styles.statCardTertiary]}>
            <View style={[styles.statIconContainer, styles.statIconContainerWarn]}>
              <Ticket size={18} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>
              {events.filter(e => e.status === 'open').length}
            </Text>
            <Text style={styles.statLabel}>募集中</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  // Calendar view content
  const renderCalendarView = () => (
    <ScrollView
      style={styles.calendarContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <AnimatedRefreshControl
          refreshing={isLoading}
          onRefresh={fetchMyEvents}
        />
      }
    >
      <Calendar
        style={styles.calendar}
        theme={{
          backgroundColor: colors.white,
          calendarBackground: colors.white,
          textSectionTitleColor: colors.gray[500],
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.white,
          todayTextColor: colors.primary,
          dayTextColor: colors.gray[900],
          textDisabledColor: colors.gray[300],
          dotColor: colors.primary,
          selectedDotColor: colors.white,
          arrowColor: colors.primary,
          monthTextColor: colors.gray[900],
          textDayFontWeight: '500',
          textMonthFontWeight: '600',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day: any) => {
          setSelectedDate(day.dateString === selectedDate ? null : day.dateString);
        }}
        enableSwipeMonths={true}
      />

      {/* Selected date events */}
      {selectedDate && (
        <View style={styles.selectedDateSection}>
          <Text style={styles.selectedDateTitle}>
            {new Date(selectedDate).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </Text>
          {filteredEvents.length === 0 ? (
            <View style={styles.noEventsCard}>
              <Text style={styles.noEventsText}>この日のイベントはありません</Text>
            </View>
          ) : (
            filteredEvents.map((event, index) => (
              <Animated.View
                key={event.id}
                entering={FadeInDown.delay(index * 50).springify()}
              >
                {renderEventItem({ item: event, index })}
              </Animated.View>
            ))
          )}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>主催イベント</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>参加イベント</Text>
        </View>
      </View>

      <View style={{ height: 140 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {isLoading && events.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList count={4} />
        </View>
      ) : viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AnimatedRefreshControl
              refreshing={isLoading}
              onRefresh={fetchMyEvents}
            />
          }
        />
      )}

      <Animated.View
        entering={FadeInUp.delay(300).springify()}
        style={[styles.fabContainer, { bottom: insets.bottom + spacing.lg }]}
      >
        <AnimatedPressable
          style={[styles.fabSecondary, secondaryFabAnimatedStyle]}
          onPress={handleSecondaryFabPress}
          onPressIn={() => {
            secondaryFabScale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            secondaryFabScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
        >
          <Ticket size={18} color={colors.gray[700]} style={styles.fabIconStyle} />
          <Text style={styles.fabSecondaryText}>参加する</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.fab, primaryFabAnimatedStyle]}
          onPress={handlePrimaryFabPress}
          onPressIn={() => {
            primaryFabScale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            primaryFabScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
        >
          <Plus size={18} color={colors.white} style={styles.fabIconStyle} />
          <Text style={styles.fabText}>作成する</Text>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    marginBottom: spacing['2xs'],
    fontWeight: '500',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    letterSpacing: -0.5,
  },
  userNameSuffix: {
    fontSize: typography.fontSize.lg,
    fontWeight: '500',
    color: colors.gray[500],
    marginLeft: spacing['2xs'],
  },
  avatarButton: {
    padding: spacing['2xs'],
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  viewModeAndStats: {
    gap: spacing.md,
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  viewModeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  statCardPrimary: {
    backgroundColor: colors.primary + '08',
  },
  statCardSecondary: {
    backgroundColor: colors.success + '08',
  },
  statCardTertiary: {
    backgroundColor: colors.warning + '08',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statIconContainerAlt: {
    backgroundColor: colors.success + '15',
  },
  statIconContainerWarn: {
    backgroundColor: colors.warning + '15',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing['2xs'],
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontWeight: '500',
  },
  skeletonContainer: {
    flex: 1,
    padding: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 140,
  },
  cardWrapper: {
    marginBottom: spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    padding: 0,
    overflow: 'hidden',
  },
  dateBanner: {
    width: 72,
    backgroundColor: colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.gray[100],
  },
  dateBannerHighlight: {
    backgroundColor: colors.primarySoft,
  },
  dateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.gray[700],
    marginBottom: spacing['2xs'],
  },
  dateTextHighlight: {
    color: colors.primary,
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontWeight: '500',
  },
  timeTextHighlight: {
    color: colors.primaryLight,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  eventHeader: {
    marginBottom: spacing.sm,
  },
  eventName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.sm,
    lineHeight: typography.fontSize.lg * typography.lineHeight.snug,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  eventMeta: {
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  metaIconStyle: {
    marginRight: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  feeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  arrow: {
    fontSize: 24,
    color: colors.gray[300],
    fontWeight: '300',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  fabContainer: {
    position: 'absolute',
    right: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    ...shadows.primary,
  },
  fabIcon: {
    fontSize: 16,
    color: colors.white,
    marginRight: spacing.xs,
    fontWeight: '600',
  },
  fabIconStyle: {
    marginRight: spacing.xs,
  },
  fabText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  fabSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  fabSecondaryIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  fabSecondaryText: {
    color: colors.gray[700],
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  // Calendar styles
  calendarContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendar: {
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  selectedDateSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  selectedDateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  noEventsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  noEventsText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
  },
});
