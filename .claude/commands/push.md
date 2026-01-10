# Jujutsu Push Command

ローカルの変更をリモートリポジトリにプッシュします。

## 手順

1. `jj status` で現在の状態を確認
2. `jj log -r 'main@origin..main'` でプッシュ予定のリビジョンを表示
3. 現在のリビジョンにメッセージがない場合は、`jj describe` でメッセージを追加
4. `jj git push` でプッシュを実行

## コンフリクト発生時

リモートが先に進んでいる場合:
1. `jj git fetch` でリモートの最新情報を取得
2. `jj rebase -d main@origin` でリベース
3. 再度 `jj git push` を実行

## 注意事項

- `--force` は使用しない（ユーザーが明示的に要求した場合のみ）
- main/master への強制プッシュは警告を表示
