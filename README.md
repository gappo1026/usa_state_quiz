# USA State Shape Quiz

無料で遊べるアメリカ50州の形当て4択クイズ（静的Webサイト）です。  
HTML / CSS / JavaScript のみで動作し、AWS Amplify Hosting へそのまま公開できる構成です。

## 機能

- 50州すべての輪郭データと短い解説を収録
- 州の形を見て4択で州名を当てる
- 毎回ランダムに10問（同一ラウンド内で州の重複なし）
- 正解・不正解の即時フィードバックと解説表示
- 回答後にアメリカ全体マップで位置をハイライト表示
- 解答後は選択肢の下の Next で次へ進む
- ストリーク / ポジティブフィードバック / アニメーション付きHUD
- 最終スコア表示、再挑戦、共有テキスト / Web Share
- 広告掲載用スペース（AdSenseコードは未設定）
- About / Privacy / Operator ページ

## 体験改善メモ（UX）

- 問題カード・シルエット・選択肢に入場アニメーション
- 正解時のバウンス／グロー、不正解時のシェイク
- 回答後の解説に州名・地域・州都・豆知識・全体マップを表示
- 州シルエットが全体マップ上の実位置へ縮み移動
- `prefers-reduced-motion` を尊重して過度な動きを抑制

## ローカルでの起動方法

必要なもの: モダンブラウザ（Chrome / Edge / Firefox / Safari など）

静的ファイルのため、どちらかの方法で開けます。

### 方法A: ローカルサーバー（推奨）

プロジェクト直下で:

```bash
python -m http.server 8080
```

ブラウザで `http://localhost:8080` を開いてください。

### 方法B: ファイルを直接開く

`index.html` をブラウザで開いても動作します（外部API不要）。

## データとライセンス

- 州境界データ: [datasets/geo-admin1-us](https://github.com/datasets/geo-admin1-us)（Natural Earth 由来）
- Natural Earth: public domain
- パッケージライセンス: Open Data Commons PDDL
- 生成スクリプト: `scripts/generate_states.py`
- 生成物: `js/states-data.js`

州データを再生成する場合:

```bash
python scripts/generate_states.py
python scripts/validate_quiz.py
```

## ファイル構成

```text
.
├── index.html          # クイズ本体
├── about.html          # サイト説明
├── privacy.html        # プライバシーポリシー（要確認事項あり）
├── operator.html       # 運営者情報（要確認事項あり）
├── css/styles.css
├── js/states-data.js
├── js/quiz.js
├── robots.txt
├── sitemap.xml
├── scripts/
│   ├── admin1-us.geojson
│   ├── generate_states.py
│   └── validate_quiz.py
└── README.md
```

## AWS Amplify Hosting への公開手順（実施は後で可）

今回の作業ではデプロイや GitHub push は行いません。公開時の目安手順です。

1. このリポジトリを GitHub に push する
2. AWS Amplify Hosting で「Host web app」を選び、GitHub リポジトリを接続する
3. ビルド設定は静的サイトのまま（ビルドコマンド不要）
   - Build settings 例:
     - Build command: （空）
     - Output/base directory: `/`（リポジトリ直下）
4. 保存してデプロイし、発行された URL で動作確認する
5. カスタムドメインが必要なら Amplify の Domain management で設定する

Amplify は `index.html` をルートとして配信するため、追加のフレームワーク設定は不要です。

## AdSense 準備状況

- クイズ画面下部と結果画面下部に広告枠プレースホルダあり
- 回答ボタンと重ならない配置
- AdSense 審査前のため広告コードは未設置
- プライバシー / 運営者ページは用意済み（未確定事項は「要確認」と明記）

## 検証

```bash
python scripts/validate_quiz.py
```

成功時に `VALIDATION OK` と表示されます。
