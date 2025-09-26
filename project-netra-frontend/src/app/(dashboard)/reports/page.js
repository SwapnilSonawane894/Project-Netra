// src/app/(dashboard)/reports/page.js (Corrected and Final)
"use client";
import { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button'; // --- THIS IS THE CRITICAL FIX ---
import styles from './reports.module.css';
import { getAttendanceRecords, getAbsentRecords } from '../../../services/api';

// --- NEW: A dedicated component for each collapsible card ---
const LectureReportCard = ({ lecture, filterDate }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [absentStudents, setAbsentStudents] = useState([]);
    const [loadingAbsentees, setLoadingAbsentees] = useState(false);

    const toggleAbsent = async () => {
        if (absentStudents.length > 0) {
            setAbsentStudents([]); // Clear to hide
            return;
        }
        setLoadingAbsentees(true);
        const data = await getAbsentRecords(filterDate, lecture.subject, lecture.time_slot);
        setAbsentStudents(data);
        setLoadingAbsentees(false);
    };

    return (
        <Card className={styles.lectureCard}>
            <div className={styles.lectureHeader} onClick={() => setIsOpen(!isOpen)}>
                <h3>{lecture.subject}</h3>
                <div className={styles.headerInfo}>
                    <span><strong>Teacher:</strong> {lecture.teacher}</span>
                    <span><strong>Hall:</strong> {lecture.hall}</span>
                    <span><strong>Time:</strong> {lecture.time_slot}</span>
                    <span><strong>Present:</strong> {lecture.students.length}</span>
                </div>
                <span className={`${styles.toggleIcon} ${isOpen ? styles.open : ''}`}>▼</span>
            </div>
            <div className={`${styles.lectureContentWrapper} ${isOpen ? styles.open : ''}`}>
                <div className={styles.lectureContent}>
                    <h4>Present Students</h4>
                    <div className={styles.tableContainer}>
                        <table className={styles.reportTable}>
                            <thead>
                                <tr><th>Roll No</th><th>Name</th><th>Marked At</th></tr>
                            </thead>
                            <tbody>
                                {lecture.students.map(student => (
                                    <tr key={student.id}>
                                        <td>{student.roll_no}</td>
                                        <td>{student.name}</td>
                                        <td>{new Date(student.timestamp).toLocaleTimeString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className={styles.absentSection}>
                        <Button onClick={toggleAbsent} variant="secondary">
                            {loadingAbsentees ? 'Loading...' : (absentStudents.length > 0 ? 'Hide Absent Students' : 'Show Absent Students')}
                        </Button>
                        {absentStudents.length > 0 && (
                            <>
                                <h4>Absent Students</h4>
                                <div className={styles.tableContainer}>
                                    <table className={styles.reportTable}>
                                        <thead>
                                            <tr><th>Roll No</th><th>Name</th><th>Class</th></tr>
                                        </thead>
                                        <tbody>
                                            {absentStudents.map(student => (
                                                <tr key={student.roll_no}>
                                                    <td>{student.roll_no}</td>
                                                    <td>{student.name}</td>
                                                    <td>{student.student_class}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};

const groupRecordsByLecture = (records) => {
    if (!records || records.length === 0) return {};
    return records.reduce((acc, record) => {
        const key = `${record.time_slot}_${record.subject}`;
        if (!acc[key]) {
            acc[key] = {
                subject: record.subject, teacher: record.teacher, hall: record.hall,
                time_slot: record.time_slot, students: []
            };
        }
        acc[key].students.push(record);
        return acc;
    }, {});
};

export default function ReportsPage() {
    const [groupedRecords, setGroupedRecords] = useState({});
    const [absentStudents, setAbsentStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            const data = await getAttendanceRecords(filterDate);
            setGroupedRecords(groupRecordsByLecture(data));
            setLoading(false);
        };
        fetchRecords();
    }, [filterDate]);

    return (
        <div>
            <h1>Attendance Report</h1>
            <Card className={styles.filterCard}>
                <div className={styles.filters}>
                    <label htmlFor="date-filter">Filter by Date:</label>
                    <input type="date" id="date-filter" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                </div>
            </Card>

            {loading ? <p>Loading records...</p> : (
                <div className={styles.reportsContainer}>
                    {Object.keys(groupedRecords).length > 0 ? (
                        Object.values(groupedRecords).map(lecture => (
                            <LectureReportCard
                                key={lecture.time_slot + lecture.subject}
                                lecture={lecture}
                                filterDate={filterDate}
                            />
                        ))
                    ) : (
                        <Card><p>No attendance records found for this date.</p></Card>
                    )}
                </div>
            )}
        </div>
    );
}