import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 仮のローカルDB接続文字列 (PostgreSQL)
# 実際の運用では環境変数や設定ファイルから読み込むようにします
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@127.0.0.1:5433/travel_db"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """リクエストごとにデータベースセッションを提供する依存関数"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
