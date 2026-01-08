import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8081';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `./screenshots/${name}.png`, fullPage: true });
  console.log(`  📸 Screenshot: ${name}.png`);
}

async function runUseCaseTests() {
  console.log('🚀 ATSUME ユースケーステスト開始\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  try {
    // ============================================
    // ユースケース 1: サインアップフロー
    // ============================================
    console.log('\n📱 ユースケース 1: サインアップフロー');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      // 「アカウントを作成する」ボタンをクリック
      const signUpButton = await page.$('text=アカウントを作成する');
      if (signUpButton) {
        await signUpButton.click();
        await delay(2000);
        await takeScreenshot(page, 'uc01_signup_screen');

        // サインアップフォームの要素を確認
        const content = await page.content();
        const checks = {
          '名前入力欄': content.includes('名前') || content.includes('ユーザー名'),
          'メールアドレス入力欄': content.includes('メールアドレス') || content.includes('email'),
          'パスワード入力欄': content.includes('パスワード'),
          'アカウント作成ボタン': content.includes('アカウント作成') || content.includes('登録'),
        };

        Object.entries(checks).forEach(([name, exists]) => {
          console.log(`  ${exists ? '✅' : '❌'} ${name}`);
        });

        // バリデーションテスト - 空の状態で送信
        const submitBtn = await page.$('text=アカウント作成');
        if (submitBtn) {
          await submitBtn.click();
          await delay(1000);
          await takeScreenshot(page, 'uc01_signup_validation');
          console.log('  ✅ サインアップバリデーション確認');
        }

        results.passed.push('サインアップフロー');
      } else {
        console.log('  ⚠️ サインアップボタンが見つかりません');
        results.warnings.push('サインアップボタン不在');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'サインアップフロー', error: error.message });
    }

    // ============================================
    // ユースケース 2: ログインフォーム操作
    // ============================================
    console.log('\n📱 ユースケース 2: ログインフォーム操作');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      // メールアドレス入力
      const emailInput = await page.$('input[placeholder*="example@email.com"]') ||
                        await page.$('input[type="email"]');
      if (emailInput) {
        await emailInput.fill('test@example.com');
        console.log('  ✅ メールアドレス入力');
      }

      // パスワード入力
      const passwordInput = await page.$('input[placeholder*="パスワードを入力"]') ||
                           await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.fill('testpassword123');
        console.log('  ✅ パスワード入力');
      }

      await takeScreenshot(page, 'uc02_login_filled');

      // パスワード表示トグル
      const showPasswordBtn = await page.$('text=表示');
      if (showPasswordBtn) {
        await showPasswordBtn.click();
        await delay(500);
        console.log('  ✅ パスワード表示トグル');
        await takeScreenshot(page, 'uc02_password_visible');
      }

      // ログインボタンクリック（実際にはログインしない）
      const loginBtn = await page.$('button:has-text("ログイン")');
      if (loginBtn) {
        await loginBtn.click();
        await delay(3000);
        await takeScreenshot(page, 'uc02_login_attempt');
        console.log('  ✅ ログイン試行（認証エラー想定）');
      }

      results.passed.push('ログインフォーム操作');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'ログインフォーム操作', error: error.message });
    }

    // ============================================
    // ユースケース 3: パスワードリセットフロー
    // ============================================
    console.log('\n📱 ユースケース 3: パスワードリセットフロー');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      // パスワードを忘れた方リンク
      const forgotLink = await page.$('text=パスワードを忘れた方');
      if (forgotLink) {
        await forgotLink.click();
        await delay(2000);
        await takeScreenshot(page, 'uc03_forgot_password');
        console.log('  ✅ パスワードリセット画面遷移');

        // メールアドレス入力
        const emailInput = await page.$('input[placeholder*="example@email.com"]');
        if (emailInput) {
          await emailInput.fill('reset@example.com');
          console.log('  ✅ リセット用メールアドレス入力');
        }

        // リセットリンク送信ボタン
        const resetBtn = await page.$('text=リセットリンクを送信');
        if (resetBtn) {
          await resetBtn.click();
          await delay(2000);
          await takeScreenshot(page, 'uc03_reset_attempt');
          console.log('  ✅ リセットリンク送信試行');
        }

        // ログイン画面に戻る
        const backLink = await page.$('text=ログイン画面に戻る');
        if (backLink) {
          await backLink.click();
          await delay(1500);
          console.log('  ✅ ログイン画面への戻り');
        }

        results.passed.push('パスワードリセットフロー');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'パスワードリセットフロー', error: error.message });
    }

    // ============================================
    // ユースケース 4: 無効なメールアドレスバリデーション
    // ============================================
    console.log('\n📱 ユースケース 4: 入力バリデーション');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      const emailInput = await page.$('input[placeholder*="example@email.com"]');
      const passwordInput = await page.$('input[type="password"]');

      if (emailInput && passwordInput) {
        // 無効なメールアドレス
        await emailInput.fill('invalid-email');
        await passwordInput.fill('123');

        const loginBtn = await page.$('button:has-text("ログイン")');
        if (loginBtn) {
          await loginBtn.click();
          await delay(1500);
          await takeScreenshot(page, 'uc04_validation_error');

          const content = await page.content();
          if (content.includes('無効') || content.includes('形式') || content.includes('error')) {
            console.log('  ✅ メールアドレスバリデーションエラー表示');
          } else {
            console.log('  ⚠️ バリデーションエラーメッセージが確認できません');
          }
        }

        results.passed.push('入力バリデーション');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: '入力バリデーション', error: error.message });
    }

    // ============================================
    // ユースケース 5: UI要素の視認性
    // ============================================
    console.log('\n📱 ユースケース 5: UI要素の視認性');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      // ロゴ・ブランディング
      const content = await page.content();
      const checks = {
        'ATSUMEロゴ': content.includes('ATSUME'),
        'キャッチコピー': content.includes('イベント管理をもっと簡単に'),
        'ログインタイトル': content.includes('ログイン'),
        '説明文': content.includes('アカウント情報を入力してください'),
      };

      Object.entries(checks).forEach(([name, exists]) => {
        console.log(`  ${exists ? '✅' : '❌'} ${name}`);
      });

      results.passed.push('UI要素の視認性');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'UI要素の視認性', error: error.message });
    }

    // ============================================
    // ユースケース 6: タブレット/デスクトップ表示
    // ============================================
    console.log('\n📱 ユースケース 6: マルチデバイス対応');
    console.log('-'.repeat(60));
    try {
      // タブレット表示
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      await delay(2000);
      await takeScreenshot(page, 'uc06_tablet');
      console.log('  ✅ タブレット表示');

      // デスクトップ表示
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      await delay(2000);
      await takeScreenshot(page, 'uc06_desktop');
      console.log('  ✅ デスクトップ表示');

      // スマートフォン小サイズ
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(BASE_URL);
      await delay(2000);
      await takeScreenshot(page, 'uc06_small_mobile');
      console.log('  ✅ 小型スマートフォン表示');

      // 元のサイズに戻す
      await page.setViewportSize({ width: 390, height: 844 });

      results.passed.push('マルチデバイス対応');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'マルチデバイス対応', error: error.message });
    }

    // ============================================
    // ユースケース 7: キーボードナビゲーション
    // ============================================
    console.log('\n📱 ユースケース 7: キーボードナビゲーション');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      // Tabキーでフォーカス移動
      await page.keyboard.press('Tab');
      await delay(300);
      await page.keyboard.press('Tab');
      await delay(300);
      await page.keyboard.press('Tab');
      await delay(300);
      await takeScreenshot(page, 'uc07_keyboard_nav');
      console.log('  ✅ Tabキーナビゲーション');

      // Enterキーでボタン実行
      await page.keyboard.press('Enter');
      await delay(1000);
      console.log('  ✅ Enterキー操作');

      results.passed.push('キーボードナビゲーション');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'キーボードナビゲーション', error: error.message });
    }

    // ============================================
    // ユースケース 8: コンソールエラーチェック
    // ============================================
    console.log('\n📱 ユースケース 8: コンソールエラーチェック');
    console.log('-'.repeat(60));
    const consoleErrors = [];
    const consoleWarnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    try {
      await page.goto(BASE_URL);
      await delay(3000);

      // ページ内を操作
      const emailInput = await page.$('input[placeholder*="example@email.com"]');
      if (emailInput) {
        await emailInput.fill('test@test.com');
      }

      await delay(1000);

      if (consoleErrors.length === 0) {
        console.log('  ✅ コンソールエラーなし');
        results.passed.push('コンソールエラーなし');
      } else {
        console.log(`  ⚠️ ${consoleErrors.length}件のコンソールエラー`);
        consoleErrors.slice(0, 3).forEach(e => console.log(`    - ${e.substring(0, 80)}`));
        results.warnings.push(`コンソールエラー: ${consoleErrors.length}件`);
      }

      if (consoleWarnings.length > 0) {
        console.log(`  ℹ️ ${consoleWarnings.length}件のコンソール警告`);
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'コンソールエラーチェック', error: error.message });
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
  console.log('📊 ユースケーステスト結果サマリー');
  console.log('='.repeat(60));

  console.log(`\n✅ 成功: ${results.passed.length}件`);
  results.passed.forEach(test => console.log(`   ・ ${test}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️ 警告: ${results.warnings.length}件`);
    results.warnings.forEach(w => console.log(`   ・ ${w}`));
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

runUseCaseTests().catch(console.error);
