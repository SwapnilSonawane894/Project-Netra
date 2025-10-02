# backend/routes/hod.py (Corrected and Final)
import logging
from fastapi import APIRouter, Depends, HTTPException, Form
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
    department: Optional[str] = None
    role: str
    assigned_class: Optional[str] = None  # ✅ ADD THIS FIELD
    
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

@router.delete("/subjects/{subject_id}") # <<< NEW ENDPOINT
async def delete_subject(
    subject_id: int,
    current_user: dict = Depends(auth.require_role(['hod', 'principal']))
):
    """HOD deletes a subject from their department."""
    # We could add an extra check to ensure the HOD can only delete from their own dept
    success = database_handler.delete_subject(subject_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subject not found.")
    return {"status": "success", "message": f"Subject with ID {subject_id} deleted."}


class SubjectUpdate(BaseModel): # <<< NEW
    name: str
    abbreviation: str

class StaffUpdate(BaseModel): # <<< NEW
    is_class_teacher: bool
    subject_ids: List[int]
    assigned_class: Optional[str] = None 

@router.put("/subjects/{subject_id}", response_model=SubjectResponse) # <<< NEW
async def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    current_user: dict = Depends(auth.require_role(['hod']))
):
    success = database_handler.update_subject(subject_id, subject_data.name, subject_data.abbreviation.upper())
    if not success:
        raise HTTPException(status_code=400, detail="Subject name or abbreviation may already exist.")
    return {"id": subject_id, **subject_data.dict(), "department": current_user.get("dept")}

# --- Staff Management ---
# 1. CREATE Staff (POST)
@router.post("/staff", response_model=StaffResponse)
async def create_staff(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    is_class_teacher: bool = Form(...),
    subject_ids: List[int] = Form([]),
    assigned_class: Optional[str] = Form(None), # Add this new form field
    current_user: dict = Depends(auth.require_role(['hod']))
):
    user_dept = current_user.get("dept")
    if not user_dept: # Corrected from "department"
        raise HTTPException(status_code=403, detail="HOD must be assigned to a department.")
    
    if database_handler.get_user_by_username(username):
        raise HTTPException(status_code=400, detail="Username already exists.")

    role = 'class-teacher' if is_class_teacher else 'staff'
    # If not a class teacher, force assigned_class to be None
    final_assigned_class = assigned_class if is_class_teacher else None
    
    new_user = database_handler.create_user(
        username=username, password=password, full_name=full_name, role=role, 
        department=user_dept, assigned_class=final_assigned_class
    )
    if not new_user:
        raise HTTPException(status_code=500, detail="Failed to create staff account in database.")

    if subject_ids:
        database_handler.assign_subjects_to_staff(new_user['id'], subject_ids)

    created_user_details = database_handler.get_user_by_username(new_user['username'])
    return created_user_details

@router.get("/staff", response_model=List[StaffResponse])
async def get_staff_for_department(current_user: dict = Depends(auth.require_role(['hod', 'principal']))):
    user_dept = current_user.get("dept") # Use "dept" key
    if current_user.get('role') == 'principal':
        return database_handler.get_all_staff()
    if not user_dept:
        return []
    return database_handler.get_users_by_role_and_department(['staff', 'class-teacher'], user_dept)

@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: int, current_user: dict = Depends(auth.require_role(['hod']))):
    if not database_handler.delete_user(staff_id):
        raise HTTPException(status_code=404, detail="Staff member not found.")
    return {"status": "success", "message": "Staff member deleted."}

@router.put("/staff/{staff_id}")
async def update_staff(
    staff_id: int, 
    staff_data: StaffUpdate, # Use the updated Pydantic model
    current_user: dict = Depends(auth.require_role(['hod']))
):
    # Use the new, combined database function
    database_handler.update_staff_role_and_class(staff_id, staff_data.is_class_teacher, staff_data.assigned_class)
    database_handler.update_staff_subjects(staff_id, staff_data.subject_ids)
    return {"status": "success", "message": "Staff member updated successfully."}


@router.get("/staff/{staff_id}/subjects", response_model=List[int])
async def get_staff_assigned_subjects(staff_id: int, current_user: dict = Depends(auth.require_role(['hod']))):
    return database_handler.get_assigned_subject_ids_for_staff(staff_id)

@router.get("/subjects_with_staff")
async def get_subjects_with_staff(current_user: dict = Depends(auth.require_role(['hod']))):
    user_dept = current_user.get("dept") # Use "dept" key
    if not user_dept:
        return []
    return database_handler.get_subjects_and_staff_by_department(user_dept)