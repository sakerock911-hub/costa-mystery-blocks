# コス太のミステリーブロック

コス太と100種のミステリーを集める、8×8のブラウザパズルです。
スマートフォン・PC対応。ドラッグ操作、図鑑、BGM、効果音、新発見時の笑い声を含みます。

## GitHub Pagesで公開する

1. https://github.com/new を開きます。
2. Repository name に `costa-mystery-blocks`、公開範囲に **Public** を選びます。
3. **Add a README file** をオンにして **Create repository** を押します。
4. 作成したリポジトリで **Add file → Upload files** を開きます。
5. ZIPを解凍した中の `index.html`、JavaScript、CSS、`assets` フォルダ、READMEなど、中身をすべてドラッグ＆ドロップします。
   - ZIPそのものをアップロードしないでください。
   - 外側の `costa-mystery-blocks` フォルダではなく、その中身を選びます。
   - リポジトリの一番上に `index.html` と `assets` フォルダが並ぶ形です。
6. **Commit changes** で `main` に保存します。
7. **Settings → Pages** を開き、次のように設定して **Save** を押します。

| 設定項目 | 選ぶ内容 |
| --- | --- |
| Source | Deploy from a branch |
| Branch | main |
| Folder | /(root) |

公開が完了すると、同じPages画面に公開URLが表示されます。
`Settings → Pages` の **Visit site** から開けます。
GitHubアカウント `sakerock911-hub` で上記の名前を使った場合、公開後のURLは
https://sakerock911-hub.github.io/costa-mystery-blocks/ になります。

## 遊び方

- 下のブロックを選んで、盤面にドラッグするか置く場所をタップします。
- 縦または横をそろえるとラインが消えます。
- 光る「？」を覆うと調査＋3pt、ライン消去でも＋1pt。
- 調査ポイントを集めると100種の図鑑が開放されます。
- 効果音は画面右上、BGMはラジオの再生ボタンから切り替えられます。

## これまでの図鑑・スコアを引き継ぐ

記録は各URL・各ブラウザに保存されます。
元のゲームの **記録の保存・引き継ぎ → 記録をファイルに保存** でJSONファイルを保存し、
GitHub Pages版の同じ画面から読み込んでください。

## ファイル構成

- `index.html`：ゲーム画面
- `app.mjs`：画面・ゲーム進行
- `engine.mjs`：ブロックの配置と消去
- `progress.mjs`：調査記録・保存
- `catalog.mjs`：100種の図鑑
- `drag.mjs`：スマホ・マウス操作
- `audio.mjs`：音の制御
- `title.mjs`：タイトル画面
- `*.css`：デザイン
- `assets/`：画像・音声

ビルドや外部APIの設定は不要です。公開後はログインなしで遊べます。
更新時は、変更したファイルを同じ場所に上書きして保存してください。

## GitHub公式ガイド

- ファイルのアップロード：https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- Pagesの公開設定：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
