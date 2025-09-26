# backend/routes/registration.py (Final Version)
import os
import cv2
import numpy as np
import logging
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from typing import List

from .. import database_handler
from deepface import DeepFace

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PHOTOS_BASE_FOLDER = os.path.join(PROJECT_ROOT, "data", "registration_photos")
logger = logging.getLogger(__name__)
router = APIRouter()

class BatchRegistrationRequest(BaseModel):
    student_class: str
    clear_existing_students: bool = False

def _process_batch_registration(student_class: str, clear_db: bool):
    if not os.path.isdir(PHOTOS_BASE_FOLDER):
        raise FileNotFoundError(f"Registration folder not found at '{PHOTOS_BASE_FOLDER}'")

    if clear_db:
        database_handler.recreate_students_table()

    student_folders = [f for f in os.listdir(PHOTOS_BASE_FOLDER) if os.path.isdir(os.path.join(PHOTOS_BASE_FOLDER, f))]
    registered_students, failed_folders = [], []

    for folder_name in student_folders:
        try:
            roll_no, name, parent_phone = folder_name.split('_', 2)
            name = name.replace('_', ' ').title()
        except ValueError:
            failed_folders.append(folder_name)
            continue
        
        photo_files = [f for f in os.listdir(os.path.join(PHOTOS_BASE_FOLDER, folder_name)) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if not photo_files:
            continue

        embeddings = []
        for photo in photo_files:
            try:
                embedding_obj = DeepFace.represent(
                    img_path=os.path.join(PHOTOS_BASE_FOLDER, folder_name, photo), 
                    model_name="ArcFace", enforce_detection=True, detector_backend='retinaface'
                )
                embeddings.append(embedding_obj[0]["embedding"])
            except Exception as e:
                logger.error(f"Failed to process '{photo}' for {name}: {e}")
        
        if embeddings:
            master_embedding = np.mean(embeddings, axis=0)
            database_handler.add_student(
                roll_no, name, student_class, master_embedding, parent_phone_number=parent_phone
            )
            registered_students.append({"roll_no": roll_no, "name": name})
        else:
            failed_folders.append(folder_name)

    return registered_students, failed_folders

@router.post("/run_registration")
async def run_registration_endpoint(request: BatchRegistrationRequest):
    try:
        registered, failed = _process_batch_registration(request.student_class, request.clear_existing_students)
        return {
            "status": "Registration process completed.", "message": f"Registered {len(registered)} students.",
            "registered_students": registered, "failed_folders": failed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register_student")
async def register_single_student(
    roll_no: str = Form(...), name: str = Form(...), student_class: str = Form(...),
    parent_phone: str = Form(...), photos: List[UploadFile] = File(...)
):
    embeddings = []
    for photo in photos:
        try:
            contents = await photo.read()
            nparr = np.frombuffer(contents, np.uint8)
            img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            embedding_obj = DeepFace.represent(img_path=img_np, model_name="ArcFace", enforce_detection=True, detector_backend='retinaface')
            embeddings.append(embedding_obj[0]["embedding"])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not process image: {photo.filename}. Is it a clear face?")
    if embeddings:
        master_embedding = np.mean(embeddings, axis=0)
        database_handler.add_student(roll_no, name, student_class, master_embedding, parent_phone_number=parent_phone)
        return {"status": "success", "message": f"Student {name} registered."}
    else:
        raise HTTPException(status_code=400, detail="Could not generate embeddings.")