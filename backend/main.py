from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routers import photos, users, trips
import os

# FastAPI起動時にデータベースのテーブルを作成（初期開発用）
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Travel Log App API",
    description="旅行軌跡＆写真自動分類アプリのバックエンドAPI",
    version="1.0.0"
)

# CORSの設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 開発用なので全て許可。本番ではURLを絞る
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# アップロード先のディレクトリ確保（静的公開は行いません）
os.makedirs("uploads", exist_ok=True)

# 作成した APIルーターをマウント
app.include_router(photos.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(trips.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Travel Log App API!"}

@app.get("/health")
def health_check():
    return {"status": "ok", "db_connected": True}
