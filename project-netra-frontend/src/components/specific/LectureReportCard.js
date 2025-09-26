// src/components/specific/LectureReportCard.js
"use client";
import { useState } from 'react';
import styles from '../../app/(dashboard)/reports/reports.module.css';

export default function LectureReportCard({ title, headerInfo, students, isAbsentList = false }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className={styles.lectureCard}>
            <button className={styles.lectureHeader} onClick={() => setIsOpen(!isOpen)}>
                <h3>{title}</h3>
                <div className={styles.headerInfo}>
                    {headerInfo.map(info => <span key={info}>{info}</span>)}
                </div>
                <span className={`${styles.toggleIcon} ${isOpen ? styles.open : ''}`}>▼</span>
            </button>

            <div className={`${styles.lectureContentWrapper} ${isOpen ? styles.open : ''}`}>
                <div className={styles.lectureContent}>
                    <div className={styles.tableContainer}>
                        <table className={styles.reportTable}>
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    <th>{isAbsentList ? 'Class' : 'Marked At'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.id || student.roll_no}>
                                        <td>{student.roll_no}</td>
                                        <td>{student.name}</td>
                                        <td>{isAbsentList ? student.student_class : new Date(student.timestamp).toLocaleTimeString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}