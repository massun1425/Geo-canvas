import io
import exifread
from datetime import datetime

def _convert_to_degrees(value):
    """
    exifreadのGPSタグの値を10進数の度数（Decimal degrees）に変換するヘルパー関数
    """
    d = float(value.values[0].num) / float(value.values[0].den)
    m = float(value.values[1].num) / float(value.values[1].den)
    s = float(value.values[2].num) / float(value.values[2].den)
    return d + (m / 60.0) + (s / 3600.0)

def extract_exif_data(file_bytes: bytes):
    """
    画像のバイナリデータからExif情報を抽出し、
    緯度、経度、撮影日時を辞書として返す
    """
    # details=Falseでタグの読み込みを軽量化
    tags = exifread.process_file(io.BytesIO(file_bytes), details=False)
    
    latitude = None
    longitude = None
    captured_at = None
    
    # 緯度の抽出
    if "GPS GPSLatitude" in tags and "GPS GPSLatitudeRef" in tags:
        lat_ref = tags["GPS GPSLatitudeRef"].printable
        lat = _convert_to_degrees(tags["GPS GPSLatitude"])
        if lat_ref != "N": # 南半球の場合はマイナス
            lat = -lat
        latitude = lat
        
    # 経度の抽出
    if "GPS GPSLongitude" in tags and "GPS GPSLongitudeRef" in tags:
        lon_ref = tags["GPS GPSLongitudeRef"].printable
        lon = _convert_to_degrees(tags["GPS GPSLongitude"])
        if lon_ref != "E": # 西半球の場合はマイナス
            lon = -lon
        longitude = lon
        
    # 撮影日時の抽出 ('EXIF DateTimeOriginal' が一般的)
    date_str = None
    if "EXIF DateTimeOriginal" in tags:
        date_str = str(tags["EXIF DateTimeOriginal"])
    elif "Image DateTime" in tags:
        date_str = str(tags["Image DateTime"])
        
    if date_str:
        try:
            # Exifは通常 "YYYY:MM:DD HH:MM:SS" フォーマット
            captured_at = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
        except ValueError:
            pass

    return {
        "latitude": latitude,
        "longitude": longitude,
        "captured_at": captured_at
    }
