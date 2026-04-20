from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db
import os
import shutil

router = APIRouter(
    prefix="/trips",
    tags=["Trips"]
)

@router.post("/", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    # ユーザーが存在するか確認
    user = db.query(models.User).filter(models.User.id == trip.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_trip = models.Trip(
        user_id=trip.user_id,
        title=trip.title,
        description=trip.description,
        start_date=trip.start_date,
        end_date=trip.end_date
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip

@router.get("/", response_model=List[schemas.TripResponse])
def get_trips(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Trip)
    if user_id:
        query = query.filter(models.Trip.user_id == user_id)
    return query.all()

@router.delete("/{trip_id}")
def delete_trip(trip_id: str, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_id_str = str(trip.user_id)
    trip_id_str = str(trip.id)
    
    # DBのレコードを削除（モデル側でcascade設定済のため関連Photoも消える）
    db.delete(trip)
    db.commit()

    # ディスク上の画像ファイルフォルダ（uploads/{user_id}/{trip_id}）も物理削除
    trip_folder = os.path.join("uploads", user_id_str, trip_id_str)
    if os.path.exists(trip_folder):
        shutil.rmtree(trip_folder, ignore_errors=True)
        
    return {"message": "Trip and all associated photos deleted successfully"}
