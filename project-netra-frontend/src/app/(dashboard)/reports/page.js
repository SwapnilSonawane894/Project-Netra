// project-netra-frontend/src/app/(dashboard)/reports/page.js (FINAL AND CORRECTED)
"use client";
import { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import { useAuth } from '@/context/AuthContext';
import styles from './reports.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getAttendanceRecords, getAbsentRecords } from '@/services/api';

const formatDate = (date) => new Date(date).toISOString().split('T')[0];

function Lecture({ lecture }) {
    const [isOpen, setIsOpen] = useState(false);
    const [absentees, setAbsentees] = useState([]);
    const [isLoadingAbsentees, setIsLoadingAbsentees] = useState(false);
    const [absenteesFetched, setAbsenteesFetched] = useState(false);

    // This was causing a ReferenceError because it was removed from the component's props
    const presentCount = lecture.present_students.length;

    const handleShowAbsentees = async () => {
        setIsLoadingAbsentees(true);
        setAbsenteesFetched(true);
        try {
            // Correctly pass all required parameters, including the class
            const data = await getAbsentRecords(lecture.date, lecture.subject, lecture.time_slot, lecture.class);
            setAbsentees(data);
        } catch (error) {
            alert(`Could not fetch absentee list: ${error.message}`);
        } finally {
            setIsLoadingAbsentees(false);
        }
    };

    return (
        <Card className={styles.lectureCard}>
            <button className={styles.lectureHeader} onClick={() => setIsOpen(!isOpen)}>
                <h3>{lecture.subject} ({lecture.class || 'N/A'})</h3>
                <div className={styles.headerInfo}>
                    <span><strong>Time:</strong> {lecture.time_slot}</span>
                    <span><strong>Teacher:</strong> {lecture.teacher}</span>
                    <span><strong>Present:</strong> {presentCount}</span>
                </div>
                <span className={`${styles.toggleIcon} ${isOpen ? styles.open : ''}`}>▼</span>
            </button>

            {/* The content should only render when isOpen is true */}
            {isOpen && (
                <div className={styles.lectureContent}>
                    <h4>Present Students</h4>
                    {presentCount > 0 ? (
                        <div className={styles.tableContainer}>
                            <table className={styles.reportTable}>
                                <thead>
                                    <tr><th>Roll No</th><th>Name</th><th>Timestamp</th></tr>
                                </thead>
                                <tbody>
                                    {lecture.present_students.map(record => (
                                        <tr key={record.id}>
                                            <td>{record.roll_no}</td>
                                            <td>{record.name}</td>
                                            <td>{new Date(record.timestamp).toLocaleTimeString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p>No students were marked present for this lecture.</p>
                    )}

                    <div className={styles.absentSection}>
                        <Button onClick={handleShowAbsentees} variant="secondary" disabled={isLoadingAbsentees}>
                            {isLoadingAbsentees ? 'Loading...' : 'Show Absentees'}
                        </Button>
                        
                        {isLoadingAbsentees && <p>Loading absentee list...</p>}

                        {absenteesFetched && !isLoadingAbsentees && (
                             <div className={styles.tableContainer} style={{marginTop: '15px'}}>
                                <h4>Absent Students</h4>
                                {absentees.length > 0 ? (
                                    <table className={styles.reportTable}>
                                        <thead>
                                            <tr><th>Roll No</th><th>Name</th><th>Class</th></tr>
                                        </thead>
                                        <tbody>
                                            {absentees.map(student => (
                                                <tr key={student.roll_no}>
                                                    <td>{student.roll_no}</td>
                                                    <td>{student.name}</td>
                                                    <td>{student.student_class}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : <p>No absentees were found for this lecture.</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}


export default function ReportsPage() {
    const { user } = useAuth();
    const [groupedRecords, setGroupedRecords] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchRecords = useCallback(async (date) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await getAttendanceRecords(formatDate(date));
            const groups = data.reduce((acc, record) => {
                const key = `${record.subject}-${record.time_slot}`;
                if (!acc[key]) {
                    acc[key] = {
                        subject: record.subject,
                        time_slot: record.time_slot,
                        teacher: record.teacher,
                        date: record.date,
                        class: record.student_class, // Capture the class for the lecture group
                        present_students: []
                    };
                }
                acc[key].present_students.push(record);
                return acc;
            }, {});
            setGroupedRecords(groups);
        } catch (error) {
            console.error("Fetch error:", error);
            // Optionally set an error state to show in the UI
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRecords(selectedDate);
    }, [selectedDate, fetchRecords]);

    return (
        <div>
            <h1>Attendance Reports</h1>
            <Card className={styles.filterCard}>
                <div className={styles.filters}>
                    <label htmlFor="date-picker" style={{marginRight: '10px', fontWeight: '500'}}>Select Date:</label>
                    <DatePicker
                        id="date-picker"
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        dateFormat="yyyy-MM-dd"
                        className={styles.datePicker}
                    />
                </div>
            </Card>

            <div className={styles.reportsContainer}>
                {isLoading ? (
                    <p>Loading reports...</p>
                ) : Object.keys(groupedRecords).length > 0 ? (
                    Object.values(groupedRecords).map(lecture => (
                        // Removed the props that were causing errors
                        <Lecture key={`${lecture.subject}-${lecture.time_slot}`} lecture={lecture} />
                    ))
                ) : (
                    <Card>
                        <p>No attendance records found for {formatDate(selectedDate)}.</p>
                    </Card>
                )}
            </div>
        </div>
    );
}