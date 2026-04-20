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

def classify_photo(image_path: str) -> str:
    """
    画像内の人物と食事の専有面積(割合)を計算し、
    'person', 'food', 'landscape' のいずれかに分類する。
    """
    try:
        results = model(image_path)
        person_area = 0.0
        food_area = 0.0
        
        for r in results:
            if r.boxes is None or len(r.boxes) == 0:
                continue
            
            # r.boxes.xyxyn: 正規化座標 [x1, y1, x2, y2] (0.0~1.0)
            # r.boxes.cls: クラスID
            # r.boxes.conf: 信頼度スコア
            for box, cls_tensor, conf_tensor in zip(r.boxes.xyxyn, r.boxes.cls, r.boxes.conf):
                # 信頼度が低い（誤検知や背景のポスター等である可能性が高い）ものは無視
                if conf_tensor.item() < 0.40:
                    continue

                cls_id = int(cls_tensor.item())
                x1, y1, x2, y2 = box.tolist()
                area = (x2 - x1) * (y2 - y1)
                
                if cls_id == 0:  # 0は 'person'
                    person_area += area
                elif cls_id in FOOD_CLASSES:
                    food_area += area
                    
        # 判定ロジック
        
        # 1. 食事クラスが存在する場合（全体の5%以上）
        if food_area >= 0.05:
            # 食事写真に「手」や「向かい側の席の人」が写り込んでいるケースを考慮し、
            # 人物が画像の半分近い面積（40%以上）を占めていない限りは「食事」を優先する
            if person_area >= 0.40:
                return "person"
            else:
                return "food"
                
        # 2. 食事を含まないが、人物が一定割合（15%以上）を占めるなら「人物」
        elif person_area >= 0.15:
            return "person"
            
        # 3. どちらでもなければ「風景」
        else:
            return "landscape"
            
    except Exception as e:
        print(f"Error classifying photo: {e}")
        return "unclassified"
