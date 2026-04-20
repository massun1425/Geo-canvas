# Travel Photo App 🌍✈️

このアプリケーションは、旅行の思い出を地図上で振り返るためのWebアプリです。
写真の持つ位置情報（GPS）を活用し、いつどこで撮影したかを地図上のピンとルート（軌跡）で結んで可視化します。

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
