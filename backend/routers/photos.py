import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import models
from utils.exif_parser import extract_exif_data
from utils.predictor import classify_photo
from PIL import Image
import io

router = APIRouter(
    prefix="/photos",
    tags=["Photos"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    trip_id: uuid.UUID = Form(None), # swagger UIからテストしやすいようにFormを利用
    user_id: uuid.UUID = Form(None),
    db: Session = Depends(get_db)
):
    """
    写真をアップロードし、Exif情報（位置情報・日時）を抽出してDBに保存するAPI
    """
    
    # 【開発用モック】
    # まだユーザー登録や旅行作成のAPIがないため、もし空で送られてきたら、
    # または存在しない架空のIDが送られてきたら、ダミーのユーザー・旅行を自動紐付けします。
    user = None
    if user_id:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
    if not user:
        user = db.query(models.User).first()
        if not user:
            user = models.User(username="demo_user", email="demo@example.com", password_hash="dummy")
            db.add(user)
            db.commit()
            db.refresh(user)
        user_id = user.id

    trip = None
    if trip_id:
        trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
        
    if not trip:
        trip = db.query(models.Trip).first()
        if not trip:
            trip = models.Trip(user_id=user_id, title="Test Trip (Demo)")
            db.add(trip)
            db.commit()
            db.refresh(trip)
        trip_id = trip.id

    # 1. 写真ファイルの保存処理（ユーザー・旅行ごとに階層化）
    trip_dir = os.path.join(UPLOAD_DIR, str(user_id), str(trip_id))
    os.makedirs(trip_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}" # ランダムなUUIDでプライバシー保護
    file_path = os.path.join(trip_dir, unique_filename)
    
    file_bytes = await file.read()
    
    # 2. Exif情報の抽出 (オリジナル画像を維持したまま先に抽出)
    exif_info = extract_exif_data(file_bytes)
    
    # 1. 写真ファイルの保存処理（画質を 40 に落として軽量化しつつサイズを維持、Exifも維持）
    try:
        image = Image.open(io.BytesIO(file_bytes))
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
            
        exif_bytes = image.info.get('exif')
        if exif_bytes:
            image.save(file_path, format="JPEG", quality=40, optimize=True, exif=exif_bytes)
        else:
            image.save(file_path, format="JPEG", quality=40, optimize=True)
    except Exception as e:
        # 画像が開けない等の万が一のエラー時はそのままオリジナルを保存
        print(f"PIL compression fallback: {e}")
        with open(file_path, "wb") as f:
            f.write(file_bytes)
    
    # 3. 機械学習による画像分類 (YOLOv8推論)
    ml_category = classify_photo(file_path)
    
    # 4. DBへ保存
    new_photo = models.Photo(
        trip_id=trip_id,
        user_id=user_id,
        image_url=file_path,
        latitude=exif_info["latitude"],
        longitude=exif_info["longitude"],
        captured_at=exif_info["captured_at"],
        ml_category=ml_category,
        is_analyzed=True
    )
    
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)
    
    return {
        "message": "Photo uploaded successfully",
        "photo": new_photo
    }

@router.get("/{photo_id}/image")
def get_photo_image(photo_id: uuid.UUID, user_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    画像をセキュアに返すAPI。要求元のユーザーが持ち主かチェックする。
    """
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # セキュリティチェック: リクエストしたユーザーがこの写真の所有者か確認
    if str(photo.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Not authorized to view this photo")
        
    if not photo.image_url or not os.path.exists(photo.image_url):
        raise HTTPException(status_code=404, detail="Image file not found on server")
        
    # クライアント(ブラウザ)に1年間キャッシュさせる強力なヘッダーを追加
    return FileResponse(
        photo.image_url,
        headers={"Cache-Control": "public, max-age=31536000"}
    )

@router.get("/")
def get_photos(trip_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db)):
    """
    保存されているすべての写真データを取得するAPI（地図表示用）
    """
    query = db.query(models.Photo)
    if trip_id:
        query = query.filter(models.Photo.trip_id == trip_id)
    photos = query.order_by(models.Photo.captured_at.asc()).all()
    return photos

@router.delete("/{photo_id}")
def delete_photo(photo_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    指定されたIDの写真データをポストとファイルから削除するAPI
    """
    photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # 物理ファイルの削除
    if photo.image_url and os.path.exists(photo.image_url):
        try:
            os.remove(photo.image_url)
        except OSError:
            pass # 削除できなくてもDBからは消す

    db.delete(photo)
    db.commit()
    return {"message": "Photo deleted successfully"}


