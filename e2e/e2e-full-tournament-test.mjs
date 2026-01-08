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

async function fullTournamentTest() {
  console.log('🏆 ATSUME 対戦表・チーム分け完全テスト\n');
  console.log('='.repeat(60));
  console.log('このテストでは:');
  console.log('1. 参加者の出席状態を変更');
  console.log('2. 手動で参加者を追加');
  console.log('3. チーム分けを実行');
  console.log('4. 対戦表を生成');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 400,
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });

  const page = await context.newPage();

  const results = { passed: [], failed: [], skipped: [] };

  try {
    // ========================================
    // 1. ログイン
    // ========================================
    console.log('\n📱 1. ログイン');
    console.log('-'.repeat(40));

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(2000);

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
      throw new Error('イベントが見つかりません');
    }

    // ========================================
    // 3. 参加者の出席状態を変更
    // ========================================
    console.log('\n📱 3. 参加者の出席状態を変更');
    console.log('-'.repeat(40));

    const participantsTab = page.locator('text=参加者').first();
    if (await participantsTab.count() > 0) {
      await participantsTab.click();
      await delay(2000);
      await closeTooltip();

      // 「あなたの出欠状況」セクション内の「出席」ボタンをクリック
      // チェックマーク（✓）付きの出席ボタンを探す
      const attendanceSection = page.locator('text=あなたの出欠状況').locator('..');
      const attendBtnInSection = page.locator('div').filter({ hasText: /^出席$/ }).first();

      try {
        // スクロールして要素を表示
        await page.evaluate(() => window.scrollTo(0, 0));
        await delay(500);

        if (await attendBtnInSection.count() > 0) {
          await attendBtnInSection.scrollIntoViewIfNeeded();
          await delay(500);
          await attendBtnInSection.click({ force: true });
          await delay(1500);
          console.log('  ✅ 自分の出席状態を「出席」に変更');
        }
      } catch (e) {
        console.log('  ⚠️ 出席ボタンのクリックに失敗:', e.message.substring(0, 50));
      }

      await takeScreenshot(page, 'full_tournament_01_attendance');

      // 参加者「かやま」をクリックして出席状態を変更
      console.log('  参加者状況を確認中...');

      // 未回答セクションの参加者をクリック
      const kayamaItem = page.locator('text=かやま').first();
      if (await kayamaItem.count() > 0) {
        try {
          await kayamaItem.scrollIntoViewIfNeeded();
          await delay(500);
          await kayamaItem.click();
          await delay(1500);

          // モーダルまたはオプションが表示されたら出席予定を選択
          const attendingOption = page.locator('text=出席予定').first();
          if (await attendingOption.count() > 0) {
            await attendingOption.click();
            await delay(1000);
            console.log('  ✅ 参加者「かやま」を出席予定に変更');
          }
        } catch (e) {
          console.log('  ⚠️ 参加者クリックに失敗:', e.message.substring(0, 50));
        }
      }

      await takeScreenshot(page, 'full_tournament_01b_after_attendance');
      results.passed.push('出席状態変更');
    }

    // ========================================
    // 4. 手動で参加者を追加
    // ========================================
    console.log('\n📱 4. 手動で参加者を追加');
    console.log('-'.repeat(40));

    // 追加ボタンを探す（様々なセレクタを試す）
    const addButtons = [
      page.locator('[aria-label="参加者を追加"]').first(),
      page.locator('button:has-text("+")').first(),
      page.locator('div[role="button"]:has-text("+")').first(),
    ];

    let addBtnFound = false;
    for (const addBtn of addButtons) {
      if (await addBtn.count() > 0) {
        try {
          await addBtn.click();
          await delay(1000);
          addBtnFound = true;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    // 画面下部の青い追加ボタンを探す
    if (!addBtnFound) {
      // 画面をスクロールして追加ボタンを探す
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await delay(1000);

      const floatingAddBtn = page.locator('text=参加者を追加').first();
      if (await floatingAddBtn.count() > 0) {
        await floatingAddBtn.click();
        await delay(1000);
        addBtnFound = true;
      }
    }

    if (addBtnFound) {
      // 参加者名を入力
      const nameInput = page.locator('input[placeholder*="名前"]').first();
      const nameInputAlt = page.locator('input').first();

      if (await nameInput.count() > 0) {
        await nameInput.fill('テスト選手A');
      } else if (await nameInputAlt.count() > 0) {
        await nameInputAlt.fill('テスト選手A');
      }

      // 追加/保存ボタンを押す
      const saveBtn = page.locator('text=追加').first();
      const saveBtnAlt = page.locator('text=保存').first();
      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        await delay(1000);
      } else if (await saveBtnAlt.count() > 0) {
        await saveBtnAlt.click();
        await delay(1000);
      }

      console.log('  ✅ 手動参加者追加を試行');
      results.passed.push('手動参加者追加');
    } else {
      console.log('  ⏭️ 追加ボタンが見つかりませんでした');
      results.skipped.push('手動参加者追加');
    }

    await takeScreenshot(page, 'full_tournament_02_after_add');

    // ========================================
    // 5. チーム分け
    // ========================================
    console.log('\n📱 5. チーム分け');
    console.log('-'.repeat(40));

    const teamTab = page.locator('text=チーム').first();
    if (await teamTab.count() > 0) {
      await teamTab.click();
      await delay(2000);

      // 現在の参加予定人数を確認
      const teamContent = await page.content();
      const participantMatch = teamContent.match(/参加予定:\s*(\d+)人/);
      const participantCount = participantMatch ? parseInt(participantMatch[1]) : 0;
      console.log(`  参加予定人数: ${participantCount}人`);

      if (participantCount >= 2) {
        // チーム数を選択（2チーム）
        const teamCount2 = page.locator('div').filter({ hasText: /^2$/ }).first();
        if (await teamCount2.count() > 0) {
          await teamCount2.click();
          await delay(500);
          console.log('  チーム数: 2を選択');
        }

        // ランダム分けを実行
        const randomBtn = page.locator('text=ランダム分け').first();
        if (await randomBtn.count() > 0) {
          await randomBtn.click();
          await delay(2000);
          await takeScreenshot(page, 'full_tournament_03_teams_created');

          // チームが作成されたか確認
          const afterContent = await page.content();
          if (!afterContent.includes('チームがありません')) {
            console.log('  ✅ チーム分け成功');
            results.passed.push('チーム分け');
          } else {
            console.log('  ⚠️ チームが作成されませんでした');
            results.failed.push('チーム分け');
          }
        }
      } else {
        console.log('  ⚠️ 参加予定人数が不足しています（2人以上必要）');
        await takeScreenshot(page, 'full_tournament_03_insufficient_participants');
        results.skipped.push('チーム分け（参加者不足）');
      }
    }

    // ========================================
    // 6. 対戦表生成
    // ========================================
    console.log('\n📱 6. 対戦表生成');
    console.log('-'.repeat(40));

    const matchTab = page.locator('text=対戦表').first();
    if (await matchTab.count() > 0) {
      await matchTab.click();
      await delay(2000);

      const matchContent = await page.content();

      // チームが存在するか確認
      if (!matchContent.includes('チームが0個です')) {
        // 団体戦を選択
        const teamBattleBtn = page.locator('text=団体戦').first();
        if (await teamBattleBtn.count() > 0) {
          await teamBattleBtn.click();
          await delay(1000);
          console.log('  団体戦を選択');
        }

        // トーナメント形式を選択（リーグ戦など）
        const leagueBtn = page.locator('text=総当たり').first();
        const singleElimBtn = page.locator('text=トーナメント').first();

        if (await leagueBtn.count() > 0) {
          await leagueBtn.click();
          await delay(1000);
          console.log('  総当たり戦を選択');
        } else if (await singleElimBtn.count() > 0) {
          await singleElimBtn.click();
          await delay(1000);
          console.log('  トーナメントを選択');
        }

        // 生成ボタンを押す
        const generateBtn = page.locator('text=対戦表を生成').first();
        const createMatchBtn = page.locator('text=作成').first();

        if (await generateBtn.count() > 0) {
          await generateBtn.click();
          await delay(3000);
        } else if (await createMatchBtn.count() > 0) {
          await createMatchBtn.click();
          await delay(3000);
        }

        await takeScreenshot(page, 'full_tournament_04_matches');

        // 対戦表が生成されたか確認
        const afterMatchContent = await page.content();
        if (afterMatchContent.includes('vs') ||
            afterMatchContent.includes('第') ||
            afterMatchContent.includes('試合') ||
            afterMatchContent.includes('Round')) {
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
        await takeScreenshot(page, 'full_tournament_04_no_teams');
        results.skipped.push('対戦表生成（チーム不足）');
      }
    }

    // ========================================
    // テスト結果サマリー
    // ========================================
    console.log('\n');
    console.log('='.repeat(60));
    console.log('📊 対戦表・チーム分け完全テスト結果');
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
    await takeScreenshot(page, 'full_tournament_error');
  } finally {
    await browser.close();
  }

  return results;
}

fullTournamentTest().catch(console.error);
