# backend/routes/registration.py - Updated for AdaFace Strategy
import os
import cv2
import numpy as np
import logging
from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Depends
from pydantic import BaseModel
from typing import List

from .. import database_handler
from .. import auth
from ..adaface_model import AdaFaceModel  # NEW: Import our AdaFace wrapper

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PHOTOS_BASE_FOLDER = os.path.join(PROJECT_ROOT, "data", "captured_faces")
logger = logging.getLogger(__name__)
router = APIRouter()

# --- NEW: Initialize AdaFace Model ---
# Assumes a 'models' folder in your project root
ADAFAFE_MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "adaface_ir101_webface12m.ckpt")
adaface = AdaFaceModel(ADAFAFE_MODEL_PATH)

# Configuration
REQUIRED_PHOTOS = 5  # 2 HQ + 3 degraded


# --- Pydantic Model for Batch Registration ---
class BatchRegistrationRequest(BaseModel):
    student_class: str
    department: str
    clear_existing_students: bool = False


# --- Internal Processing Function ---
def _process_batch_registration(student_class: str, department: str, clear_db: bool):
    """Processes folders and registers students using 5-image AdaFace strategy."""
    if not os.path.isdir(PHOTOS_BASE_FOLDER):
        raise FileNotFoundError(f"Registration folder not found at '{PHOTOS_BASE_FOLDER}'")

    if clear_db:
        # This function should now clear the table with the adaface_embedding column
        database_handler.recreate_students_table()

    student_folders = [f for f in os.listdir(PHOTOS_BASE_FOLDER) if os.path.isdir(os.path.join(PHOTOS_BASE_FOLDER, f))]
    registered_students, failed_folders = [], []

    for folder_name in student_folders:
        try:
            # Parse folder: rollno_name_timestamp
            parts = folder_name.split('_')
            if len(parts) < 3:
                raise ValueError("Invalid folder format")
            
            roll_no = parts[0]
            name = parts[1].replace('_', ' ').title()
            parent_phone = None
        except ValueError:
            logger.warning(f"Skipping invalid folder name format: {folder_name}")
            failed_folders.append(f"{folder_name} (invalid format)")
            continue
        
        photo_files = sorted([f for f in os.listdir(os.path.join(PHOTOS_BASE_FOLDER, folder_name)) 
                             if f.startswith('face_') and f.lower().endswith('.jpg')])
        
        if len(photo_files) != REQUIRED_PHOTOS:
            logger.warning(f"Student {name} (roll {roll_no}) has {len(photo_files)} photos, expected {REQUIRED_PHOTOS}")
            if len(photo_files) == 0:
                failed_folders.append(f"{folder_name} (no photos)")
                continue
        
        photo_files = photo_files[:REQUIRED_PHOTOS]

        embeddings = []
        for photo in photo_files:
            try:
                img_path = os.path.join(PHOTOS_BASE_FOLDER, folder_name, photo)
                img = cv2.imread(img_path)
                if img is None:
                    logger.error(f"Could not read image: {photo}")
                    continue
                
                # Generate embedding using AdaFace
                embedding = adaface.get_embedding(img)
                if embedding is not None:
                    embeddings.append(embedding)
                
            except Exception as e:
                logger.error(f"Failed to process '{photo}' for {name}: {e}")
        
        if embeddings:
            # Compute master embedding (average + L2 normalization)
            master_embedding = np.mean(embeddings, axis=0)
            norm = np.linalg.norm(master_embedding)
            if norm > 0:
                master_embedding = master_embedding / norm
            
            # CRITICAL: Your database_handler.add_student must now save the embedding
            # to the new 'adaface_embedding' column in your database.
            database_handler.add_student(
                roll_no, name, student_class, master_embedding, 
                parent_phone_number=parent_phone, 
                department=department
            )
            registered_students.append({"roll_no": roll_no, "name": name, "photos": len(embeddings)})
        else:
            failed_folders.append(f"{folder_name} (no valid embeddings)")

    return registered_students, failed_folders


# --- API Endpoints ---

@router.post("/run_batch_registration")
async def run_batch_registration_endpoint(request: BatchRegistrationRequest):
    """
    Runs batch registration for students. Uses NEW 5-image AdaFace strategy.
    """
    try:
        registered, failed = _process_batch_registration(
            request.student_class, 
            request.department,
            request.clear_existing_students
        )
        
        total_photos = sum(s.get('photos', 0) for s in registered)
        avg_photos = total_photos / len(registered) if registered else 0
        
        return {
            "status": "Batch registration process completed.",
            "message": f"Registered {len(registered)} students to department {request.department} using AdaFace embeddings.",
            "registered_students": registered,
            "failed_folders": failed,
            "average_photos_per_student": round(avg_photos, 1),
        }
    except Exception as e:
        logger.error(f"Batch registration failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register_student")
async def register_single_student(
    roll_no: str = Form(...), name: str = Form(...), student_class: str = Form(...),
    parent_phone: str = Form(...), photos: List[UploadFile] = File(...),
    current_user: dict = Depends(auth.require_role(['principal', 'hod', 'class-teacher']))
):
    """Registers a single student from the web UI using 5 face-only photos with AdaFace."""
    user_dept = current_user.get("dept")
    if not user_dept:
        raise HTTPException(status_code=403, detail="Registering user is not assigned to a department.")

    if len(photos) != REQUIRED_PHOTOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Exactly {REQUIRED_PHOTOS} face photos are required. Got {len(photos)}."
        )

    embeddings = []
    for photo in photos:
        try:
            contents = await photo.read()
            nparr = np.frombuffer(contents, np.uint8)
            img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img_np is None:
                raise HTTPException(status_code=400, detail=f"Could not decode image: {photo.filename}")
            
            # Generate embedding using AdaFace
            embedding = adaface.get_embedding(img_np)
            if embedding is not None:
                embeddings.append(embedding)
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not process image: {photo.filename}. Error: {str(e)}")

    if embeddings:
        # Compute master embedding (average + L2 normalization)
        master_embedding = np.mean(embeddings, axis=0)
        norm = np.linalg.norm(master_embedding)
        if norm > 0:
            master_embedding = master_embedding / norm
        
        # CRITICAL: Update database_handler to save to 'adaface_embedding' column
        database_handler.add_student(
            roll_no=roll_no, name=name, student_class=student_class,
            embedding=master_embedding, parent_phone_number=parent_phone,
            department=user_dept
        )
        return {
            "status": "success", 
            "message": f"Student {name} registered in {user_dept} department with {len(embeddings)} face photos using AdaFace.",
            "embeddings_used": len(embeddings)
        }
    else:
        raise HTTPException(status_code=400, detail="Could not generate embeddings.")