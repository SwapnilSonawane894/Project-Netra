// src/app/(dashboard)/attendance/page.js (Final, Role-Aware Version)
"use client";
import { useState, useEffect } from 'react';
import LiveStream from '../../../components/ui/LiveStream';
import AttendanceTable from '../../../components/specific/AttendanceTable';
import Card from '../../../components/ui/Card';
import { getAttendance } from '../../../services/api';
import styles from './attendance.module.css';
import { useAuth } from '../../../context/AuthContext'; // Import the auth hook

export default function AttendancePage() {
  const { user, isVerifying, currentLecture } = useAuth(); // Get global state
  const [attendance, setAttendance] = useState([]);
  const [canViewStream, setCanViewStream] = useState(false);

  // This effect determines if the current user is allowed to see the stream
  useEffect(() => {
    if (user && isVerifying && currentLecture) {
      // Allow principals, HODs, and all staff/class teachers to view any active lecture
      if (['principal', 'hod', 'staff', 'class-teacher'].includes(user.role)) {
        setCanViewStream(true);
        console.log(`${user.role} can view active lecture: ${currentLecture.subject}`);
      } else {
        setCanViewStream(false);
      }
    } else {
      setCanViewStream(false);
      if (user && !isVerifying) {
        console.log('No active lecture to display');
      }
    }
  }, [user, isVerifying, currentLecture]);


  // This effect polls for live attendance data, but only if the stream is active
  useEffect(() => {
    if (isVerifying) {
      const interval = setInterval(async () => {
        const data = await getAttendance();
        const dataArray = Object.keys(data).map(key => ({
          rollNo: key, ...data[key]
        }));
        setAttendance(dataArray);
      }, 2000);

      return () => clearInterval(interval);
    } else {
      setAttendance([]); // Clear attendance when verification stops
    }
  }, [isVerifying]);

  return (
    <div>
      <h1>Live Attendance Verification</h1>
      <div className={styles.container}>
        <div className={styles.mainPanel}>
          {canViewStream ? (
            <LiveStream />
          ) : (
            <Card>
              <h2>Live Stream</h2>
              <div className={styles.placeholder}>
                {isVerifying ? (
                  <div>
                    <h3>🔴 Live Attendance in Progress</h3>
                    <p><strong>Subject:</strong> {currentLecture?.subject}</p>
                    <p><strong>Teacher:</strong> {currentLecture?.teacher}</p>
                    <p><strong>Class:</strong> {currentLecture?.class}</p>
                    <p><strong>Time:</strong> {currentLecture?.time}</p>
                    <p><strong>Hall:</strong> {currentLecture?.hall}</p>
                  </div>
                ) : (
                  <div>
                    <h3>⭕ No Active Lecture</h3>
                    <p>Waiting for scheduled lecture to begin...</p>
                    <p>The system will automatically start attendance when a lecture is scheduled.</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
        <div className={styles.sidePanel}>
          <AttendanceTable attendanceData={attendance} />
        </div>
      </div>
    </div>
  );
}