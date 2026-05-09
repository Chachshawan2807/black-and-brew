import json
import os

class Memory:
    def __init__(self):
        self.db_path = "mem0_storage.json"
        # สร้างไฟล์ฐานข้อมูลถ้ายังไม่มี
        if not os.path.exists(self.db_path):
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump([], f)

    def add(self, text, user_id):
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            data.append({"user": user_id, "memory": text})
            
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ Antigravity Memory Recorded: {text}")
        except Exception as e:
            print(f"❌ Error: {e}")

    def search(self, query, user_id):
        return "Memory search is active in Lite Mode."