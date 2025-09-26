// src/services/api.js (Corrected and Final)

const API_BASE_URL = 'http://localhost:8000/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        // --- THIS IS THE CRITICAL SYNTAX FIX ---
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// --- Authentication Service (Does NOT use auth headers) ---
export const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

// --- All other services now use the auth headers ---

export const startVerification = async (currentLecture) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/start_verification`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ current_lecture: currentLecture }),
    });
    if (!response.ok) throw new Error('Failed to start verification');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const stopVerification = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/stop_verification`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to stop verification');
    return await response.json();
  } catch (error) { throw error; }
};

export const getStreamUrl = () => `${API_BASE_URL}/attendance/stream`;

export const getAttendance = async () => {
   try {
    const response = await fetch(`${API_BASE_URL}/attendance/get_attendance`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch attendance');
    return await response.json();
  } catch (error) { return {}; }
};

export const getAttendanceRecords = async (date = null) => {
    try {
        const url = date ? `${API_BASE_URL}/management/attendance_records?date=${date}` : `${API_BASE_URL}/management/attendance_records`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch records');
        return await response.json();
    } catch (error) { return []; }
};

export const getAbsentRecords = async (date, subject, time_slot) => {
    try {
        const url = `${API_BASE_URL}/management/attendance_records/absent?date=${date}&subject=${subject}&time_slot=${time_slot}`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch absent records');
        return await response.json();
    } catch (error) { return []; }
};

export const notifyAbsentees = async (lectureDetails) => {
    try {
        const response = await fetch(`${API_BASE_URL}/management/notify_absentees`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(lectureDetails),
        });
        if (!response.ok) throw new Error('Failed to trigger absentee notifications');
        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const getStudents = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/management/students`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch students');
    return await response.json();
  } catch (error) { return []; }
};

export const getStudentsByDept = async (department) => {
  try {
    const response = await fetch(`${API_BASE_URL}/management/students?department=${department}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch students by department');
    return await response.json();
  } catch (error) { return []; }
};

export const deleteStudent = async (roll_no) => {
  try {
    const response = await fetch(`${API_BASE_URL}/management/students/delete`, {
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
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/registration/register_student`, {
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

export const getTimetable = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/management/timetable`, { headers: getAuthHeaders() });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch timetable');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const saveTimetable = async (timetableData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/management/timetable`, {
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

export const createHod = async (hodData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/principal/hods`, {
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
        const response = await fetch(`${API_BASE_URL}/principal/hods`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch HODs');
        return await response.json();
    } catch (error) { return []; }
};

export const createDepartment = async (deptData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/principal/departments`, {
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
        const response = await fetch(`${API_BASE_URL}/principal/departments`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch departments');
        return await response.json();
    } catch (error) { return []; }
};

export const createSubject = async (subjectData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/hod/subjects`, {
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(subjectData),
        });
        if (!response.ok) throw new Error('Failed to create subject');
        return await response.json();
    } catch (error) { throw error; }
};

export const getSubjects = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/hod/subjects`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch subjects');
        return await response.json();
    } catch (error) { return []; }
};

export const createStaff = async (staffData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/hod/staff`, {
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(staffData),
        });
        if (!response.ok) throw new Error('Failed to create staff');
        return await response.json();
    } catch (error) { throw error; }
};

export const getStaff = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/hod/staff`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch staff');
        return await response.json();
    } catch (error) { return []; }
};