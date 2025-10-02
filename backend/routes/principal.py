# backend/routes/principal.py (Final, Complete Version)
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from .. import database_handler
from .. import auth

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Pydantic Models for Data Validation ---
class HodCreate(BaseModel):
    username: str
    password: str
    full_name: str
    department: str

class HodResponse(BaseModel):
    id: int
    username: str
    full_name: str
    department: str

class DepartmentCreate(BaseModel):
    name: str
    code: str

class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: str

# --- Endpoints ---

class DepartmentUpdate(BaseModel): # <<< NEW MODEL
    name: str
    code: str

class ProfileUpdate(BaseModel): # <<< NEW MODEL
    full_name: str
    username: str

class HodDepartmentUpdate(BaseModel):
    department: str



@router.post("/hods", response_model=HodResponse)
async def create_hod(
    hod_data: HodCreate,
    current_user: dict = Depends(auth.require_role(['principal']))
):
    if database_handler.get_user_by_username(hod_data.username):
        raise HTTPException(status_code=400, detail="Username already exists.")
    
    new_user = database_handler.create_user(
        username=hod_data.username, password=hod_data.password,
        full_name=hod_data.full_name, role='hod',
        department=hod_data.department.upper()
    )
    if not new_user:
        raise HTTPException(status_code=500, detail="Failed to create HOD account.")
    return new_user

@router.get("/hods", response_model=List[HodResponse])
async def get_all_hods(current_user: dict = Depends(auth.require_role(['principal']))):
    return database_handler.get_users_by_role('hod')

@router.delete("/hods/{hod_id}")
async def delete_hod(
    hod_id: int,
    current_user: dict = Depends(auth.require_role(['principal']))
):
    success = database_handler.delete_user(hod_id)
    if not success:
        raise HTTPException(status_code=404, detail="HOD not found.")
    return {"status": "success", "message": f"HOD with ID {hod_id} deleted."}

@router.put("/hods/{hod_id}/department")
async def update_hod_department(
    hod_id: int,
    update_data: HodDepartmentUpdate,
    current_user: dict = Depends(auth.require_role(['principal']))
):
    success = database_handler.update_hod_department(hod_id, update_data.department)
    if not success:
        raise HTTPException(status_code=404, detail="HOD or Department not found.")
    return {"status": "success", "message": "HOD's department updated successfully."}

@router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    dept_data: DepartmentCreate,
    current_user: dict = Depends(auth.require_role(['principal']))
):
    new_dept = database_handler.create_department(dept_data.name, dept_data.code.upper())
    if not new_dept:
        raise HTTPException(status_code=400, detail="Department code already exists.")
    return new_dept

@router.get("/departments", response_model=List[DepartmentResponse])
async def get_all_departments(current_user: dict = Depends(auth.require_role(['principal', 'hod', 'class-teacher']))):
    return database_handler.get_all_departments()

@router.delete("/departments/{dept_id}")
async def delete_department(
    dept_id: int,
    current_user: dict = Depends(auth.require_role(['principal']))
):
    success = database_handler.delete_department(dept_id)
    if not success:
        raise HTTPException(status_code=404, detail="Department not found.")
    return {"status": "success", "message": f"Department with ID {dept_id} deleted."}

@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: int,
    dept_data: DepartmentUpdate,
    current_user: dict = Depends(auth.require_role(['principal']))
):
    success = database_handler.update_department(dept_id, dept_data.name, dept_data.code.upper())
    if not success:
        raise HTTPException(status_code=400, detail="Department code may already exist.")
    return {"id": dept_id, "name": dept_data.name, "code": dept_data.code.upper()}