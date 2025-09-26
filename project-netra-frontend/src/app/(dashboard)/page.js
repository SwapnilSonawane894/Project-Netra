// src/app/(dashboard)/reports/page.js (Final, Grouped Version)
"use client";
import { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card';
import styles from './reports.module.css';
import { getAttendanceRecords } from '../../../services/api';

// --- NEW: Helper function to group records by lecture ---
const groupRecordsByLecture = (records) => {
    if (!records || records.length === 0) {
        return {};
    }
    // The accumulator 'acc' will be our final object
    return records.reduce((acc, record) => {
        // Create a unique key for each lecture using its time slot and subject
        const lectureKey = `${record.time_slot}_${record.subject}`;
        
        // If this is the first time we see this lecture, create an entry for it
        if (!acc[lectureKey]) {
            acc[lectureKey] = {
                subject: record.subject,
                teacher: record.teacher,
                hall: record.hall,
                time_slot: record.time_slot,
                students: []
            };
        }
        
        // Add the current student to this lecture's student list
        acc[lectureKey].students.push(record);
        return acc;
    }, {});
};


export default function ReportsPage() {
    const [groupedRecords, setGroupedRecords] = useState({});
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            const data = await getAttendanceRecords(filterDate);
            const groupedData = groupRecordsByLecture(data);
            setGroupedRecords(groupedData);
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
                    <input 
                        type="date" 
                        id="date-filter" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                </div>
            </Card>

            {loading ? <p>Loading records...</p> : (
                <div className={styles.reportsContainer}>
                    {Object.keys(groupedRecords).length > 0 ? (
                        Object.values(groupedRecords).map(lecture => (
                            <Card key={lecture.time_slot} className={styles.lectureCard}>
                                <div className={styles.lectureHeader}>
                                    <h3>{lecture.subject}</h3>
                                    <span><strong>Teacher:</strong> {lecture.teacher}</span>
                                    <span><strong>Hall:</strong> {lecture.hall}</span>
                                    <span><strong>Time:</strong> {lecture.time_slot}</span>
                                    <span><strong>Total Present:</strong> {lecture.students.length}</span>
                                </div>
                                <div className={styles.tableContainer}>
                                    <table className={styles.reportTable}>
                                        <thead>
                                            <tr>
                                                <th>Roll No</th>
                                                <th>Name</th>
                                                <th>Marked At</th>
                                            </tr>
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
                            </Card>
                        ))
                    ) : (
                        <Card><p>No records found for this date.</p></Card>
                    )}
                </div>
            )}
        </div>
    );
}