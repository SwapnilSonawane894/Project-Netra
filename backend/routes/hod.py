# backend/routes/hod.py (Corrected and Final)
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from .. import database_handler
from .. import auth

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Pydantic Models for Data Validation ---

# --- THIS IS THE CRITICAL FIX ---
class SubjectCreate(BaseModel):
    name: str
    abbreviation: str # This field was missing

class SubjectResponse(BaseModel):
    id: int
    name: str
    abbreviation: str
    department: str

class StaffCreate(BaseModel):
    username: str
    password: str
    full_name: str
    is_class_teacher: bool = False
    subject_ids: List[int] = []

class StaffResponse(BaseModel):
    id: int
    username: str
    full_name: str
    department: str
    
# --- Subject Management Endpoints ---
@router.post("/subjects", response_model=SubjectResponse)
async def create_subject(
    subject_data: SubjectCreate, # This will now work
    current_user: dict = Depends(auth.require_role(['hod', 'principal']))
):
    """HOD creates a new subject for their department."""
    user_dept = current_user.get("dept")
    new_subject = database_handler.create_subject(
        name=subject_data.name, 
        abbreviation=subject_data.abbreviation.upper(), 
        department=user_dept
    )
    if not new_subject:
        raise HTTPException(status_code=400, detail="Subject or Abbreviation may already exist in this department.")
    return new_subject

@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects_for_department(current_user: dict = Depends(auth.require_role(['hod', 'principal']))):
    """HOD gets a list of all subjects in their department."""
    user_dept = current_user.get("dept")
    return database_handler.get_subjects_by_department(user_dept)


# --- Staff Management Endpoints ---
@router.post("/staff", response_model=StaffResponse)
async def create_staff(
    staff_data: StaffCreate,
    current_user: dict = Depends(auth.require_role(['hod', 'principal']))
):
    """HOD creates a new staff member for their department."""
    user_dept = current_user.get("dept")
    if database_handler.get_user_by_username(staff_data.username):
        raise HTTPException(status_code=400, detail="Username already exists.")

    role = 'class-teacher' if staff_data.is_class_teacher else 'staff'
    
    new_user = database_handler.create_user(
        username=staff_data.username, password=staff_data.password,
        full_name=staff_data.full_name, role=role, department=user_dept
    )
    if not new_user:
        raise HTTPException(status_code=500, detail="Failed to create staff account.")
    
    if staff_data.subject_ids:
        database_handler.assign_subjects_to_staff(new_user['id'], staff_data.subject_ids)
        
    return new_user

@router.get("/staff", response_model=List[StaffResponse])
async def get_staff_for_department(current_user: dict = Depends(auth.require_role(['hod', 'principal']))):
    """HOD gets a list of all staff in their department."""
    user_dept = current_user.get("dept")
    return database_handler.get_users_by_role_and_department(['staff', 'class-teacher'], user_dept)