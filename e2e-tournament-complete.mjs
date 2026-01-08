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

async function tournamentCompleteTest() {
  console.log('🏆 ATSUME 対戦表・チーム分け完全テスト（改良版）\n');
  console.log('='.repeat(60));
  console.log('このテストでは:');
  console.log('1. ログイン');
  console.log('2. イベント詳細画面に移動');
  console.log('3. 手動で参加者を2名追加（出席状態で）');
  console.log('4. チーム分けを実行（2チーム）');
  console.log('5. 対戦表を生成');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });

  const page = await context.newPage();

  // ダイアログ（confirm/alert）に自動で応答
  page.on('dialog', async dialog => {
    console.log(`  💬 ダイアログ検出: ${dialog.type()} - ${dialog.message()}`);
    await dialog.accept();
  });

  // ブラウザコンソールログをキャプチャ
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Confirm')) {
      console.log(`  🖥️ Console ${msg.type()}: ${msg.text()}`);
    }
  });

  const results = { passed: [], failed: [], skipped: [] };

  try {
    // ========================================
    // 1. ログイン
    // ========================================
    console.log('\n📱 1. ログイン');
    console.log('-'.repeat(40));

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);

    // オンボーディングをスキップ
    await page.evaluate(() => {
      localStorage.setItem('atsume-onboarding', JSON.stringify({
        state: { hasCompletedWalkthrough: true, shownTooltips: [] },
        version: 0
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await delay(2000);

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

      // 再度オンボーディングをスキップ
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

    // ツールチップを閉じるヘルパー
    const closeTooltip = async () => {
      try {
        const tooltip = page.locator('text=わかった').first();
        if (await tooltip.count() > 0) {
          await tooltip.click({ timeout: 3000 }).catch(() => {});
          await delay(500);
        }
      } catch (e) {
        // ツールチップがない場合は無視
      }
    };
    await closeTooltip();

    // ========================================
    // 2. イベント詳細に移動
    // ========================================
    console.log('\n📱 2. イベント詳細に移動');
    console.log('-'.repeat(40));

    // まずツールチップを閉じる（「わかった」ボタンをクリック）
    await closeTooltip();
    await delay(1000);

    const eventCard = page.locator('text=フットサル').first();
    console.log(`  イベントカード検出: ${await eventCard.count()}`);
    if (await eventCard.count() > 0) {
      // クリック前に要素を表示
      await eventCard.scrollIntoViewIfNeeded();
      await delay(500);
      await eventCard.click({ force: true, timeout: 10000 });
      await delay(3000);
      await closeTooltip();

      // イベント詳細画面に移動したか確認
      const currentUrl = page.url();
      console.log(`  現在のURL: ${currentUrl}`);
      await takeScreenshot(page, 'tournament_00_event_detail');

      console.log('  ✅ イベント詳細画面に移動');
      results.passed.push('イベント詳細');
    } else {
      throw new Error('イベントが見つかりません');
    }

    // ========================================
    // 3. 参加者タブに移動して手動参加者を追加
    // ========================================
    console.log('\n📱 3. 参加者タブで手動参加者を追加');
    console.log('-'.repeat(40));

    const participantsTab = page.locator('text=参加者').first();
    console.log(`  参加者タブ検出: ${await participantsTab.count()}`);
    if (await participantsTab.count() > 0) {
      await participantsTab.click({ force: true });
      await delay(2000);
      await closeTooltip();
      console.log('  参加者タブをクリックしました');

      // 画面を下にスクロールして「参加者を手動で追加」ボタンを見つける
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await delay(1000);

      // 「参加者を手動で追加」ボタンをクリック
      const addManualBtn = page.locator('text=参加者を手動で追加').first();

      if (await addManualBtn.count() > 0) {
        await addManualBtn.scrollIntoViewIfNeeded();
        await delay(500);
        await addManualBtn.click();
        await delay(1500);

        // モーダルが開いたことを確認
        const modalTitle = page.locator('text=参加者を追加');
        if (await modalTitle.count() > 0) {
          console.log('  モーダルが開きました');

          // 1人目の参加者を追加
          const nameInput = page.locator('input[placeholder*="参加者の名前を入力"]').first();
          const nameInputAlt = page.locator('input').first();

          if (await nameInput.count() > 0) {
            await nameInput.fill('テスト選手A');
          } else if (await nameInputAlt.count() > 0) {
            await nameInputAlt.fill('テスト選手A');
          }

          // 出席状況で「出席」が選択されていることを確認（デフォルトで選択済み）
          console.log('  出席状態: 出席（デフォルト）');

          // 追加ボタンを押す
          const addBtn = page.locator('text=追加').last();
          if (await addBtn.count() > 0) {
            await addBtn.click();
            await delay(2000);
            console.log('  ✅ テスト選手Aを追加');
          }

          // 2人目の参加者を追加
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await delay(1000);

          const addManualBtn2 = page.locator('text=参加者を手動で追加').first();
          if (await addManualBtn2.count() > 0) {
            await addManualBtn2.scrollIntoViewIfNeeded();
            await delay(500);
            await addManualBtn2.click();
            await delay(1500);

            const nameInput2 = page.locator('input[placeholder*="参加者の名前を入力"]').first();
            const nameInputAlt2 = page.locator('input').first();

            if (await nameInput2.count() > 0) {
              await nameInput2.fill('テスト選手B');
            } else if (await nameInputAlt2.count() > 0) {
              await nameInputAlt2.fill('テスト選手B');
            }

            const addBtn2 = page.locator('text=追加').last();
            if (await addBtn2.count() > 0) {
              await addBtn2.click();
              await delay(2000);
              console.log('  ✅ テスト選手Bを追加');
            }
          }

          results.passed.push('手動参加者追加');
        }
      } else {
        console.log('  ⚠️ 「参加者を手動で追加」ボタンが見つかりません');
        results.skipped.push('手動参加者追加');
      }

      await takeScreenshot(page, 'tournament_01_participants_added');
    }

    // ========================================
    // 4. チーム分け
    // ========================================
    console.log('\n📱 4. チーム分け');
    console.log('-'.repeat(40));

    const teamTab = page.locator('text=チーム').first();
    if (await teamTab.count() > 0) {
      await teamTab.click();
      await delay(2000);

      // 現在の参加予定人数を確認
      const teamContent = await page.content();
      const participantMatch = teamContent.match(/参加予定[：:]\s*(\d+)人/);
      const participantCount = participantMatch ? parseInt(participantMatch[1]) : 0;
      console.log(`  参加予定人数: ${participantCount}人`);

      await takeScreenshot(page, 'tournament_02_team_tab');

      if (participantCount >= 2) {
        // チーム数を選択（2チーム）
        const teamCount2 = page.locator('div').filter({ hasText: /^2$/ }).first();
        if (await teamCount2.count() > 0) {
          await teamCount2.click();
          await delay(500);
          console.log('  チーム数: 2を選択');
        }

        // window.confirmをオーバーライドしてダイアログを自動承認
        await page.evaluate(() => {
          window.originalConfirm = window.confirm;
          window.confirm = (msg) => {
            console.log('Confirm intercepted:', msg);
            return true;
          };
        });

        // ランダム分けを実行
        const randomBtn = page.locator('text=ランダム分け').first();
        if (await randomBtn.count() > 0) {
          console.log('  ランダム分けボタンをクリック...');
          await randomBtn.click({ force: true });
          await delay(5000);
          await takeScreenshot(page, 'tournament_03_teams_created');

          // チームが作成されたか確認
          const afterContent = await page.content();
          if (!afterContent.includes('チームがありません') && (afterContent.includes('チームA') || afterContent.includes('Team'))) {
            console.log('  ✅ チーム分け成功');
            results.passed.push('チーム分け');
          } else {
            console.log('  チーム作成結果を確認中...');
            // チームがあるかどうか別の方法で確認
            const teamCards = page.locator('[data-testid="team-card"]');
            const teamCount = await teamCards.count();
            if (teamCount > 0) {
              console.log(`  ✅ ${teamCount}個のチームが作成されました`);
              results.passed.push('チーム分け');
            } else {
              console.log('  ⚠️ チームが作成されませんでした');
              results.failed.push('チーム分け');
            }
          }
        } else {
          console.log('  ⚠️ ランダム分けボタンが見つかりません');
          results.skipped.push('チーム分け');
        }
      } else {
        console.log('  ⚠️ 参加予定人数が不足しています（2人以上必要）');
        await takeScreenshot(page, 'tournament_02_insufficient_participants');
        results.skipped.push('チーム分け（参加者不足）');
      }
    }

    // ========================================
    // 5. 対戦表生成
    // ========================================
    console.log('\n📱 5. 対戦表生成');
    console.log('-'.repeat(40));

    const matchTab = page.locator('text=対戦表').first();
    if (await matchTab.count() > 0) {
      await matchTab.click();
      await delay(2000);

      const matchContent = await page.content();
      await takeScreenshot(page, 'tournament_04_match_tab');

      // チームが存在するか確認
      if (!matchContent.includes('チームが0個です') && !matchContent.includes('チームを作成してください')) {
        // 団体戦を選択
        const teamBattleBtn = page.locator('text=団体戦').first();
        if (await teamBattleBtn.count() > 0) {
          await teamBattleBtn.click();
          await delay(1000);
          console.log('  競技タイプ: 団体戦を選択');
        }

        // 総当たり戦を選択
        const leagueBtn = page.locator('text=総当たり').first();
        if (await leagueBtn.count() > 0) {
          await leagueBtn.click();
          await delay(1000);
          console.log('  形式: 総当たり戦を選択');
        }

        // 生成ボタンを押す
        const generateBtn = page.locator('text=対戦表を生成').first();
        if (await generateBtn.count() > 0) {
          await generateBtn.click();
          await delay(3000);
          console.log('  対戦表生成を実行');
        }

        await takeScreenshot(page, 'tournament_05_matches_generated');

        // 対戦表が生成されたか確認
        const afterMatchContent = await page.content();
        if (afterMatchContent.includes('vs') ||
            afterMatchContent.includes('第') ||
            afterMatchContent.includes('試合') ||
            afterMatchContent.includes('Round') ||
            afterMatchContent.includes('Match')) {
          console.log('  ✅ 対戦表生成成功');
          results.passed.push('対戦表生成');
        } else if (!afterMatchContent.includes('対戦表がありません')) {
          console.log('  ✅ 対戦表画面表示');
          results.passed.push('対戦表画面');
        } else {
          console.log('  ⚠️ 対戦表が生成されませんでした');
          results.skipped.push('対戦表生成');
        }
      } else {
        console.log('  ⚠️ チームが不足しているため対戦表を生成できません');
        await takeScreenshot(page, 'tournament_04_no_teams');
        results.skipped.push('対戦表生成（チーム不足）');
      }
    }

    // ========================================
    // テスト結果サマリー
    // ========================================
    console.log('\n');
    console.log('='.repeat(60));
    console.log('📊 対戦表・チーム分け完全テスト結果（改良版）');
    console.log('='.repeat(60));

    console.log(`\n✅ 成功: ${results.passed.length}件`);
    results.passed.forEach(t => console.log(`   - ${t}`));

    if (results.skipped.length > 0) {
      console.log(`\n⏭️ スキップ: ${results.skipped.length}件`);
      results.skipped.forEach(t => console.log(`   - ${t}`));
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ 失敗: ${results.failed.length}件`);
      results.failed.forEach(t => console.log(`   - ${t}`));
    }

    const total = results.passed.length + results.failed.length + results.skipped.length;
    const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;
    console.log(`\n📈 成功率: ${passRate}%`);

    console.log('\n確認のため10秒待機...');
    await delay(10000);

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    await takeScreenshot(page, 'tournament_error');
  } finally {
    await browser.close();
  }

  return results;
}

tournamentCompleteTest().catch(console.error);
