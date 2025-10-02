# backend/routes/management.py (Corrected and Final)
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from .. import database_handler
from .. import auth
from .. import whatsapp_sender

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Pydantic Models for Data Validation ---
class DeleteStudentRequest(BaseModel):
    roll_no: str



class LectureEndRequest(BaseModel):
    date: str
    subject: str
    teacher: str
    time_slot: str
    student_class: str 

class StudentUpdate(BaseModel): # <<< NEW MODEL
    name: str
    student_class: str
    parent_phone: str

# --- Student Management Endpoints ---
@router.get("/students")
async def get_students(
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Fetches students based on the user's role and department.
    - Principal: Sees all students.
    - HOD/Class Teacher: Sees students in their department AND unassigned students.
    """
    user_role = current_user.get("role")
    user_dept = current_user.get("dept")

    all_students = database_handler.get_all_students_for_management()

    if user_role == 'principal':
        return all_students
    
    # --- THIS IS THE CRITICAL FIX ---
    # For HODs and Class Teachers, we now show students that match their
    # department OR students that have no department assigned yet (is None).
    if user_role in ['hod', 'class-teacher']:
        if not user_dept:
            raise HTTPException(status_code=403, detail="User is not assigned to a department.")
        
        # This new logic includes students with a matching department OR no department
        return [
            s for s in all_students 
            if s.get('department') == user_dept or s.get('department') is None
        ]

    # Regular staff should not see any students on this page.
    return []

@router.post("/students/delete", dependencies=[Depends(auth.require_role(['hod', 'class-teacher', 'principal']))])
async def delete_student_endpoint(request: DeleteStudentRequest):
    success = database_handler.delete_student(request.roll_no)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found.")
    return {"status": "success", "message": f"Student {request.roll_no} deleted."}

# --- Timetable Management Endpoints ---
@router.post("/timetable", dependencies=[Depends(auth.require_role(['hod', 'principal']))])
async def save_timetable_endpoint(timetable_data: Dict[str, Any]):
    """
    Save multi-class timetable structure.
    Expects: {
        "FYCO": {"timeSlots": [...], "schedule": {...}},
        "SYCO": {"timeSlots": [...], "schedule": {...}},
        "TYCO": {"timeSlots": [...], "schedule": {...}}
    }
    """
    try:
        # Validate the multi-class structure
        if not isinstance(timetable_data, dict):
            raise HTTPException(status_code=400, detail="Timetable data must be a dictionary")
        
        for class_name, timetable in timetable_data.items():
            if not isinstance(timetable, dict):
                raise HTTPException(status_code=400, detail=f"Invalid timetable structure for class {class_name}")
            
            # Validate required fields
            if "timeSlots" not in timetable:
                raise HTTPException(status_code=400, detail=f"Missing timeSlots for class {class_name}")
            if "schedule" not in timetable:
                raise HTTPException(status_code=400, detail=f"Missing schedule for class {class_name}")
            
            # Validate timeSlots is a list
            if not isinstance(timetable["timeSlots"], list):
                raise HTTPException(status_code=400, detail=f"timeSlots must be a list for class {class_name}")
            
            # Validate schedule is a dict
            if not isinstance(timetable["schedule"], dict):
                raise HTTPException(status_code=400, detail=f"schedule must be a dictionary for class {class_name}")
        
        # Save the multi-class timetable structure
        database_handler.save_timetable(timetable_data)
        return {"status": "success", "message": "Multi-class timetables saved successfully."}
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Error saving timetable: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/timetable")
async def get_timetable_endpoint():
    """
    Get multi-class timetable structure with all days properly initialized.
    Public endpoint to allow automatic attendance scheduling.
    """
    try:
        # Get all departments to build class structure
        departments = database_handler.get_all_departments()
        dept_codes = [dept['code'] for dept in departments]
        
        # Get existing timetable data
        schedule = database_handler.get_timetable()
        
        # Template for proper schedule structure
        def create_empty_schedule():
            return {
                "Monday": {},
                "Tuesday": {},
                "Wednesday": {},
                "Thursday": {},
                "Friday": {},
                "Saturday": {}
            }
        
        # Build empty structure for all possible classes
        empty_structure = {}
        for dept_code in dept_codes:
            for year in ['FY', 'SY', 'TY']:
                class_name = f"{year}{dept_code}"
                empty_structure[class_name] = {
                    "timeSlots": [],
                    "schedule": create_empty_schedule()
                }
        
        if schedule is None:
            return empty_structure
        
        # If it's old single-timetable format, merge with empty structure
        if "timeSlots" in schedule and "schedule" in schedule:
            # Old format detected, assign to first available class
            if dept_codes:
                first_class = f"FY{dept_codes[0]}"
                empty_structure[first_class] = {
                    "timeSlots": schedule.get("timeSlots", []),
                    "schedule": {
                        **create_empty_schedule(),
                        **schedule.get("schedule", {})
                    }
                }
            return empty_structure
        
        # Merge existing data with empty structure, ensuring all days are present
        for class_name in empty_structure:
            if class_name in schedule:
                existing_timetable = schedule[class_name]
                empty_structure[class_name] = {
                    "timeSlots": existing_timetable.get("timeSlots", []),
                    "schedule": {
                        **create_empty_schedule(),
                        **existing_timetable.get("schedule", {})
                    }
                }
                
        return empty_structure
        
    except Exception as e:
        logger.error(f"Error getting timetable: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/available_classes")
async def get_available_classes(current_user: dict = Depends(auth.get_current_user)):
    """
    Get available classes for timetable management based on user role.
    Returns: ["FYCO", "SYCO", "TYCO", "FYIT", "SYIT", "TYIT", ...]
    """
    try:
        # Get all departments
        departments = database_handler.get_all_departments()
        dept_codes = [dept['code'] for dept in departments]
        
        # Generate classes based on departments (FY, SY, TY for each department)
        def generate_classes_for_departments(dept_codes_list):
            classes = []
            for dept_code in dept_codes_list:
                classes.extend([f"FY{dept_code}", f"SY{dept_code}", f"TY{dept_code}"])
            return classes
        
        user_role = current_user.get("role")
        user_dept = current_user.get("dept")
        
        if user_role == 'principal':
            # Principal can manage all classes for all departments
            return generate_classes_for_departments(dept_codes)
        
        if user_role == 'hod' and user_dept:
            # HOD can manage all classes in their department
            return generate_classes_for_departments([user_dept])
        
        if user_role == 'class-teacher' and current_user.get('assignedClass'):
            # Class teacher can only manage their assigned class
            return [current_user.get('assignedClass')]
        
        # Regular staff or users without proper assignment
        return []
        
    except Exception as e:
        logger.error(f"Error getting available classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# --- Attendance and Notification Endpoints ---

@router.post("/notify_absentees")
async def notify_absentees_endpoint(request: LectureEndRequest):
    absent_students = database_handler.get_absent_students_for_lecture(
        filter_date=request.date,
        subject=request.subject,
        time_slot=request.time_slot,
        student_class=request.student_class  # --- FIX: Pass the class to the DB function
    )
    if not absent_students:
        return {"status": "success", "message": "No absentees to notify."}
    
    sent_count = 0
    for student in absent_students:
        if student.get("parent_phone"):
            if whatsapp_sender.send_absentee_message(
                parent_phone=student["parent_phone"], student_name=student["name"],
                subject=request.subject, teacher=request.teacher, time_slot=request.time_slot
            ):
                sent_count += 1
    return {"status": "success", "message": f"Notification process complete. Sent {sent_count} of {len(absent_students)} messages."}

@router.get("/attendance_records")
async def get_records(
    date: Optional[str] = None,
    current_user: dict = Depends(auth.get_current_user) # Protect the route
):
    """
    Fetches historical attendance records.
    - Principal: Sees all records.
    - HOD: Sees records for their department only.
    - Staff/Class Teacher: Sees records for their lectures only.
    """
    user_role = current_user.get("role")
    user_dept = current_user.get("dept")
    user_name = current_user.get("fullName") # From the JWT token

    if user_role == 'principal':
        return database_handler.get_attendance_records(filter_date=date)
    
    if user_role == 'hod':
        all_records = database_handler.get_attendance_records(filter_date=date)
        # HODs see all records from students in their department
        hod_students = {s['roll_no'] for s in database_handler.get_all_students_for_management() if s.get('department') == user_dept}
        return [r for r in all_records if r['roll_no'] in hod_students]

    if user_role in ['staff', 'class-teacher']:
        return database_handler.get_attendance_records_by_teacher(user_name, filter_date=date)
    
    return []

@router.get("/attendance_records/absent")
async def get_absent_records(date: str, subject: str, time_slot: str, student_class: str, current_user: dict = Depends(auth.get_current_user)):
    # --- FIX: Accept and pass the student_class parameter ---
    return database_handler.get_absent_students_for_lecture(date, subject, time_slot, student_class)


@router.get("/attendance_records/by_teacher")
async def get_records_by_teacher(
    current_user: dict = Depends(auth.get_current_user),
    date: Optional[str] = None
):
    """Fetches historical attendance records for the currently logged-in teacher."""
    teacher_name = current_user.get("fullName") # Assuming fullName is the teacher's name
    if not teacher_name:
        raise HTTPException(status_code=403, detail="User has no name associated.")
    
    records = database_handler.get_attendance_records_by_teacher(teacher_name, filter_date=date)
    return records


@router.get("/attendance_records/my_records")
async def get_my_records(
    date: Optional[str] = None,
    # This endpoint is protected and uses the user's token to identify them
    current_user: dict = Depends(auth.require_role(['staff', 'class-teacher', 'hod', 'principal']))
):
    """Fetches historical attendance records for the currently logged-in teacher."""
    teacher_name = current_user.get("fullName")
    if not teacher_name:
        raise HTTPException(status_code=403, detail="User has no name associated in token.")
    
    records = database_handler.get_attendance_records_by_teacher(teacher_name, filter_date=date)
    return records

@router.put("/students/{roll_no}") # <<< NEW ENDPOINT
async def update_student_endpoint(
    roll_no: str,
    student_data: StudentUpdate,
    current_user: dict = Depends(auth.require_role(['principal', 'hod', 'class-teacher']))
):
    """Allows an authorized user to update a student's details."""
    # (Optional) Add logic here to ensure a CT can only edit students in their own dept
    success = database_handler.update_student(
        roll_no,
        student_data.name,
        student_data.student_class,
        student_data.parent_phone
    )
    if not success:
        raise HTTPException(status_code=404, detail="Student not found or update failed.")
    return {"status": "success", "message": f"Student {roll_no} updated successfully."}



# --- Pydantic Models for Data Validation ---
class DeleteStudentRequest(BaseModel):
    roll_no: str

class FullTimetable(BaseModel):
    timeSlots: List[str]
    schedule: Dict[str, Any]

class LectureEndRequest(BaseModel):
    date: str
    subject: str
    teacher: str
    time_slot: str
    student_class: str 

class StudentUpdate(BaseModel): # <<< NEW MODEL
    name: str
    student_class: str
    parent_phone: str

# --- Student Management Endpoints ---
@router.get("/students")
async def get_students(
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Fetches students based on the user's role and department.
    - Principal: Sees all students.
    - HOD/Class Teacher: Sees students in their department AND unassigned students.
    """
    user_role = current_user.get("role")
    user_dept = current_user.get("dept")

    all_students = database_handler.get_all_students_for_management()

    if user_role == 'principal':
        return all_students
    
    # --- THIS IS THE CRITICAL FIX ---
    # For HODs and Class Teachers, we now show students that match their
    # department OR students that have no department assigned yet (is None).
    if user_role in ['hod', 'class-teacher']:
        if not user_dept:
            raise HTTPException(status_code=403, detail="User is not assigned to a department.")
        
        # This new logic includes students with a matching department OR no department
        return [
            s for s in all_students 
            if s.get('department') == user_dept or s.get('department') is None
        ]

    # Regular staff should not see any students on this page.
    return []

@router.post("/students/delete", dependencies=[Depends(auth.require_role(['hod', 'class-teacher', 'principal']))])
async def delete_student_endpoint(request: DeleteStudentRequest):
    success = database_handler.delete_student(request.roll_no)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found.")
    return {"status": "success", "message": f"Student {request.roll_no} deleted."}



# --- Timetable Management Endpoints ---
@router.post("/timetable", dependencies=[Depends(auth.require_role(['hod', 'principal']))])
async def save_timetable_endpoint(timetable_data: Dict[str, Any]):
    """
    Save multi-class timetable structure.
    Expects: {
        "FYCO": {"timeSlots": [...], "schedule": {...}},
        "SYCO": {"timeSlots": [...], "schedule": {...}},
        "TYCO": {"timeSlots": [...], "schedule": {...}}
    }
    """
    try:
        # Validate the multi-class structure
        if not isinstance(timetable_data, dict):
            raise HTTPException(status_code=400, detail="Timetable data must be a dictionary")
        
        for class_name, timetable in timetable_data.items():
            if not isinstance(timetable, dict):
                raise HTTPException(status_code=400, detail=f"Invalid timetable structure for class {class_name}")
            
            # Validate required fields
            if "timeSlots" not in timetable:
                raise HTTPException(status_code=400, detail=f"Missing timeSlots for class {class_name}")
            if "schedule" not in timetable:
                raise HTTPException(status_code=400, detail=f"Missing schedule for class {class_name}")
            
            # Validate timeSlots is a list
            if not isinstance(timetable["timeSlots"], list):
                raise HTTPException(status_code=400, detail=f"timeSlots must be a list for class {class_name}")
            
            # Validate schedule is a dict
            if not isinstance(timetable["schedule"], dict):
                raise HTTPException(status_code=400, detail=f"schedule must be a dictionary for class {class_name}")
        
        # Save the multi-class timetable structure
        database_handler.save_timetable(timetable_data)
        return {"status": "success", "message": "Multi-class timetables saved successfully."}
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"Error saving timetable: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/timetable", dependencies=[Depends(auth.get_current_user)])
async def get_timetable_endpoint():
    """
    Get multi-class timetable structure.
    Returns: {
        "FYCO": {"timeSlots": [...], "schedule": {...}},
        "SYCO": {"timeSlots": [...], "schedule": {...}},
        "TYCO": {"timeSlots": [...], "schedule": {...}}
    }
    """
    try:
        schedule = database_handler.get_timetable()
        
        if schedule is None:
            # Return empty structure for all classes
            return {
                "FYCO": {"timeSlots": [], "schedule": {"Monday": {}, "Tuesday": {}, "Wednesday": {}, "Thursday": {}, "Friday": {}, "Saturday": {}}},
                "SYCO": {"timeSlots": [], "schedule": {"Monday": {}, "Tuesday": {}, "Wednesday": {}, "Thursday": {}, "Friday": {}, "Saturday": {}}},
                "TYCO": {"timeSlots": [], "schedule": {"Monday": {}, "Tuesday": {}, "Wednesday": {}, "Thursday": {}, "Friday": {}, "Saturday": {}}}
            }
        
        # If it's old single-timetable format, convert to multi-class
        if "timeSlots" in schedule and "schedule" in schedule:
            # Old format detected, convert to new multi-class format
            return {
                "FYCO": schedule,
                "SYCO": {"timeSlots": [], "schedule": {"Monday": {}, "Tuesday": {}, "Wednesday": {}, "Thursday": {}, "Friday": {}, "Saturday": {}}},
                "TYCO": {"timeSlots": [], "schedule": {"Monday": {}, "Tuesday": {}, "Wednesday": {}, "Thursday": {}, "Friday": {}, "Saturday": {}}}
            }
        
        return schedule
        
    except Exception as e:
        logger.error(f"Error getting timetable: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
# --- Attendance and Notification Endpoints ---
