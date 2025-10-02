// src/app/(dashboard)/my-attendance/page.js (Corrected with Collapsible UI)
"use client";
import { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import { useAuth } from '@/context/AuthContext';
import { getMyAttendanceRecords, getAbsentRecords } from '@/services/api';
import styles from './my-attendance.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// Helper to format date to YYYY-MM-DD
const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

function LectureCard({ lecture, token }) {
    const [isOpen, setIsOpen] = useState(false);
    const [absentees, setAbsentees] = useState([]);
    const [isLoadingAbsentees, setIsLoadingAbsentees] = useState(false);
    const [isContentOpen, setIsContentOpen] = useState(false);
    const [showAbsentees, setShowAbsentees] = useState(false);
    const presentCount = lecture.present_students.length;

    const handleShowAbsenteesClick = async () => {
        // This is the new toggle logic
        if (showAbsentees) {
            setShowAbsentees(false); // If it's open, close it
            return;
        }

        setIsLoadingAbsentees(true);
        setShowAbsentees(true); // Open the section immediately
        try {
            const data = await getAbsentRecords(lecture.date, lecture.subject, lecture.time_slot);
            setAbsentees(data);
        } catch (error) {
            console.error("Error fetching absentees:", error);
            alert("Could not fetch absentee list.");
            setShowAbsentees(false); // Close on error
        } finally {
            setIsLoadingAbsentees(false);
        }
    };
    return (
        <div className={styles.lectureCard}>
            <button className={styles.lectureHeader} onClick={() => setIsContentOpen(!isContentOpen)}>
                <h3>{lecture.subject}</h3>
                <div className={styles.headerInfo}>
                    <span><strong>Time:</strong> {lecture.time_slot}</span>
                    <span><strong>Hall:</strong> {lecture.hall}</span>
                    <span><strong>Present:</strong> {presentCount}</span>
                </div>
                <span className={`${styles.toggleIcon} ${isContentOpen ? styles.open : ''}`}>▼</span>
            </button>
            <div className={`${styles.lectureContentWrapper} ${isContentOpen ? styles.open : ''}`}>
                <div className={styles.lectureContent}>
                    <h4>Present Students</h4>
                    {presentCount > 0 ? (
                        <div className={styles.tableContainer}>
                            <table className={styles.reportTable}>
                                <thead><tr><th>Roll No</th><th>Name</th><th>Timestamp</th></tr></thead>
                                <tbody>
                                    {lecture.present_students.map(rec => (
                                        <tr key={rec.id}><td>{rec.roll_no}</td><td>{rec.name}</td><td>{new Date(rec.timestamp).toLocaleTimeString()}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p>No students were marked present.</p>}

                    <div className={styles.absentSection}>
                        <Button onClick={handleShowAbsenteesClick} variant="secondary">
                            {showAbsentees ? 'Hide Absentees' : 'Show Absentees'}
                        </Button>
                        
                        {/* This content now correctly shows/hides based on the 'showAbsentees' state */}
                        {showAbsentees && (
                            isLoadingAbsentees ? (
                                <p>Loading absentees...</p>
                            ) : (
                                <div className={styles.tableContainer} style={{marginTop: '15px'}}>
                                    <h4>Absent Students</h4>
                                    {absentees.length > 0 ? (
                                        <table className={styles.reportTable}>
                                            <thead><tr><th>Roll No</th><th>Name</th><th>Class</th></tr></thead>
                                            <tbody>
                                                {absentees.map(s => <tr key={s.roll_no}><td>{s.roll_no}</td><td>{s.name}</td><td>{s.student_class}</td></tr>)}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No absentees found for this lecture.</p>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
    
}

export default function MyAttendancePage() {
    const { token } = useAuth();
    const [groupedRecords, setGroupedRecords] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchAndGroupRecords = useCallback(async (date) => {
        if (!token) return;
        setIsLoading(true);
        setGroupedRecords({});
        const formattedDate = formatDate(date);

        try {
            const flatRecords = await getMyAttendanceRecords(formattedDate);
            const groups = flatRecords.reduce((acc, record) => {
                const key = `${record.subject}-${record.time_slot}`;
                if (!acc[key]) {
                    acc[key] = {
                        subject: record.subject,
                        time_slot: record.time_slot,
                        teacher: record.teacher,
                        hall: record.hall,
                        date: record.date,
                        present_students: []
                    };
                }
                acc[key].present_students.push(record);
                return acc;
            }, {});
            setGroupedRecords(groups);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAndGroupRecords(selectedDate);
    }, [selectedDate, fetchAndGroupRecords]);

    return (
        <div>
            <h1>My Attendance Report</h1>
            <Card className={styles.filterCard}>
                <div className={styles.filters}>
                    <label htmlFor="date-picker">Filter by Date:</label>
                    <DatePicker
                        id="date-picker"
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        dateFormat="dd/MM/yyyy"
                    />
                </div>
            </Card>

            <div className={styles.reportsContainer}>
                {isLoading ? (
                    <p>Loading records...</p>
                ) : Object.keys(groupedRecords).length > 0 ? (
                    Object.values(groupedRecords).map(lecture => (
                        <LectureCard key={`${lecture.subject}-${lecture.time_slot}`} lecture={lecture} token={token} />
                    ))
                ) : (
                    <Card><p>No attendance records found for you on this date.</p></Card>
                )}
            </div>
        </div>
    );
}