# ATSUME - スポーツイベント管理アプリ

スポーツイベントやサークル活動の参加者管理・出欠確認・集金管理を効率化するモバイルアプリです。

## 機能

### Phase 1 (MVP)
- ユーザー認証（サインアップ/ログイン/パスワードリセット）
- イベント作成・編集・削除
- 招待リンク・コードでのイベント参加
- 参加者一覧・出欠管理
- 集金管理（送金報告・承認）
- 通知機能

### Phase 2 以降（予定）
- チーム分け機能
- トーナメント・総当たり戦管理
- タイマー機能
- オフラインサポート

## 技術スタック

- **フロントエンド**: React Native (Expo)
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage)
- **状態管理**: Zustand
- **フォーム**: React Hook Form + Zod
- **ナビゲーション**: React Navigation

## セットアップ

### 前提条件

- Node.js 18+
- npm または yarn
- Expo CLI
- Supabase アカウント

### インストール

1. 依存関係をインストール
```bash
cd atsume
npm install
```

2. 環境変数を設定
```bash
cp .env.example .env
```
`.env` ファイルを編集し、Supabaseの認証情報を設定してください。

3. Supabaseでデータベースをセットアップ
   - Supabaseプロジェクトを作成
   - `supabase/migrations/001_initial_schema.sql` をSQL Editorで実行

4. 開発サーバーを起動
```bash
npm start
```

## プロジェクト構成

```
atsume/
├── src/
│   ├── components/     # 再利用可能なUIコンポーネント
│   │   ├── common/     # ボタン、入力など共通コンポーネント
│   │   └── events/     # イベント関連コンポーネント
│   ├── screens/        # 画面コンポーネント
│   │   ├── auth/       # 認証画面
│   │   ├── events/     # イベント画面
│   │   └── settings/   # 設定画面
│   ├── navigation/     # ナビゲーション設定
│   ├── stores/         # Zustandストア
│   ├── services/       # API・外部サービス連携
│   ├── hooks/          # カスタムフック
│   ├── types/          # TypeScript型定義
│   ├── utils/          # ユーティリティ関数
│   └── constants/      # 定数・テーマ設定
├── supabase/
│   └── migrations/     # DBマイグレーション
└── App.tsx             # エントリーポイント
```

## 開発

```bash
# 開発サーバー起動
npm start

# iOS シミュレータ
npm run ios

# Android エミュレータ
npm run android

# Webブラウザ
npm run web

# TypeScriptチェック
npx tsc --noEmit

# Lint
npm run lint
```

## ライセンス

MIT
