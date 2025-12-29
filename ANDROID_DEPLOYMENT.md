# Android アプリ公開ガイド

このガイドでは、ATSUMEアプリをGoogle Play Storeに公開する手順を説明します。

## 前提条件

- Google Play Console アカウント（登録料: 25ドル、1回のみ）
- Expo Application Services (EAS) アカウント
- Node.js と npm がインストールされている

## 1. Google Play Console アカウントの作成

### 1.1 アカウント登録

1. [Google Play Console](https://play.google.com/console) にアクセス
2. Googleアカウントでログイン
3. 25ドルの登録料を支払い
4. 開発者情報を入力

### 1.2 アプリの作成

1. Google Play Consoleダッシュボードで「アプリを作成」をクリック
2. 以下の情報を入力:
   - **アプリ名**: ATSUME - スポーツイベント管理
   - **デフォルトの言語**: 日本語
   - **アプリまたはゲーム**: アプリ
   - **無料または有料**: 無料

## 2. EAS CLI のセットアップ

```bash
# EAS CLIをグローバルにインストール
npm install -g eas-cli

# EASにログイン
eas login

# プロジェクトを設定
eas build:configure
```

## 3. Google Service Account の設定

### 3.1 Service Accountの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. 「IAMと管理」→「サービスアカウント」に移動
4. 「サービスアカウントを作成」をクリック
5. 名前を入力（例: "atsume-play-store-upload"）
6. 作成後、サービスアカウントをクリック
7. 「キー」タブ→「鍵を追加」→「新しい鍵を作成」
8. JSON形式を選択してダウンロード
9. ダウンロードしたファイルを `google-service-account.json` として保存

### 3.2 Google Play Console でサービスアカウントを有効化

1. Google Play Consoleに戻る
2. 「設定」→「API アクセス」に移動
3. 「新しいサービスアカウントを作成」または「既存のサービスアカウントをリンク」
4. 先ほど作成したサービスアカウントを選択
5. 権限を付与（「リリース管理」と「アプリの公開」権限が必要）

⚠️ **重要**: `google-service-account.json` は秘密情報です。Gitにコミットしないでください！

## 4. アプリアイコンとスクリーンショットの準備

### 4.1 必須アセット

1. **アプリアイコン** (512x512 px, PNG、透過なし)
   - 配置: `assets/icon.png` (1024x1024で既に存在)
   - Google Playでは512x512が必要

2. **特徴グラフィック** (1024x500 px)
   - Google Playストアリストの上部に表示

3. **スクリーンショット** (最低2枚、最大8枚)
   - スマートフォン: 縦向き 1080x1920px または 1080x2400px推奨
   - タブレット: 横向き 1920x1200px または 2560x1600px推奨

### 4.2 アイコンのリサイズ

512x512のアイコンを作成:
```bash
# ImageMagickを使用（インストールされている場合）
convert assets/icon.png -resize 512x512 assets/play-store-icon.png
```

## 5. ビルドとアップロード

### 5.1 プロダクションビルドの作成

```bash
# Android用のビルドを実行
eas build --platform android --profile production

# ビルド完了後、.aabファイルがダウンロード可能になります
```

### 5.2 Google Play Store への手動アップロード（初回）

初回リリースは手動でアップロードが必要です:

1. Google Play Console でアプリを選択
2. 「本番環境」→「新しいリリースを作成」
3. ビルドしたAABファイルをアップロード
4. リリースノートを入力
5. 「保存」→「審査のために送信」

### 5.3 EASによる自動アップロード（2回目以降）

```bash
# ビルドと同時に内部テストトラックにアップロード
eas submit --platform android --profile production

# または、既存のビルドをアップロード
eas submit --platform android --latest
```

## 6. ストアリスティングの設定

Google Play Consoleで以下の情報を入力:

### 6.1 アプリの詳細

- **アプリ名**: ATSUME - スポーツイベント管理
- **簡単な説明** (80文字以内):
  ```
  スポーツイベントの参加管理、チーム分け、対戦表作成を簡単に
  ```

- **詳しい説明** (4000文字以内):
  ```
  ATSUMEは、スポーツイベントやレクリエーション活動を簡単に管理できるアプリです。

  【主な機能】
  ✓ イベント作成と参加者管理
  ✓ 出欠確認と実際の出席追跡
  ✓ 自動チーム分け（団体戦・個人戦対応）
  ✓ 多様なトーナメント形式
    - 総当たり戦
    - シングルエリミネーション
    - ダブルエリミネーション
    - スイスドロー方式
  ✓ 対戦表の自動生成
  ✓ スコア記録と順位表
  ✓ タイマー機能

  【こんな方におすすめ】
  - フットサル、バスケ、テニスなどのスポーツイベント主催者
  - 社内レクリエーションの担当者
  - サークルやクラブの運営者

  【使い方】
  1. イベントを作成
  2. 参加者を招待（招待コードまたはリンク）
  3. 参加者の出欠を確認
  4. チーム分けと対戦表を自動生成
  5. 試合結果を記録

  主催者も参加者も、スムーズで楽しいイベント運営を実現できます。
  ```

### 6.2 カテゴリとタグ

- **カテゴリ**: スポーツ
- **タグ**: スポーツ、イベント管理、トーナメント、チーム分け

### 6.3 連絡先情報

- **メールアドレス**: サポート用のメールアドレス
- **ウェブサイト**: アプリのウェブサイト（オプション）
- **プライバシーポリシー**: `PRIVACY_POLICY.md` の内容をウェブページとして公開し、URLを登録

### 6.4 コンテンツレーティング

質問票に回答してレーティングを取得:
- 暴力表現: なし
- 性的コンテンツ: なし
- など

## 7. リリーストラック

Google Play Consoleには複数のリリーストラックがあります:

1. **内部テスト**: 最大100人の内部テスター
2. **クローズドテスト**: 限定されたユーザーグループ
3. **オープンテスト**: 誰でも参加可能なベータ版
4. **本番環境**: 一般公開

推奨フロー:
```
内部テスト → クローズドテスト → オープンテスト → 本番環境
```

## 8. バージョンアップデート

### 8.1 バージョン番号の更新

`app.json` を編集:
```json
{
  "expo": {
    "version": "1.0.1",  // バージョン名を更新
    "android": {
      "versionCode": 2   // versionCodeをインクリメント（整数）
    }
  }
}
```

### 8.2 新バージョンのビルドと送信

```bash
# 新しいビルドを作成
eas build --platform android --profile production

# Google Play Storeに送信
eas submit --platform android --latest
```

## 9. トラブルシューティング

### ビルドエラー

**エラー**: `JAVA_HOME is not set`
```bash
# Javaをインストール
brew install openjdk@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

**エラー**: `Gradle build failed`
- `eas build --platform android --clear-cache` でキャッシュをクリア

### アップロードエラー

**エラー**: `Service account key not found`
- `google-service-account.json` が正しい場所にあるか確認
- `eas.json` の `serviceAccountKeyPath` が正しいか確認

**エラー**: `Version code must be greater than current version`
- `app.json` の `android.versionCode` をインクリメント

## 10. リリースチェックリスト

公開前に以下を確認:

- [ ] Google Play Console アカウント作成済み
- [ ] アプリ情報（名前、説明、カテゴリ）入力済み
- [ ] アイコン（512x512）アップロード済み
- [ ] 特徴グラフィック（1024x500）アップロード済み
- [ ] スクリーンショット（最低2枚）アップロード済み
- [ ] プライバシーポリシーURL設定済み
- [ ] コンテンツレーティング取得済み
- [ ] 対象年齢層設定済み
- [ ] AABファイルアップロード済み
- [ ] リリースノート記入済み
- [ ] 内部テスト完了
- [ ] クローズドテスト完了（推奨）

## 11. 参考リンク

- [Google Play Console](https://play.google.com/console)
- [Expo EAS Build ドキュメント](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit ドキュメント](https://docs.expo.dev/submit/android/)
- [Android アプリリリースガイド](https://developer.android.com/studio/publish)

---

## 補足: iOS との違い

| 項目 | iOS (App Store) | Android (Google Play) |
|------|-----------------|----------------------|
| 登録料 | 99ドル/年 | 25ドル（1回のみ） |
| 審査期間 | 1-3日 | 数時間-3日 |
| ビルドファイル | .ipa | .aab |
| テストトラック | TestFlight | 内部/クローズド/オープンテスト |
| 段階的公開 | 不可 | 可能（10%, 25%, 50%, 100%） |

両方のプラットフォームで公開することで、より多くのユーザーにアプリを届けることができます。
