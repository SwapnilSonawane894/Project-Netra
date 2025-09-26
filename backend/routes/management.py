# backend/routes/management.py (Final, Complete Version)
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from .. import database_handler
from .. import auth # Import the auth module for its dependencies

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Student Management ---
@router.get("/students", dependencies=[Depends(auth.require_role(['principal', 'hod', 'class-teacher']))])
async def get_students(current_user: dict = Depends(auth.get_current_user)):
    """Fetches students based on the user's role and department."""
    user_role = current_user.get("role")
    user_dept = current_user.get("dept")

    all_students = database_handler.get_all_students_for_management()

    if user_role == 'principal':
        return all_students # Principal sees everyone
    if user_role == 'hod':
        return [s for s in all_students if s['department'] == user_dept]
    if user_role == 'class-teacher':
        # Assuming class teacher also belongs to a department
        return [s for s in all_students if s['department'] == user_dept]
    return []

class DeleteStudentRequest(BaseModel):
    roll_no: str

@router.post("/students/delete", dependencies=[Depends(auth.require_role(['hod', 'class-teacher', 'principal']))])
async def delete_student_endpoint(request: DeleteStudentRequest):
    success = database_handler.delete_student(request.roll_no)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found.")
    return {"status": "success", "message": f"Student {request.roll_no} deleted."}


# --- Timetable Management ---
class FullTimetable(BaseModel):
    timeSlots: List[str]
    schedule: Dict[str, Any]

@router.post("/timetable", dependencies=[Depends(auth.require_role(['hod', 'principal']))])
async def save_timetable_endpoint(timetable: FullTimetable):
    try:
        database_handler.save_timetable(timetable.dict())
        return {"status": "success", "message": "Timetable saved successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timetable", dependencies=[Depends(auth.get_current_user)])
async def get_timetable_endpoint():
    schedule = database_handler.get_timetable()
    if schedule is None:
        return {"timeSlots": [], "schedule": {}}
    return schedule


# --- Attendance Report Endpoint ---
@router.get("/attendance_records", dependencies=[Depends(auth.get_current_user)])
async def get_records(date: Optional[str] = None):
    records = database_handler.get_attendance_records(filter_date=date)
    return records