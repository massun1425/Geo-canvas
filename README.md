# Travel Photo App 🌍✈️

このアプリケーションは、旅行の思い出を地図上で振り返るためのWebアプリです。
写真の持つ位置情報（GPS）を活用し、いつどこで撮影したかを地図上のピンとルート（軌跡）で結んで可視化します。

---

## 📖 機能と使い方

### 1. アカウント作成・ログイン・旅行作成

<!-- TODO: GIF（アカウント作成〜旅行作成までの流れ） -->
<!-- ![demo-account](docs/gifs/01_account_and_trip.gif) -->

https://github.com/user-attachments/assets/4db07cd5-4305-47ac-ac1c-9ebefa8ed933

- **アカウント作成**: メールアドレスとパスワードで新規登録できます。
- **ログイン**: 登録済みのアカウントでログインし、ダッシュボードへアクセスします。
- **旅行作成**: ダッシュボードの「CREATE NEW TRIP」セクションに旅行名を入力して `START` を押すと、新しい旅行が作成されます。
- **旅行の削除**: 旅行カードを右クリック（PCの場合）または長押し（スマホの場合）すると削除できます。

---

### 2. 旅行詳細：写真の追加とマップ機能

<!-- TODO: GIF（写真アップロード〜マップ表示の流れ） -->
<!-- ![demo-map](docs/gifs/02_photos_and_map.gif) -->


https://github.com/user-attachments/assets/5512c71d-28b7-4f9a-9f04-c2a887844982


旅行を選択すると詳細画面が開き、**MAP** タブが表示されます。

- **写真のアップロード**: 右パネルの「+」ボタンからGPS情報（EXIF）付きの写真を複数枚まとめてアップロードできます。
- **地図上へのピン表示**: GPS情報を持つ写真は自動的に地図上にピンとして配置されます。ピンをタップすると写真のサムネイルが表示されます。
- **移動ルートの表示**: 撮影した場所を時系列でつなぎ、旅のルートを地図上に軌跡として描画します。
- **写真の削除**: アップロードした写真はギャラリーから個別に削除できます。

---

### 3. EXPLORE・AI GROUPS・SMART SEARCH

<!-- TODO: GIF（各タブの機能紹介） -->
<!-- ![demo-features](docs/gifs/03_explore_ai_smart.gif) -->


https://github.com/user-attachments/assets/53d88b16-9295-47f8-8a6a-62a9e171e193


旅行詳細画面の上部タブから以下の機能にアクセスできます。

#### EXPLORE
旅行の統計情報とギャラリーを確認できます。
- 移動した総距離（KM）、旅行期間、撮影枚数をサマリー表示
- **Timeline ビュー**: 全写真を時系列で一覧
- **Daily ビュー**: 日付ごとにグループ化して整理

#### AI GROUPS
YOLOv8による物体検出AIが写真を自動でカテゴリ分類します。
- **People**（人物）・**Food**（料理）・**Scenery**（風景）などのグループに振り分け
- 旧写真への一括再解析（Re-analyze）も可能

#### SMART SEARCH
写真に写っているものをキーワードで検索できます。
- 「dog」「car」「person」などの英語、または「犬」「車」などの日本語で検索可能
- クイックタグから頻出ワードをワンタップで絞り込み

---

## 📌 前提条件
以下のソフトウェアがローカルPCにインストールされている必要があります。
- Docker & Docker Compose
- Python 3.9 以上

---

## 🚀 起動方法

アプリケーションは「フロントエンド＆DB（Docker）」と「バックエンド（Python環境）」の2つを起動させる必要があります。

### 1. データベースとフロントエンドの起動
プロジェクトのルートディレクトリ（`travel`フォルダ）にて、以下のコマンドを**1行で**実行します。

```bash
docker compose up -d
```
これにより、PostgreSQLデータベース（ポート`5433`）とReactフロントエンド（ポート`5173`）がバックグラウンドで起動します。

### 2. バックエンドAPIの起動
別のターミナル（コマンドプロンプトやターミナルアプリ）を開き、`backend` ディレクトリに移動してFastAPIサーバーを起動します。

```bash
cd backend

# Python仮想環境を有効化 (Mac/Linux の場合)
source venv/bin/activate

# 必要なライブラリのインストール (※初回構築時のみ)
pip install -r requirements.txt

# FastAPIサーバーを実行
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```
または、仮想環境内のPythonを直接指定して実行することも可能です：
```bash
./venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

### 3. ブラウザでアクセス
すべての起動が完了したら、ブラウザで以下のURLを開いてください。

👉 **Webアプリを開く**: [http://localhost:5173](http://localhost:5173)
👉 **API仕様の確認 (Swagger UI)**: [http://localhost:8080/docs](http://localhost:8080/docs)

---

## 🛑 終了・停止方法

1. **バックエンドの停止**: 稼働しているターミナルで `Ctrl + C` を押します。
2. **コンテナの停止**: ルートディレクトリで以下のコマンドを実行します。
```bash
docker compose down
```
※写真の実データ（`backend/uploads`）や、データベースの中身は保存されているため、再起動してもデータはそのまま残ります。
