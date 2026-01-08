# iOS App Store デプロイメントガイド

## 前提条件

### 1. Apple Developer Program
- Apple Developer Programに登録（年間 $99）
- URL: https://developer.apple.com/programs/

### 2. 必要なツール
```bash
# EAS CLIのインストール
npm install -g eas-cli

# Expoアカウントでログイン
eas login
```

## デプロイ手順

### Step 1: App Store Connect でアプリを作成

1. [App Store Connect](https://appstoreconnect.apple.com/) にログイン
2. 「マイApp」→「+」→「新規App」
3. 以下の情報を入力:
   - **プラットフォーム**: iOS
   - **名前**: ATSUME - スポーツイベント管理
   - **プライマリ言語**: 日本語
   - **バンドルID**: com.atsume.app
   - **SKU**: atsume-app-001

### Step 2: アプリアイコンとスクリーンショットの準備

#### アイコン
- **サイズ**: 1024x1024px
- **フォーマット**: PNG (透過なし)
- **場所**: `./assets/icon.png`

#### スクリーンショット（必須）
iPhone用:
- 6.7インチ (iPhone 14 Pro Max等): 1290 x 2796px
- 6.5インチ (iPhone 11 Pro Max等): 1242 x 2688px

iPad用（オプション）:
- 12.9インチ: 2048 x 2732px

### Step 3: プライバシーポリシーとサポートURL

App Store Connectで以下を設定:
- **プライバシーポリシーURL**: https://yourdomain.com/privacy
- **サポートURL**: https://yourdomain.com/support

### Step 4: ビルド設定の更新

`eas.json`の`submit.production.ios`セクションを更新:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      }
    }
  }
}
```

### Step 5: 本番ビルドの作成

```bash
# iOSビルドを作成
eas build --platform ios --profile production

# ビルド完了を待つ（10-20分程度）
# 完了したらビルドURLが表示されます
```

### Step 6: App Store Connect へ提出

```bash
# 自動提出（推奨）
eas submit --platform ios --profile production

# または手動でApp Store Connectにアップロード
# 1. EASダッシュボードから.ipaファイルをダウンロード
# 2. Transporter.appを使用してアップロード
```

### Step 7: App Store Connect でアプリ情報を入力

1. **App情報**
   - カテゴリ: スポーツ、ユーティリティ
   - 年齢制限: 4+

2. **価格と配信可能状況**
   - 価格: 無料
   - 配信可能な国: 日本（または全世界）

3. **App Store用メタデータ**
   - **アプリ名**: ATSUME - スポーツイベント管理
   - **サブタイトル**: 簡単にイベントを管理・共有
   - **説明**:
   ```
   ATSUMEは、スポーツイベントやサークル活動を簡単に管理できるアプリです。

   【主な機能】
   ✓ イベントの作成と参加者管理
   ✓ 出欠確認と支払い管理
   ✓ チーム分けと対戦表作成
   ✓ 複数のトーナメント形式に対応
   ✓ リアルタイムでの情報共有

   【対応する対戦形式】
   • 総当たり戦（リーグ戦）
   • シングルエリミネーション
   • ダブルエリミネーション
   • スイスドロー

   幹事の負担を減らし、参加者全員が楽しめるイベント運営をサポートします。
   ```
   - **キーワード**: スポーツ,イベント,管理,トーナメント,対戦表,チーム分け
   - **What's New**: 初回リリース

4. **スクリーンショット**
   - 各サイズのスクリーンショットをアップロード

5. **App Store レビュー情報**
   - デモアカウント情報（レビュー担当者用）
   - メモ（特記事項があれば）

### Step 8: 審査に提出

1. App Store Connect で「レビューのために提出」をクリック
2. 審査開始（通常1-3日）
3. 問題があれば修正して再提出
4. 承認されたら公開

## バージョンアップ時の手順

### 1. バージョン番号の更新
`app.json`:
```json
{
  "expo": {
    "version": "1.0.1",  // バージョンアップ
    "ios": {
      "buildNumber": "2"  // ビルド番号を増やす
    }
  }
}
```

### 2. ビルドと提出
```bash
# 新しいビルドを作成
eas build --platform ios --profile production

# App Store Connectに提出
eas submit --platform ios --profile production
```

### 3. What's New を更新
App Store Connectで変更内容を記載

## トラブルシューティング

### ビルドが失敗する
```bash
# ログを確認
eas build:list

# クリーンビルド
eas build --platform ios --profile production --clear-cache
```

### 証明書の問題
```bash
# 証明書を再生成
eas credentials
```

### 審査でリジェクトされた場合
- App Store Review Guidelinesを確認
- 指摘事項を修正
- 再提出

## 参考リンク

- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## チェックリスト

提出前に以下を確認:

- [ ] Apple Developer Programに登録済み
- [ ] App Store Connectでアプリを作成
- [ ] アプリアイコン (1024x1024px) 準備完了
- [ ] スクリーンショット準備完了
- [ ] プライバシーポリシーURL設定
- [ ] サポートURL設定
- [ ] `eas.json` の設定完了
- [ ] `app.json` のバージョン情報正しい
- [ ] デモアカウント準備（必要な場合）
- [ ] ビルド成功
- [ ] App Store Connectにアップロード完了
- [ ] メタデータ入力完了
- [ ] 審査に提出
