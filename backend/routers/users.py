from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
import models, schemas
from database import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post("/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 実際にはパスワードのハッシュ化が必要ですが、今回は簡略化します
    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=user.password + "_hashed"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.UserResponse)
def login_user(user_login: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_login.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="無効なメールアドレスまたはパスワードです")
    
    # 簡易チェック（本来はハッシュ比較）
    if db_user.password_hash != user_login.password + "_hashed":
        raise HTTPException(status_code=401, detail="無効なメールアドレスまたはパスワードです")
        
    return db_user

@router.get("/", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@router.delete("/{user_id}")
def delete_user(user_id: str, request: schemas.UserDeleteRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 簡易チェック（ログイン時と共通のロジック）
    if db_user.password_hash != request.password + "_hashed":
        raise HTTPException(status_code=401, detail="パスワードが正しくありません")
    
    # DBからユーザーを削除（sqlalchemyのリレーションシップ cascade 設定でTripやPhotoも連動削除される）
    db.delete(db_user)
    db.commit()
    
    # ユーザーのアップロードディレクトリ構造を物理削除
    user_upload_dir = os.path.join("uploads", str(user_id))
    if os.path.exists(user_upload_dir):
        try:
            shutil.rmtree(user_upload_dir)
        except Exception as e:
            print(f"Failed to delete directory {user_upload_dir}: {e}")
            
    return {"message": "ユーザーと全ての関連データが完全に削除されました"}
