// src/app/(dashboard)/attendance/page.js
"use client";
import { useState, useEffect } from 'react';
import LiveStream from '../../../components/ui/LiveStream';
import AttendanceTable from '../../../components/specific/AttendanceTable';
import { getAttendance } from '../../../services/api';
import styles from './attendance.module.css';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    // This is where the magic happens:
    const interval = setInterval(async () => {
      console.log("Fetching attendance data..."); // Let's add a log
      const data = await getAttendance();
      // ... (code to update the state)
    }, 2000); // The interval is set to 2000 milliseconds (2 seconds)

    // This is a cleanup function. When you leave the page, it stops the polling.
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Live Attendance Verification</h1>
      <div className={styles.container}>
        <div className={styles.mainPanel}>
          <LiveStream />
        </div>
        <div className={styles.sidePanel}>
          <AttendanceTable attendanceData={attendance} />
        </div>
      </div>
    </div>
  );
}