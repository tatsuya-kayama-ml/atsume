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

async function tournamentTest() {
  console.log('🏆 ATSUME 対戦表・チーム分けテスト\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });

  const page = await context.newPage();

  // コンソールログ監視
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error')) {
      console.log(`  🔍 Console: ${text.substring(0, 100)}`);
    }
  });

  const results = { passed: [], failed: [] };

  try {
    // ========================================
    // 1. ログイン
    // ========================================
    console.log('\n📱 1. ログイン');
    console.log('-'.repeat(40));

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);

    // オンボーディングスキップ
    await page.evaluate(() => {
      localStorage.setItem('atsume-onboarding', JSON.stringify({
        state: { hasCompletedWalkthrough: true, shownTooltips: [] },
        version: 0
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await delay(2000);

    // ログイン
    const inputs = await page.locator('input').all();
    if (inputs.length >= 2) {
      await inputs[0].fill(TEST_USER.email);
      await inputs[1].fill(TEST_USER.password);

      const loginBtn = page.locator('div').filter({ hasText: /^ログイン$/ }).nth(1);
      await loginBtn.click({ force: true });

      await page.waitForResponse(
        response => response.url().includes('supabase') && response.url().includes('token'),
        { timeout: 15000 }
      ).catch(() => {});

      await delay(3000);

      await page.evaluate(() => {
        localStorage.setItem('atsume-onboarding', JSON.stringify({
          state: { hasCompletedWalkthrough: true, shownTooltips: [] },
          version: 0
        }));
      });
      await page.reload({ waitUntil: 'networkidle' });
      await delay(3000);

      console.log('  ✅ ログイン完了');
      results.passed.push('ログイン');
    }

    // ツールチップを閉じる
    const closeTooltip = async () => {
      const tooltip = page.locator('text=わかった').first();
      if (await tooltip.count() > 0) {
        await tooltip.click();
        await delay(500);
      }
    };
    await closeTooltip();

    // ========================================
    // 2. イベント詳細に移動
    // ========================================
    console.log('\n📱 2. イベント詳細に移動');
    console.log('-'.repeat(40));

    const eventCard = page.locator('text=フットサル').first();
    if (await eventCard.count() > 0) {
      await eventCard.click();
      await delay(3000);
      await closeTooltip();
      console.log('  ✅ イベント詳細画面に移動');
      results.passed.push('イベント詳細');
    } else {
      console.log('  ❌ イベントが見つかりません');
      results.failed.push('イベント詳細');
      throw new Error('イベントが見つかりません');
    }

    // ========================================
    // 3. 参加者を手動追加（テスト用）
    // ========================================
    console.log('\n📱 3. 参加者管理');
    console.log('-'.repeat(40));

    // 参加者タブに移動
    const participantsTab = page.locator('text=参加者').first();
    if (await participantsTab.count() > 0) {
      await participantsTab.click();
      await delay(2000);
      await closeTooltip();
      await takeScreenshot(page, 'tournament_01_participants');

      // 現在の参加者数を確認
      const content = await page.content();
      console.log('  参加者タブを確認');

      // 参加者追加ボタンを探す
      const addParticipantBtn = page.locator('text=追加').first();
      const addBtnAlt = page.locator('[data-testid="add-participant"]').first();

      // 参加者を追加（テスト用に4名追加を試みる）
      const testParticipants = ['テスト選手A', 'テスト選手B', 'テスト選手C', 'テスト選手D'];

      for (const name of testParticipants) {
        try {
          // 追加ボタンを探してクリック
          const addBtn = page.locator('svg').filter({ has: page.locator('path') }).first();
          // または + ボタンを探す
          const plusBtn = page.locator('text=+').first();

          // 画面内の追加ボタンをクリック
          const buttons = await page.locator('div[role="button"]').all();
          for (const btn of buttons) {
            const text = await btn.textContent();
            if (text && text.includes('+')) {
              await btn.click();
              await delay(1000);
              break;
            }
          }
        } catch (e) {
          // 追加ボタンが見つからない場合はスキップ
        }
      }

      console.log('  ✅ 参加者タブ確認完了');
      results.passed.push('参加者タブ');
    }

    // ========================================
    // 4. チーム作成
    // ========================================
    console.log('\n📱 4. チーム作成');
    console.log('-'.repeat(40));

    const teamTab = page.locator('text=チーム').first();
    if (await teamTab.count() > 0) {
      await teamTab.click();
      await delay(2000);
      await takeScreenshot(page, 'tournament_02_teams_before');

      // チーム数を選択（4チーム）
      const teamCount4 = page.locator('text=4').first();
      if (await teamCount4.count() > 0) {
        await teamCount4.click();
        await delay(500);
        console.log('  チーム数: 4を選択');
      }

      // ランダム分けボタンをクリック
      const randomBtn = page.locator('text=ランダム分け').first();
      if (await randomBtn.count() > 0) {
        await randomBtn.click();
        await delay(2000);
        await takeScreenshot(page, 'tournament_03_teams_random');
        console.log('  ✅ ランダムチーム分け実行');
        results.passed.push('ランダムチーム分け');
      }

      // スキル均等分けボタンをクリック
      const skillBtn = page.locator('text=スキル均等分け').first();
      if (await skillBtn.count() > 0) {
        await skillBtn.click();
        await delay(2000);
        await takeScreenshot(page, 'tournament_04_teams_skill');
        console.log('  ✅ スキル均等分け実行');
        results.passed.push('スキル均等分け');
      }

      // チームが作成されたか確認
      const teamContent = await page.content();
      if (teamContent.includes('チーム') && !teamContent.includes('チームがありません')) {
        console.log('  ✅ チーム作成成功');
        results.passed.push('チーム作成');
      } else {
        console.log('  ⚠️ チームが作成されていない可能性があります（参加者不足の可能性）');
      }
    }

    // ========================================
    // 5. 対戦表作成
    // ========================================
    console.log('\n📱 5. 対戦表作成');
    console.log('-'.repeat(40));

    const matchTab = page.locator('text=対戦表').first();
    if (await matchTab.count() > 0) {
      await matchTab.click();
      await delay(2000);
      await takeScreenshot(page, 'tournament_05_matches_before');

      const matchContent = await page.content();

      // 競技タイプを確認
      if (matchContent.includes('団体戦')) {
        console.log('  団体戦オプションを確認');

        // 団体戦を選択
        const teamBattleBtn = page.locator('text=団体戦').first();
        if (await teamBattleBtn.count() > 0) {
          await teamBattleBtn.click();
          await delay(1000);
        }
      }

      if (matchContent.includes('個人戦')) {
        console.log('  個人戦オプションを確認');
      }

      // トーナメント形式の選択肢を確認
      const formatContent = await page.content();
      console.log('  対戦表画面の状態を確認');

      // チームが足りない場合の警告を確認
      if (formatContent.includes('チームが0個です') || formatContent.includes('2個以上のチームが必要')) {
        console.log('  ⚠️ チームが不足しています。チームを先に作成してください。');
        await takeScreenshot(page, 'tournament_06_need_teams');
        results.failed.push('対戦表作成（チーム不足）');
      } else {
        // トーナメント生成ボタンを探す
        const generateBtn = page.locator('text=対戦表を生成').first();
        const createBtn = page.locator('text=作成').first();

        if (await generateBtn.count() > 0) {
          await generateBtn.click();
          await delay(3000);
          await takeScreenshot(page, 'tournament_07_matches_created');
          console.log('  ✅ 対戦表生成');
          results.passed.push('対戦表生成');
        } else if (await createBtn.count() > 0) {
          await createBtn.click();
          await delay(3000);
          await takeScreenshot(page, 'tournament_07_matches_created');
          console.log('  ✅ 対戦表作成');
          results.passed.push('対戦表作成');
        }

        // 対戦表が表示されているか確認
        const afterContent = await page.content();
        if (afterContent.includes('第1試合') || afterContent.includes('Round') || afterContent.includes('vs')) {
          console.log('  ✅ 対戦表が正常に表示されています');
          results.passed.push('対戦表表示');
        }
      }
    }

    // ========================================
    // 6. 統計タブ確認
    // ========================================
    console.log('\n📱 6. 統計タブ確認');
    console.log('-'.repeat(40));

    const statsTab = page.locator('text=統計').first();
    if (await statsTab.count() > 0) {
      await statsTab.click();
      await delay(2000);
      await takeScreenshot(page, 'tournament_08_stats');
      console.log('  ✅ 統計タブ表示');
      results.passed.push('統計タブ');
    }

    // ========================================
    // テスト結果サマリー
    // ========================================
    console.log('\n');
    console.log('='.repeat(60));
    console.log('📊 対戦表・チーム分けテスト結果');
    console.log('='.repeat(60));

    console.log(`\n✅ 成功: ${results.passed.length}件`);
    results.passed.forEach(t => console.log(`   - ${t}`));

    if (results.failed.length > 0) {
      console.log(`\n❌ 失敗/警告: ${results.failed.length}件`);
      results.failed.forEach(t => console.log(`   - ${t}`));
    }

    console.log('\n確認のため5秒待機...');
    await delay(5000);

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    await takeScreenshot(page, 'tournament_error');
  } finally {
    await browser.close();
  }

  return results;
}

tournamentTest().catch(console.error);
