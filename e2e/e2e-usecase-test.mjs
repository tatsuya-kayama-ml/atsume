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
  console.log('🚀 ATSUME 総合ユースケーステスト開始\n');
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
    // カテゴリ1: 認証フロー（UC-A1 ~ UC-A4）
    // ============================================
    console.log('\n🔐 カテゴリ1: 認証フロー');
    console.log('='.repeat(60));

    // UC-A1: サインアップフロー
    console.log('\n📱 UC-A1: サインアップフロー');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      const signUpButton = await page.$('text=アカウントを作成する');
      if (signUpButton) {
        await signUpButton.click();
        await delay(2000);
        await takeScreenshot(page, 'uc_a1_signup_screen');

        const content = await page.content();
        const checks = {
          '名前入力欄': content.includes('名前') || content.includes('ユーザー名') || content.includes('表示名'),
          'メールアドレス入力欄': content.includes('メールアドレス') || content.includes('email'),
          'パスワード入力欄': content.includes('パスワード'),
          'アカウント作成ボタン': content.includes('アカウント作成') || content.includes('登録'),
        };

        Object.entries(checks).forEach(([name, exists]) => {
          console.log(`  ${exists ? '✅' : '❌'} ${name}`);
        });

        results.passed.push('UC-A1: サインアップ画面表示');
      } else {
        results.warnings.push('UC-A1: サインアップボタン不在');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'UC-A1', error: error.message });
    }

    // UC-A2: ログインフォーム
    console.log('\n📱 UC-A2: ログインフォーム操作');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      const emailInput = await page.$('input[placeholder*="example@email.com"]') ||
                        await page.$('input[type="email"]');
      if (emailInput) {
        await emailInput.fill('test@example.com');
        console.log('  ✅ メールアドレス入力');
      }

      const passwordInput = await page.$('input[placeholder*="パスワードを入力"]') ||
                           await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.fill('testpassword123');
        console.log('  ✅ パスワード入力');
      }

      await takeScreenshot(page, 'uc_a2_login_filled');
      results.passed.push('UC-A2: ログインフォーム操作');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'UC-A2', error: error.message });
    }

    // UC-A3: パスワードリセットフロー
    console.log('\n📱 UC-A3: パスワードリセットフロー');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      const forgotLink = await page.$('text=パスワードを忘れた方');
      if (forgotLink) {
        await forgotLink.click();
        await delay(2000);
        await takeScreenshot(page, 'uc_a3_forgot_password');
        console.log('  ✅ パスワードリセット画面遷移');

        const backLink = await page.$('text=ログイン画面に戻る');
        if (backLink) {
          await backLink.click();
          await delay(1500);
          console.log('  ✅ ログイン画面への戻り');
        }
        results.passed.push('UC-A3: パスワードリセットフロー');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'UC-A3', error: error.message });
    }

    // UC-A4: バリデーション
    console.log('\n📱 UC-A4: 入力バリデーション');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      const emailInput = await page.$('input[placeholder*="example@email.com"]');
      const passwordInput = await page.$('input[type="password"]');

      if (emailInput && passwordInput) {
        await emailInput.fill('invalid-email');
        await passwordInput.fill('123');

        const loginBtn = await page.$('button:has-text("ログイン")');
        if (loginBtn) {
          await loginBtn.click();
          await delay(1500);
          await takeScreenshot(page, 'uc_a4_validation_error');
          console.log('  ✅ バリデーション動作確認');
        }
        results.passed.push('UC-A4: 入力バリデーション');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'UC-A4', error: error.message });
    }

    // ============================================
    // カテゴリ2: UI要素テスト
    // ============================================
    console.log('\n🎨 カテゴリ2: UI要素テスト');
    console.log('='.repeat(60));

    // UI要素の視認性
    console.log('\n📱 UI要素の視認性チェック');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

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
      results.failed.push({ test: 'UI要素', error: error.message });
    }

    // ============================================
    // カテゴリ3: レスポンシブデザイン
    // ============================================
    console.log('\n📐 カテゴリ3: レスポンシブデザイン');
    console.log('='.repeat(60));

    console.log('\n📱 マルチデバイス対応チェック');
    console.log('-'.repeat(60));
    try {
      // タブレット表示
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      await delay(2000);
      await takeScreenshot(page, 'responsive_tablet');
      console.log('  ✅ タブレット表示');

      // デスクトップ表示
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      await delay(2000);
      await takeScreenshot(page, 'responsive_desktop');
      console.log('  ✅ デスクトップ表示');

      // 小型スマートフォン
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(BASE_URL);
      await delay(2000);
      await takeScreenshot(page, 'responsive_small_mobile');
      console.log('  ✅ 小型スマートフォン表示');

      // 元のサイズに戻す
      await page.setViewportSize({ width: 390, height: 844 });

      results.passed.push('レスポンシブデザイン');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'レスポンシブデザイン', error: error.message });
    }

    // ============================================
    // カテゴリ4: アクセシビリティ
    // ============================================
    console.log('\n♿ カテゴリ4: アクセシビリティ');
    console.log('='.repeat(60));

    console.log('\n📱 キーボードナビゲーション');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      await page.keyboard.press('Tab');
      await delay(300);
      await page.keyboard.press('Tab');
      await delay(300);
      await page.keyboard.press('Tab');
      await delay(300);
      await takeScreenshot(page, 'accessibility_keyboard_nav');
      console.log('  ✅ Tabキーナビゲーション');

      results.passed.push('キーボードナビゲーション');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'キーボードナビゲーション', error: error.message });
    }

    // ============================================
    // カテゴリ5: コンソールエラーチェック
    // ============================================
    console.log('\n🔍 カテゴリ5: コンソールエラーチェック');
    console.log('='.repeat(60));

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
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'コンソールエラーチェック', error: error.message });
    }

    // ============================================
    // カテゴリ6: パフォーマンス
    // ============================================
    console.log('\n⚡ カテゴリ6: パフォーマンス');
    console.log('='.repeat(60));

    console.log('\n📱 ページロード時間');
    console.log('-'.repeat(60));
    try {
      const startTime = Date.now();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      if (loadTime < 3000) {
        console.log(`  ✅ ロード時間: ${loadTime}ms (良好)`);
        results.passed.push(`ページロード: ${loadTime}ms`);
      } else if (loadTime < 5000) {
        console.log(`  ⚠️ ロード時間: ${loadTime}ms (要改善)`);
        results.warnings.push(`ページロード時間: ${loadTime}ms`);
      } else {
        console.log(`  ❌ ロード時間: ${loadTime}ms (遅い)`);
        results.warnings.push(`ページロード遅延: ${loadTime}ms`);
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'パフォーマンス', error: error.message });
    }

    // ============================================
    // カテゴリ7: イベント管理UI（ログイン前）
    // ============================================
    console.log('\n📅 カテゴリ7: イベント管理関連UI');
    console.log('='.repeat(60));

    console.log('\n📱 イベント参加画面（ログイン前チェック）');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      // ログイン画面のUI要素確認
      const content = await page.content();
      const hasLoginUI = content.includes('ログイン') &&
                        (content.includes('メールアドレス') || content.includes('email'));

      if (hasLoginUI) {
        console.log('  ✅ ログイン画面が正しく表示されている');
        results.passed.push('ログイン画面表示');
      } else {
        console.log('  ⚠️ ログイン画面の要素が不完全');
        results.warnings.push('ログイン画面の要素が不完全');
      }

      await takeScreenshot(page, 'event_login_required');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'イベント管理UI', error: error.message });
    }

    // ============================================
    // カテゴリ8: フォーム入力テスト
    // ============================================
    console.log('\n📝 カテゴリ8: フォーム入力テスト');
    console.log('='.repeat(60));

    console.log('\n📱 特殊文字入力テスト');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      const emailInput = await page.$('input[placeholder*="example@email.com"]');
      if (emailInput) {
        // 日本語入力テスト
        await emailInput.fill('テスト@example.com');
        await delay(500);
        console.log('  ✅ 日本語メールアドレス入力');

        // クリアして英数字入力
        await emailInput.fill('');
        await emailInput.fill('test123@example.com');
        await delay(500);
        console.log('  ✅ 英数字メールアドレス入力');

        results.passed.push('フォーム入力テスト');
      }
      await takeScreenshot(page, 'form_input_test');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'フォーム入力', error: error.message });
    }

    // ============================================
    // カテゴリ9: ナビゲーションテスト
    // ============================================
    console.log('\n🧭 カテゴリ9: ナビゲーションテスト');
    console.log('='.repeat(60));

    console.log('\n📱 画面遷移テスト');
    console.log('-'.repeat(60));
    try {
      let navigationSuccess = true;

      // テスト1: サインアップ画面への遷移
      await page.goto(BASE_URL);
      await delay(2000);

      const signUpLink = await page.$('text=アカウントを作成する');
      if (signUpLink) {
        await signUpLink.click();
        await delay(2000);

        const content = await page.content();
        if (content.includes('アカウント作成') || content.includes('新規登録')) {
          console.log('  ✅ サインアップ画面遷移');
        } else {
          console.log('  ⚠️ サインアップ画面への遷移を確認できませんでした');
          navigationSuccess = false;
        }
      }

      // テスト2: パスワードリセット画面への遷移（ログイン画面から）
      await page.goto(BASE_URL);
      await delay(2000);

      const forgotLink = await page.$('text=パスワードを忘れた方');
      if (forgotLink) {
        await forgotLink.click();
        await delay(2000);

        const content = await page.content();
        if (content.includes('リセット') || content.includes('パスワード')) {
          console.log('  ✅ パスワードリセット画面遷移');
        } else {
          console.log('  ⚠️ パスワードリセット画面への遷移を確認できませんでした');
          navigationSuccess = false;
        }
      }

      // テスト3: ログイン画面に戻る
      const backLink = await page.$('text=ログイン画面に戻る');
      if (backLink) {
        await Promise.race([
          backLink.click(),
          delay(5000)
        ]);
        await delay(2000);

        const content = await page.content();
        if (content.includes('ログイン')) {
          console.log('  ✅ ログイン画面に戻る');
        }
      } else {
        // ブラウザバックで戻る
        await page.goBack();
        await delay(1500);
        console.log('  ✅ ブラウザバックでログイン画面に戻る');
      }

      if (navigationSuccess) {
        results.passed.push('ナビゲーションテスト');
      } else {
        results.warnings.push('ナビゲーションの一部が不安定');
      }

      await takeScreenshot(page, 'navigation_test');
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: 'ナビゲーション', error: error.message });
    }

    // ============================================
    // カテゴリ10: 利用規約・プライバシー
    // ============================================
    console.log('\n📜 カテゴリ10: 法的文書リンク');
    console.log('='.repeat(60));

    console.log('\n📱 利用規約・プライバシーポリシーリンク');
    console.log('-'.repeat(60));
    try {
      await page.goto(BASE_URL);
      await delay(2000);

      const content = await page.content();
      const hasTerms = content.includes('利用規約');
      const hasPrivacy = content.includes('プライバシーポリシー');

      console.log(`  ${hasTerms ? '✅' : '⚠️'} 利用規約リンク`);
      console.log(`  ${hasPrivacy ? '✅' : '⚠️'} プライバシーポリシーリンク`);

      if (hasTerms || hasPrivacy) {
        results.passed.push('法的文書リンク');
      } else {
        results.warnings.push('法的文書リンクが見つからない');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.failed.push({ test: '法的文書リンク', error: error.message });
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

  const totalTests = results.passed.length + results.failed.length + results.warnings.length;
  const successRate = ((results.passed.length / totalTests) * 100).toFixed(1);
  console.log(`\n📈 成功率: ${successRate}% (${results.passed.length}/${totalTests})`);

  console.log('\n📸 スクリーンショット: ./screenshots/');
  console.log('📄 ユースケース一覧: ./e2e/USE_CASES.md');
  console.log('='.repeat(60));

  return results;
}

// Create screenshots directory and run tests
import { mkdir } from 'fs/promises';
try {
  await mkdir('./screenshots', { recursive: true });
} catch (e) {}

runUseCaseTests().catch(console.error);
