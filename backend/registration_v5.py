# --- LOAD ENVIRONMENT VARIABLES FIRST ---
from dotenv import load_dotenv
load_dotenv()
# ------------------------------------
import os
import numpy as np
from deepface import DeepFace
import database_handler as database_handler

# --- V5 REGISTRATION CONFIGURATION ---
PHOTOS_BASE_FOLDER = "registration_photos"

def register_students_v5():
    # --- FIX: We now use a simpler DB, so we need a matching table ---
    conn = database_handler.sqlite3.connect(database_handler.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS students")
    cursor.execute('''
        CREATE TABLE students (
            roll_no TEXT PRIMARY KEY, name TEXT NOT NULL,
            student_class TEXT NOT NULL, arcface_embedding BLOB NOT NULL
        )''')
    conn.commit()
    conn.close()
    
    student_folders = [f for f in os.listdir(PHOTOS_BASE_FOLDER) if os.path.isdir(os.path.join(PHOTOS_BASE_FOLDER, f))]
    class_for_batch = input(f"Enter class for all {len(student_folders)} students (e.g., TYCO): ").strip().upper()

    for folder_name in student_folders:
        try:
            roll_no, name = folder_name.split('_', 1)
            name = name.replace('_', ' ').title()
        except ValueError: continue

        photo_files = [f for f in os.listdir(os.path.join(PHOTOS_BASE_FOLDER, folder_name)) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if not photo_files: continue

        print(f"\nProcessing {name} (Roll No: {roll_no})...")
        embeddings = []
        for photo in photo_files:
            try:
                # --- FIX: Only generate the ArcFace embedding ---
                embeddings.append(DeepFace.represent(os.path.join(PHOTOS_BASE_FOLDER, folder_name, photo), model_name="ArcFace")[0]["embedding"])
                print(f"  - Processed '{photo}'.")
            except Exception as e: print(f"  - Error on '{photo}': {e}")
        
        if embeddings:
            master_embedding = np.mean(embeddings, axis=0)
            conn = database_handler.sqlite3.connect(database_handler.DB_FILE)
            cursor = conn.cursor()
            cursor.execute("INSERT INTO students (roll_no, name, student_class, arcface_embedding) VALUES (?, ?, ?, ?)",
                           (roll_no, name, class_for_batch, database_handler.pickle.dumps(master_embedding)))
            conn.commit()
            conn.close()
            print(f"-> Saved master embedding for {name}.")

if __name__ == "__main__":
    register_students_v5()