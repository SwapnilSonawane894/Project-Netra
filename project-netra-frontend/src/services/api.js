// src/services/api.js (Corrected and Final)

// This should be defined in a .env.local file in your frontend's root directory
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// --- Helper Function to get Auth Headers ---
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// --- Authentication Service ---
export const apiLogin = async (username, password) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

// --- Attendance & Verification Services ---
export const startVerification = async (currentLecture) => {
  try {
    const response = await fetch(`${API_URL}/api/attendance/start_verification`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ current_lecture: currentLecture }),
    });
    if (!response.ok) throw new Error('Failed to start verification');
    return await response.json();
  } catch (error) { throw error; }
};

export const stopVerification = async () => {
  try {
    const response = await fetch(`${API_URL}/api/attendance/stop_verification`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to stop verification');
    return await response.json();
  } catch (error) { throw error; }
};

// Public versions for automatic scheduler (no auth required)
export const startVerificationPublic = async (currentLecture) => {
  try {
    console.log(`API: Starting verification for ${currentLecture.subject} at ${API_URL}/api/attendance/start_verification`);
    const response = await fetch(`${API_URL}/api/attendance/start_verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // No auth headers
      body: JSON.stringify({ current_lecture: currentLecture }),
    });
    console.log(`API: Response status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API: Error response: ${errorText}`);
      throw new Error(`Failed to start verification: ${response.status} ${errorText}`);
    }
    const result = await response.json();
    console.log('API: Start verification successful:', result);
    return result;
  } catch (error) { 
    console.error('API: Start verification error:', error);
    throw error; 
  }
};

export const stopVerificationPublic = async () => {
  try {
    console.log(`API: Stopping verification at ${API_URL}/api/attendance/stop_verification`);
    const response = await fetch(`${API_URL}/api/attendance/stop_verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // No auth headers
    });
    console.log(`API: Response status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API: Error response: ${errorText}`);
      throw new Error(`Failed to stop verification: ${response.status} ${errorText}`);
    }
    const result = await response.json();
    console.log('API: Stop verification successful:', result);
    return result;
  } catch (error) { 
    console.error('API: Stop verification error:', error);
    throw error; 
  }
};

export const getStreamUrl = () => `${API_URL}/api/attendance/stream`;

// --- Student & Management Services ---
export const getStudents = async () => {
  try {
    const response = await fetch(`${API_URL}/api/management/students`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch students');
    return await response.json();
  } catch (error) { 
    console.error("API Error getStudents:", error); 
    throw error;
  }
};

export const getMyAttendanceRecords = async (date = null) => {
    try {
        // *** THIS IS THE CRITICAL FIX ***
        // The path now correctly includes "/attendance_records/"
        const url = date 
            ? `${API_URL}/api/management/attendance_records/my_records?date=${date}` 
            : `${API_URL}/api/management/attendance_records/my_records`;
            
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch your records');
        }
        return await response.json();
    } catch (error) {
        console.error("API Error getMyAttendanceRecords:", error);
        throw error;
    }
};

export const getAbsentRecords = async (date, subject, time_slot, student_class) => { // 1. Add student_class here
    try {
        // 2. Add student_class to the URL query string
        const url = `${API_URL}/api/management/attendance_records/absent?date=${date}&subject=${subject}&time_slot=${time_slot}&student_class=${student_class}`;
        
        const response = await fetch(url, { headers: getAuthHeaders() });
        
        if (!response.ok) {
            // Use our improved error handling
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch absent records');
        }
        
        return await response.json();
    } catch (error) { 
        console.error("API Error getAbsentRecords:", error);
        throw error;
    }
};

export const getTimetable = async () => {
  try {
    const response = await fetch(`${API_URL}/api/management/timetable`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch timetable');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const getTimetablePublic = async () => {
  try {
    const response = await fetch(`${API_URL}/api/management/timetable`, {
      headers: { 'Content-Type': 'application/json' } // No auth headers
    });
    if (!response.ok) throw new Error('Failed to fetch timetable');
    return await response.json();
  } catch (error) {
    throw error;
  }
};



export const getAttendance = async () => {
   try {
    const response = await fetch(`${API_URL}/api/attendance/get_attendance`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch attendance');
    return await response.json();
  } catch (error) { return {}; }
};

export const getAttendanceRecords = async (date = null) => {
    try {
        const url = date ? `${API_URL}/api/management/attendance_records?date=${date}` : `${API_URL}/api/management/attendance_records`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch records');
        return await response.json();
    } catch (error) { return []; }
};


export const notifyAbsentees = async (notificationData) => {
  try {
    const response = await fetch(`${API_URL}/api/management/notify_absentees`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(notificationData),
    });
    if (!response.ok) throw new Error('Failed to send notifications');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const notifyAbsenteesPublic = async (notificationData) => {
  try {
    const response = await fetch(`${API_URL}/api/management/notify_absentees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // No auth headers
      body: JSON.stringify(notificationData),
    });
    if (!response.ok) throw new Error('Failed to send notifications');
    return await response.json();
  } catch (error) {
    throw error;
  }
};


export const deleteStudent = async (roll_no) => {
  try {
    const response = await fetch(`${API_URL}/api/management/students/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roll_no }),
    });
    if (!response.ok) throw new Error('Failed to delete student');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const registerStudent = async (studentData) => {
    try {
        // For FormData, we don't set Content-Type; the browser does it.
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}/api/registration/register_student`, {
            method: 'POST',
            headers: headers,
            body: studentData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to register student');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};


export const saveTimetable = async (timetableData) => {
  try {
    const response = await fetch(`${API_URL}/api/management/timetable`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(timetableData),
    });
    if (!response.ok) throw new Error('Failed to save timetable');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const getAvailableClasses = async () => {
  try {
    const response = await fetch(`${API_URL}/api/management/available_classes`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch available classes');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const createHod = async (hodData) => {
    try {
        const response = await fetch(`${API_URL}/api/principal/hods`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(hodData),
        });
        if (!response.ok) throw new Error('Failed to create HOD');
        return await response.json();
    } catch (error) { throw error; }
};

export const getHods = async () => {
    try {
        const response = await fetch(`${API_URL}/api/principal/hods`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch HODs');
        return await response.json();
    } catch (error) { return []; }
};

export const createDepartment = async (deptData) => {
    try {
        const response = await fetch(`${API_URL}/api/principal/departments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(deptData),
        });
        if (!response.ok) throw new Error('Failed to create department');
        return await response.json();
    } catch (error) { throw error; }
};

export const getDepartments = async () => {
    try {
        const response = await fetch(`${API_URL}/api/principal/departments`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch departments');
        return await response.json();
    } catch (error) { return []; }
};

export const createSubject = async (subjectData) => {
    try {
        const response = await fetch(`${API_URL}/api/hod/subjects`, {
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(subjectData),
        });
        if (!response.ok) throw new Error('Failed to create subject');
        return await response.json();
    } catch (error) { throw error; }
};

export const getSubjects = async () => {
    try {
        const response = await fetch(`${API_URL}/api/hod/subjects`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch subjects');
        return await response.json();
    } catch (error) { return []; }
};

export const getSubjectsWithStaff = async () => {
    try {
        const response = await fetch(`${API_URL}/api/hod/subjects_with_staff`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch subjects with staff');
        return await response.json();
    } catch (error) {
        console.error("API Error getSubjectsWithStaff:", error);
        return [];
    }
};

export const createStaff = async (staffFormData) => {
  // For FormData, we must not set 'Content-Type' in headers.
  // The browser will do it for us, including the necessary boundary.
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/hod/staff`, {
    method: 'POST',
    headers: headers, // Send headers without Content-Type
    body: staffFormData, // Send the FormData object directly
  });
  
  if (!response.ok) {
    // Use our helper to throw a clean error message to the UI
    await handleError(response);
  }
  
  return await response.json();
};
// =

export const getStaff = async () => {
    try {
        const response = await fetch(`${API_URL}/api/hod/staff`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch staff');
        return await response.json();
    } catch (error) { return []; }
};

export const deleteHod = async (hodId) => {
  try {
    const response = await fetch(`${API_URL}/api/principal/hods/${hodId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete HOD');
    }
    return await response.json();
  } catch (error) { throw error; }
};

export const deleteDepartment = async (deptId) => {
  try {
    const response = await fetch(`${API_URL}/api/principal/departments/${deptId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete Department');
    }
    return await response.json();
  } catch (error) { throw error; }
};

export const deleteStaff = async (staffId) => {
  try {
    const response = await fetch(`${API_URL}/api/hod/staff/${staffId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete Staff');
    }
    return await response.json();
  } catch (error) { throw error; }
};

export const deleteSubject = async (subjectId) => {
  try {
    const response = await fetch(`${API_URL}/api/hod/subjects/${subjectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete Subject');
    }
    return await response.json();
  } catch (error) { throw error; }
};

export const updateDepartment = async (deptId, deptData) => {
  try {
    const response = await fetch(`${API_URL}/api/principal/departments/${deptId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(deptData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update department');
    }
    return await response.json();
  } catch (error) { throw error; }
};

export const updateUserProfile = async (profileData) => {
  const response = await fetch(`${API_URL}/api/users/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });
  if (!response.ok) await handleError(response);
  return await response.json(); 
};

export const changePassword = async (passwordData) => {
  try {
    const response = await fetch(`${API_URL}/api/users/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(passwordData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to change password');
    }
    return await response.json();
  } catch (error) { throw error; }
};

export const updateSubject = async (subjectId, subjectData) => {
  try {
    const response = await fetch(`${API_URL}/api/hod/subjects/${subjectId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(subjectData),
    });
    if (!response.ok) throw new Error('Failed to update subject');
    return await response.json();
  } catch (error) { throw error; }
};

export const updateStaff = async (staffId, staffData) => {
  try {
    const response = await fetch(`${API_URL}/api/hod/staff/${staffId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(staffData),
    });
    if (!response.ok) throw new Error('Failed to update staff');
    return await response.json();
  } catch (error) { throw error; }
};

export const updateHodDepartment = async (hodId, departmentCode) => {
  try {
    const response = await fetch(`${API_URL}/api/principal/hods/${hodId}/department`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ department: departmentCode }),
    });
    if (!response.ok) throw new Error('Failed to update HOD department');
    return await response.json();
  } catch (error) { throw error; }
};

export const updateStudent = async (rollNo, studentData) => {
  try {
    const response = await fetch(`${API_URL}/api/management/students/${rollNo}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(studentData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update student');
    }
    return await response.json();
  } catch (error) { throw error; }
};

export const getAssignedSubjectsForStaff = async (staffId) => {
  try {
    const response = await fetch(`${API_URL}/api/hod/staff/${staffId}/subjects`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch assigned subjects');
    }
    return await response.json(); // Should return an array of IDs, e.g., [1, 5]
  } catch (error) { 
    console.error("API Error getAssignedSubjectsForStaff:", error);
    throw error;
  }
};

