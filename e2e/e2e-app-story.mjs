/**
 * ATSUME アプリ紹介ストーリー用スクリーンショット撮影スクリプト
 *
 * このスクリプトは、ATSUMEアプリの主要機能を紹介するための
 * スクリーンショットを撮影します。
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const BASE_URL = 'http://localhost:8081';
const STORY_DIR = './screenshots/story';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name, description) {
  await page.screenshot({ path: `${STORY_DIR}/${name}.png`, fullPage: false });
  console.log(`  📸 ${name}.png - ${description}`);
}

async function runAppStoryCapture() {
  console.log('🎬 ATSUME アプリ紹介ストーリー撮影開始\n');
  console.log('='.repeat(60));

  // スクリーンショット保存ディレクトリ作成
  try {
    await mkdir(STORY_DIR, { recursive: true });
  } catch (e) {}

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro サイズ
  });
  const page = await context.newPage();

  const screenshots = [];

  try {
    // ============================================
    // シーン1: ログイン画面（アプリの入り口）
    // ============================================
    console.log('\n🎬 シーン1: アプリの入り口');
    console.log('-'.repeat(60));

    await page.goto(BASE_URL);
    await delay(2000);
    await takeScreenshot(page, 'story_01_login', 'ログイン画面 - シンプルで使いやすいデザイン');
    screenshots.push({
      file: 'story_01_login.png',
      title: 'ログイン画面',
      description: 'ATSUMEへようこそ。シンプルで直感的なログイン画面から始まります。',
      scene: 1,
    });

    // サインアップ画面
    const signUpButton = await page.$('text=アカウントを作成する');
    if (signUpButton) {
      await signUpButton.click();
      await delay(2000);
      await takeScreenshot(page, 'story_02_signup', 'アカウント作成画面');
      screenshots.push({
        file: 'story_02_signup.png',
        title: 'アカウント作成',
        description: '名前、メールアドレス、パスワードを入力するだけで簡単に登録できます。',
        scene: 2,
      });

      // ログイン画面に戻る
      const backLink = await page.$('text=ログイン画面に戻る');
      if (backLink) {
        await backLink.click();
        await delay(1500);
      }
    }

    // ============================================
    // シーン2: ログイン実行
    // ============================================
    console.log('\n🎬 シーン2: ログイン');
    console.log('-'.repeat(60));

    // テスト用認証情報を入力
    const emailInput = await page.$('input[placeholder*="example@email.com"]') ||
                       await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      await emailInput.fill('demo@atsume.app');
      await passwordInput.fill('demo123456');
      await takeScreenshot(page, 'story_03_login_filled', 'ログイン情報入力');
      screenshots.push({
        file: 'story_03_login_filled.png',
        title: 'ログイン情報入力',
        description: 'メールアドレスとパスワードを入力してログインします。',
        scene: 3,
      });

      // ログインボタンをクリック（実際のログインはスキップ - デモ環境のため）
      const loginBtn = await page.$('button:has-text("ログイン")');
      if (loginBtn) {
        await loginBtn.click();
        await delay(3000);

        // ホーム画面が表示されたか確認
        const content = await page.content();
        if (content.includes('ホーム') || content.includes('イベント')) {
          await takeScreenshot(page, 'story_04_home', 'ホーム画面 - イベント一覧');
          screenshots.push({
            file: 'story_04_home.png',
            title: 'ホーム画面',
            description: 'ログイン後のホーム画面。作成したイベントや参加予定のイベントが一覧で表示されます。',
            scene: 4,
          });
        }
      }
    }

    // ============================================
    // シーン3: イベント作成（主催者フロー）
    // ============================================
    console.log('\n🎬 シーン3: イベント作成');
    console.log('-'.repeat(60));

    // イベント作成ボタンを探す
    const createEventBtn = await page.$('text=作成する') ||
                          await page.$('button:has-text("+")') ||
                          await page.$('[aria-label*="イベント作成"]');

    if (createEventBtn) {
      await createEventBtn.click();
      await delay(2000);
      await takeScreenshot(page, 'story_05_event_create', 'イベント作成画面');
      screenshots.push({
        file: 'story_05_event_create.png',
        title: 'イベント作成',
        description: 'イベント名、日時、場所、参加費を設定して新しいイベントを作成します。',
        scene: 5,
      });
    }

    // ============================================
    // レスポンシブデザインのデモ
    // ============================================
    console.log('\n🎬 シーン: レスポンシブデザイン');
    console.log('-'.repeat(60));

    // タブレット表示
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await delay(2000);
    await takeScreenshot(page, 'story_responsive_tablet', 'タブレット表示');
    screenshots.push({
      file: 'story_responsive_tablet.png',
      title: 'タブレット対応',
      description: 'iPadなどのタブレットでも快適に操作できます。',
      scene: 10,
    });

    // デスクトップ表示
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE_URL);
    await delay(2000);
    await takeScreenshot(page, 'story_responsive_desktop', 'デスクトップ表示');
    screenshots.push({
      file: 'story_responsive_desktop.png',
      title: 'デスクトップ対応',
      description: 'PCブラウザでも美しく表示されます。',
      scene: 11,
    });

    // 元のサイズに戻す
    await page.setViewportSize({ width: 390, height: 844 });

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  } finally {
    await browser.close();
  }

  // ============================================
  // 撮影結果サマリー
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 撮影結果サマリー');
  console.log('='.repeat(60));
  console.log(`\n撮影枚数: ${screenshots.length}枚`);
  console.log(`保存先: ${STORY_DIR}/`);

  console.log('\n📸 撮影したスクリーンショット:');
  screenshots.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.title}`);
    console.log(`     ファイル: ${s.file}`);
    console.log(`     説明: ${s.description}`);
  });

  return screenshots;
}

// 実行
runAppStoryCapture().catch(console.error);
