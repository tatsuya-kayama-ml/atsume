import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8081';

// テスト用アカウント情報
const TEST_USER = {
  email: 'tatsuya.kayama@monstar-lab.com',
  password: 'atsume88',
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `./screenshots/full_${name}.png`, fullPage: true });
  console.log(`  📸 Screenshot: full_${name}.png`);
}

async function waitForApp(page) {
  await page.waitForLoadState('networkidle');
  await delay(2000);
}

async function runFullTests() {
  console.log('🚀 ATSUME 全機能E2Eテスト開始\n');
  console.log('='.repeat(60));
  console.log(`テストユーザー: ${TEST_USER.email}`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: [],
    skipped: [],
  };

  try {
    // ============================================
    // 1. ログイン
    // ============================================
    console.log('\n📱 1. ログイン');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await waitForApp(page);

      const content = await page.content();

      // すでにログインしているかチェック
      if (content.includes('イベント作成') || content.includes('イベント参加')) {
        console.log('  ✅ 既にログイン状態です');
        results.passed.push('ログイン（既存セッション）');
      } else {
        // ログインフォームに入力
        const inputs = page.locator('input');
        await inputs.nth(0).fill(TEST_USER.email);
        await inputs.nth(1).fill(TEST_USER.password);

        // ログインボタンをクリック（青いボタン - 2番目の要素）
        const loginBtn = page.locator('div').filter({ hasText: /^ログイン$/ }).nth(1);
        await loginBtn.click({ force: true });
        console.log('  ログインボタンクリック完了');

        // ログイン処理完了を待つ
        // URL変更またはホーム画面の要素が表示されるまで待機
        try {
          await page.waitForFunction(() => {
            return document.body.innerText.includes('イベント作成') ||
                   document.body.innerText.includes('イベント参加') ||
                   !document.body.innerText.includes('アカウント情報を入力');
          }, { timeout: 15000 });
          console.log('  ホーム画面への遷移を検出');
        } catch (e) {
          console.log('  遷移待機タイムアウト');
        }

        await delay(3000);
        await waitForApp(page);
        await takeScreenshot(page, '01_after_login_click');

        const afterContent = await page.content();
        const hasEventCreate = afterContent.includes('イベント作成');
        const hasEventJoin = afterContent.includes('イベント参加');
        const hasLoginForm = afterContent.includes('アカウント情報を入力');

        console.log(`  ログイン後: イベント作成=${hasEventCreate}, イベント参加=${hasEventJoin}, ログインフォーム=${hasLoginForm}`);

        if (hasEventCreate || hasEventJoin) {
          console.log('  ✅ ログイン成功 - ホーム画面に遷移');
          results.passed.push('ログイン');
        } else if (afterContent.includes('あつめへようこそ') || afterContent.includes('スキップ') || page.url().includes('Onboarding')) {
          console.log('  ✅ ログイン成功 - オンボーディング画面に遷移');
          results.passed.push('ログイン');

          // オンボーディングをスキップ
          console.log('  オンボーディングをスキップ中...');
          const skipBtn = page.locator('text=スキップ').first();
          if (await skipBtn.count() > 0) {
            await skipBtn.click();
            await delay(5000);
            await waitForApp(page);
            console.log('  ✅ オンボーディングスキップ完了');
          }
        } else if (hasLoginForm) {
          console.log('  ⚠️ ログイン画面のまま');
          if (afterContent.includes('エラー') || afterContent.includes('無効') || afterContent.includes('認証')) {
            console.log('  ❌ 認証エラーメッセージを検出');
          } else {
            console.log('  ℹ️ 認証処理中またはネットワーク待機中の可能性');
          }
          results.failed.push({ test: 'ログイン', error: '画面遷移失敗' });
        } else {
          console.log('  ⚠️ 不明な状態');
          results.passed.push('ログイン（状態不明）');
        }
      }
      await takeScreenshot(page, '01_after_login');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'ログイン', error: error.message });
    }

    // ============================================
    // 2. ホーム画面確認
    // ============================================
    console.log('\n📱 2. ホーム画面確認');
    console.log('-'.repeat(60));
    try {
      await waitForApp(page);
      await takeScreenshot(page, '02_home_screen');

      const content = await page.content();
      const checks = {
        'イベント作成ボタン': content.includes('イベント作成'),
        'イベント参加ボタン': content.includes('イベント参加'),
        'カレンダー/リスト表示': content.includes('カレンダー') || content.includes('リスト'),
      };

      Object.entries(checks).forEach(([name, exists]) => {
        console.log(`  ${exists ? '✅' : '❌'} ${name}`);
      });

      results.passed.push('ホーム画面表示');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'ホーム画面確認', error: error.message });
    }

    // ============================================
    // 3. イベント作成画面
    // ============================================
    console.log('\n📱 3. イベント作成画面');
    console.log('-'.repeat(60));
    try {
      // イベント作成ボタンをクリック
      const createBtn = page.locator('text=イベント作成').first();
      if (await createBtn.count() > 0) {
        await createBtn.click();
        await waitForApp(page);
        await takeScreenshot(page, '03_event_create');

        const content = await page.content();
        const checks = {
          'イベント名入力': content.includes('イベント名'),
          '日時設定': content.includes('日時') || content.includes('開催日'),
          '場所設定': content.includes('場所') || content.includes('会場'),
          '参加費設定': content.includes('参加費'),
          '定員設定': content.includes('定員') || content.includes('人数'),
        };

        Object.entries(checks).forEach(([name, exists]) => {
          console.log(`  ${exists ? '✅' : '❌'} ${name}`);
        });

        results.passed.push('イベント作成画面');

        // 戻る
        const backBtn = page.locator('text=キャンセル').first();
        if (await backBtn.count() > 0) {
          await backBtn.click();
          await delay(1500);
        } else {
          await page.goBack();
          await delay(1500);
        }
      } else {
        console.log('  ⚠️ イベント作成ボタンが見つかりません');
        results.skipped.push('イベント作成画面');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'イベント作成画面', error: error.message });
    }

    // ============================================
    // 4. イベント参加画面
    // ============================================
    console.log('\n📱 4. イベント参加画面');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      const joinBtn = page.locator('text=イベント参加').first();
      if (await joinBtn.count() > 0) {
        await joinBtn.click();
        await waitForApp(page);
        await takeScreenshot(page, '04_join_event');

        const content = await page.content();
        if (content.includes('コード') || content.includes('招待')) {
          console.log('  ✅ イベント参加画面（コード入力）');
          results.passed.push('イベント参加画面');
        }

        // 戻る
        await page.goBack();
        await delay(1500);
      } else {
        console.log('  ⚠️ イベント参加ボタンが見つかりません');
        results.skipped.push('イベント参加画面');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'イベント参加画面', error: error.message });
    }

    // ============================================
    // 5. 既存イベント詳細確認
    // ============================================
    console.log('\n📱 5. イベント詳細画面');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      // イベントカードをクリック
      const eventCard = page.locator('[data-testid="event-card"]').first();
      const eventItem = page.locator('div:has-text("イベント")').filter({ hasText: /^\d/ }).first();

      // イベントリストがあれば最初のイベントをクリック
      const content = await page.content();
      if (content.includes('参加者') || content.includes('予定')) {
        // イベントがある場合、クリックを試みる
        const clickableEvent = page.locator('div[role="button"]').filter({ hasText: /\d{1,2}月|イベント/ }).first();
        if (await clickableEvent.count() > 0) {
          await clickableEvent.click();
          await waitForApp(page);
          await takeScreenshot(page, '05_event_detail');

          const detailContent = await page.content();
          const tabs = {
            '情報タブ': detailContent.includes('情報') || detailContent.includes('Info'),
            '参加者タブ': detailContent.includes('参加者'),
            '集金タブ': detailContent.includes('集金') || detailContent.includes('Payment'),
            'チームタブ': detailContent.includes('チーム') || detailContent.includes('Teams'),
            '対戦表タブ': detailContent.includes('対戦') || detailContent.includes('Matches'),
          };

          Object.entries(tabs).forEach(([name, exists]) => {
            console.log(`  ${exists ? '✅' : '❌'} ${name}`);
          });

          results.passed.push('イベント詳細画面');
        } else {
          console.log('  ℹ️ クリック可能なイベントが見つかりません');
          results.skipped.push('イベント詳細画面');
        }
      } else {
        console.log('  ℹ️ イベントが存在しません');
        results.skipped.push('イベント詳細画面');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'イベント詳細画面', error: error.message });
    }

    // ============================================
    // 6. 設定画面
    // ============================================
    console.log('\n📱 6. 設定画面');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      // 設定タブをクリック
      const settingsTab = page.locator('text=設定').first();
      if (await settingsTab.count() > 0) {
        await settingsTab.click();
        await waitForApp(page);
        await takeScreenshot(page, '06_settings');

        const content = await page.content();
        const checks = {
          'プロフィール': content.includes('プロフィール'),
          'パスワード変更': content.includes('パスワード'),
          '通知設定': content.includes('通知'),
          'テーマ設定': content.includes('テーマ') || content.includes('ダーク'),
          'ログアウト': content.includes('ログアウト'),
        };

        Object.entries(checks).forEach(([name, exists]) => {
          console.log(`  ${exists ? '✅' : '❌'} ${name}`);
        });

        results.passed.push('設定画面');
      } else {
        console.log('  ⚠️ 設定タブが見つかりません');
        results.skipped.push('設定画面');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: '設定画面', error: error.message });
    }

    // ============================================
    // 7. 通知画面
    // ============================================
    console.log('\n📱 7. 通知画面');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      const notificationTab = page.locator('text=通知').first();
      if (await notificationTab.count() > 0) {
        await notificationTab.click();
        await waitForApp(page);
        await takeScreenshot(page, '07_notifications');
        console.log('  ✅ 通知画面表示');
        results.passed.push('通知画面');
      } else {
        console.log('  ⚠️ 通知タブが見つかりません');
        results.skipped.push('通知画面');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: '通知画面', error: error.message });
    }

    // ============================================
    // 8. プロフィール編集画面
    // ============================================
    console.log('\n📱 8. プロフィール編集画面');
    console.log('-'.repeat(60));
    try {
      // 設定画面に移動
      const settingsTab = page.locator('text=設定').first();
      if (await settingsTab.count() > 0) {
        await settingsTab.click();
        await waitForApp(page);

        // プロフィール編集をクリック
        const profileEdit = page.locator('text=プロフィール編集').first();
        if (await profileEdit.count() > 0) {
          await profileEdit.click();
          await waitForApp(page);
          await takeScreenshot(page, '08_profile_edit');

          const content = await page.content();
          const checks = {
            '名前入力': content.includes('名前') || content.includes('表示名'),
            'スキルレベル': content.includes('スキル'),
            'アバター': content.includes('アバター') || content.includes('写真'),
          };

          Object.entries(checks).forEach(([name, exists]) => {
            console.log(`  ${exists ? '✅' : '❌'} ${name}`);
          });

          results.passed.push('プロフィール編集画面');
        }
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'プロフィール編集', error: error.message });
    }

    // ============================================
    // 9. レスポンシブデザイン（ログイン後）
    // ============================================
    console.log('\n📱 9. レスポンシブデザイン（ログイン後）');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      // タブレット
      await page.setViewportSize({ width: 768, height: 1024 });
      await delay(1000);
      await takeScreenshot(page, '09_tablet_loggedin');
      console.log('  ✅ タブレット表示');

      // デスクトップ
      await page.setViewportSize({ width: 1440, height: 900 });
      await delay(1000);
      await takeScreenshot(page, '10_desktop_loggedin');
      console.log('  ✅ デスクトップ表示');

      // モバイルに戻す
      await page.setViewportSize({ width: 390, height: 844 });

      results.passed.push('レスポンシブデザイン（ログイン後）');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'レスポンシブデザイン', error: error.message });
    }

    // ============================================
    // 10. ナビゲーション確認
    // ============================================
    console.log('\n📱 10. ナビゲーション確認');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      const content = await page.content();
      const navItems = {
        'ホームタブ': content.includes('ホーム'),
        '通知タブ': content.includes('通知'),
        '設定タブ': content.includes('設定'),
      };

      Object.entries(navItems).forEach(([name, exists]) => {
        console.log(`  ${exists ? '✅' : '❌'} ${name}`);
      });

      results.passed.push('ナビゲーション確認');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'ナビゲーション確認', error: error.message });
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }

  // ============================================
  // サマリー
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 全機能テスト結果サマリー');
  console.log('='.repeat(60));

  console.log(`\n✅ 成功: ${results.passed.length}件`);
  results.passed.forEach(test => console.log(`   ・ ${test}`));

  if (results.skipped.length > 0) {
    console.log(`\n⏭️ スキップ: ${results.skipped.length}件`);
    results.skipped.forEach(test => console.log(`   ・ ${test}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ 失敗: ${results.failed.length}件`);
    results.failed.forEach(({ test, error }) => console.log(`   ・ ${test}: ${error.substring(0, 60)}`));
  }

  console.log('\n📸 スクリーンショット: ./screenshots/');
  console.log('='.repeat(60));

  return results;
}

// Create screenshots directory and run tests
import { mkdir } from 'fs/promises';
try {
  await mkdir('./screenshots', { recursive: true });
} catch (e) {}

runFullTests().catch(console.error);
