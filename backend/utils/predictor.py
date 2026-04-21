import os
from ultralytics import YOLO

# yolov8n.ptはnanoモデルで非常に軽量かつ高速
model = YOLO('yolov8n.pt')

# COCOデータセットにおける食事関連のクラスID
# 41: cup, 42: fork, 43: knife, 44: spoon, 45: bowl
# 46: banana, 47: apple, 48: sandwich, 49: orange, 50: broccoli
# 51: carrot, 52: hot dog, 53: pizza, 54: donut, 55: cake
# 60: dining table
FOOD_CLASSES = {41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 60}

def classify_photo(image_path: str):
    """
    画像内の物体を検出し、
    1. 'person', 'food', 'landscape' のいずれかに分類した結果
    2. 検出されたすべての物体ラベルのリスト
    を返す。
    """
    try:
        results = model(image_path)
        person_area = 0.0
        food_area = 0.0
        detected_tags = set()
        
        # モデルが持っているクラス名リスト (0: person, 1: bicycle, ...)
        class_names = model.names

        for r in results:
            if r.boxes is None or len(r.boxes) == 0:
                continue
            
            for box, cls_tensor, conf_tensor in zip(r.boxes.xyxyn, r.boxes.cls, r.boxes.conf):
                conf = conf_tensor.item()
                if conf < 0.40:
                    continue

                cls_id = int(cls_tensor.item())
                label = class_names.get(cls_id, "unknown")
                detected_tags.add(label)

                x1, y1, x2, y2 = box.tolist()
                area = (x2 - x1) * (y2 - y1)
                
                if cls_id == 0:  # person
                    person_area += area
                elif cls_id in FOOD_CLASSES:
                    food_area += area
                    
        # カテゴリ判定ロジック
        category = "landscape"
        if food_area >= 0.05:
            if person_area >= 0.40:
                category = "person"
            else:
                category = "food"
        elif person_area >= 0.15:
            category = "person"
            
        return category, ",".join(list(detected_tags))
            
    except Exception as e:
        print(f"Error classifying photo: {e}")
        return "unclassified", ""
