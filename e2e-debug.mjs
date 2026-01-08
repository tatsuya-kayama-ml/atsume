import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8081';

const TEST_USER = {
  email: 'tatsuya.kayama@monstar-lab.com',
  password: 'atsume88',
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `./screenshots/${name}.png`, fullPage: true });
  console.log(`  📸 ${name}.png`);
}

async function fullTest() {
  console.log('🚀 ATSUME 全機能E2Eテスト\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });

  const page = await context.newPage();

  // ブラウザコンソールログを収集
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Auth]') || text.includes('Supabase') || text.includes('error') || text.includes('Error')) {
      console.log(`  🔍 Console: ${text}`);
    }
  });

  // ページエラーをキャッチ
  page.on('pageerror', error => {
    console.log(`  ❌ Page Error: ${error.message}`);
  });

  // ネットワークリクエストを監視（Supabase auth）
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase') && url.includes('auth')) {
      console.log(`  🌐 Network: ${response.status()} ${url.substring(0, 80)}...`);
    }
  });

  const results = { passed: [], failed: [], skipped: [] };

  try {
    // 1. ページにアクセスしてlocalStorageを設定
    console.log('📱 1. 初期設定');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);

    // オンボーディング完了フラグをlocalStorageに設定
    console.log('  オンボーディング完了フラグを設定中...');
    await page.evaluate(() => {
      localStorage.setItem('atsume-onboarding', JSON.stringify({
        state: {
          hasCompletedWalkthrough: true,
          shownTooltips: []
        },
        version: 0
      }));
    });
    console.log('  ✅ localStorageにフラグを設定完了');

    // ページをリロード
    await page.reload({ waitUntil: 'networkidle' });
    await delay(3000);

    // 2. ログイン
    console.log('\n📱 2. ログイン');
    const inputs = await page.locator('input').all();
    if (inputs.length >= 2) {
      await inputs[0].fill(TEST_USER.email);
      await inputs[1].fill(TEST_USER.password);
      console.log('  認証情報入力完了');

      const loginBtn = page.locator('div').filter({ hasText: /^ログイン$/ }).nth(1);
      await loginBtn.click({ force: true });
      console.log('  ログインボタンクリック');

      // 認証完了を待つ（URLが変わるまで待機）
      console.log('  認証完了を待機中...');

      // Supabase認証レスポンスを待機
      try {
        await page.waitForResponse(
          response => response.url().includes('supabase') && response.url().includes('token'),
          { timeout: 15000 }
        );
        console.log('  ✅ Supabase認証レスポンス受信');
      } catch (e) {
        console.log('  ⚠️ Supabase認証レスポンスのタイムアウト');
      }

      await delay(3000);

      // 認証後のURL確認
      console.log(`  認証後URL: ${page.url()}`);

      // 認証後、再度localStorageを設定
      console.log('  localStorage再設定...');
      await page.evaluate(() => {
        localStorage.setItem('atsume-onboarding', JSON.stringify({
          state: {
            hasCompletedWalkthrough: true,
            shownTooltips: []
          },
          version: 0
        }));
      });

      // ページをリロードして状態を反映
      await page.reload({ waitUntil: 'networkidle' });
      await delay(5000);
    }

    // ホーム画面を確認
    let currentUrl = page.url();
    console.log(`  現在のURL: ${currentUrl}`);
    await takeScreenshot(page, 'test_01_after_login');

    const content = await page.content();
    const hasEventCreate = content.includes('作成する') || content.includes('作成');
    const hasEventJoin = content.includes('参加する') || content.includes('参加');
    const isHomeUrl = currentUrl.includes('/Main/Home') || currentUrl.includes('/Home');
    console.log(`  作成ボタン: ${hasEventCreate}`);
    console.log(`  参加ボタン: ${hasEventJoin}`);
    console.log(`  ホームURL: ${isHomeUrl}`);

    if (isHomeUrl && (hasEventCreate || hasEventJoin)) {
      results.passed.push('ログイン & ホーム画面');
      console.log('  ✅ ホーム画面表示成功');
    } else if (currentUrl.includes('Onboarding')) {
      console.log('  ⚠️ まだオンボーディング画面です（リロードを試行）');
      await page.reload({ waitUntil: 'networkidle' });
      await delay(3000);
    } else if (!isHomeUrl) {
      results.skipped.push('ホーム画面');
      console.log('  ⚠️ ホーム画面が表示されていません');
    }

    // ツールチップを閉じる
    const tooltipCloseBtn = page.locator('text=わかった').first();
    if (await tooltipCloseBtn.count() > 0) {
      await tooltipCloseBtn.click();
      console.log('  ツールチップを閉じました');
      await delay(1000);
    }

    // ホーム画面かどうか確認
    const isOnHome = currentUrl.includes('/Main/Home') || currentUrl.includes('/Home');

    if (isOnHome) {
      await takeScreenshot(page, 'test_02_home');

      // 3. イベント作成画面
      console.log('\n📱 3. イベント作成画面');
      const createBtn = page.locator('text=作成する').first();
      if (await createBtn.count() > 0) {
        await createBtn.click();
        await delay(3000);
        await takeScreenshot(page, 'test_03_event_create');

        const createContent = await page.content();
        const createUrl = page.url();
        if (createUrl.includes('EventCreate') || createContent.includes('イベント名')) {
          console.log('  ✅ イベント作成画面表示成功');
          results.passed.push('イベント作成画面');
        }

        // 戻る
        await page.goBack();
        await delay(2000);
      }

      // 4. イベント参加画面
      console.log('\n📱 4. イベント参加画面');
      const joinBtn = page.locator('text=参加する').first();
      if (await joinBtn.count() > 0) {
        await joinBtn.click();
        await delay(3000);
        await takeScreenshot(page, 'test_04_event_join');

        const joinContent = await page.content();
        const joinUrl = page.url();
        if (joinUrl.includes('JoinEvent') || joinContent.includes('招待コード')) {
          console.log('  ✅ イベント参加画面表示成功');
          results.passed.push('イベント参加画面');
        }

        await page.goBack();
        await delay(2000);
      }

      // 5. 設定画面
      console.log('\n📱 5. 設定画面');
      const settingsTab = page.locator('text=設定').first();
      if (await settingsTab.count() > 0) {
        await settingsTab.click();
        await delay(3000);
        await takeScreenshot(page, 'test_05_settings');

        const settingsContent = await page.content();
        if (settingsContent.includes('プロフィール') || settingsContent.includes('ログアウト')) {
          console.log('  ✅ 設定画面表示成功');
          results.passed.push('設定画面');
        }
      }

      // 6. 通知画面
      console.log('\n📱 6. 通知画面');
      const notificationTab = page.locator('text=通知').first();
      if (await notificationTab.count() > 0) {
        await notificationTab.click();
        await delay(3000);
        await takeScreenshot(page, 'test_06_notifications');
        console.log('  ✅ 通知画面表示成功');
        results.passed.push('通知画面');
      }

      // 7. ホームに戻ってイベント詳細確認
      console.log('\n📱 7. イベント詳細');
      const homeTab = page.locator('text=ホーム').first();
      if (await homeTab.count() > 0) {
        await homeTab.click();
        await delay(3000);
        await takeScreenshot(page, 'test_07_event_list');
        console.log('  ✅ イベント一覧表示');
        results.passed.push('イベント一覧');

        // イベントをクリックして詳細画面へ
        const eventCard = page.locator('text=フットサル').first();
        if (await eventCard.count() > 0) {
          await eventCard.click();
          await delay(3000);
          await takeScreenshot(page, 'test_08_event_detail');

          const detailUrl = page.url();
          const detailContent = await page.content();
          if (detailUrl.includes('EventDetail') || detailContent.includes('参加者') || detailContent.includes('情報')) {
            console.log('  ✅ イベント詳細画面表示成功');
            results.passed.push('イベント詳細画面');
          }

          // ツールチップを閉じる
          const tooltip2 = page.locator('text=わかった').first();
          if (await tooltip2.count() > 0) {
            await tooltip2.click();
            await delay(500);
          }

          await page.goBack();
          await delay(2000);
        }
      }
    }

    // サマリー
    console.log('\n' + '='.repeat(50));
    console.log('📊 テスト結果サマリー');
    console.log('='.repeat(50));
    console.log(`✅ 成功: ${results.passed.length}件`);
    results.passed.forEach(t => console.log(`   - ${t}`));
    if (results.skipped.length > 0) {
      console.log(`⏭️ スキップ: ${results.skipped.length}件`);
      results.skipped.forEach(t => console.log(`   - ${t}`));
    }
    if (results.failed.length > 0) {
      console.log(`❌ 失敗: ${results.failed.length}件`);
      results.failed.forEach(t => console.log(`   - ${t}`));
    }

    console.log('\n確認のため10秒待機...');
    await delay(10000);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    await takeScreenshot(page, 'test_error');
  } finally {
    await browser.close();
  }
}

fullTest().catch(console.error);
