// src/app/(dashboard)/timetable/page.js (Corrected UI)
"use client";
import { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import styles from './timetable.module.css';
import { getTimetable, saveTimetable } from '../../../services/api';

const initialDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatTimeInput = (value) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 8);
    let result = cleaned.slice(0, 2);
    if (cleaned.length > 2) result += ':' + cleaned.slice(2, 4);
    if (cleaned.length > 4) result += '-' + cleaned.slice(4, 6);
    if (cleaned.length > 6) result += ':' + cleaned.slice(6, 8);
    return result;
};

const AddTimeSlotModal = ({ onAdd, onClose }) => {
    const [timeValue, setTimeValue] = useState('');
    const handleInputChange = (e) => setTimeValue(formatTimeInput(e.target.value));
    const handleAddTime = () => {
        if (timeValue.length === 11) {
            onAdd(timeValue);
            onClose();
        } else {
            alert("Invalid format. Time must be HH:MM-HH:MM.");
        }
    };
    return (
        <div>
            <h2>Add New Time Slot</h2>
            <div className={styles.inputGroup}>
                <label>Time (HH:MM-HH:MM)</label>
                <input
                    type="text" placeholder="e.g., 11:45-12:45"
                    value={timeValue} onChange={handleInputChange} maxLength="11"
                />
            </div>
            <Button onClick={handleAddTime}>Add Time</Button>
        </div>
    );
};

export default function TimetablePage() {
    const [schedule, setSchedule] = useState({});
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchTimetable = async () => {
            const data = await getTimetable();
            if (data && data.timeSlots && data.schedule) {
                setTimeSlots(data.timeSlots);
                setSchedule(data.schedule);
            }
            setLoading(false);
        };
        fetchTimetable();
    }, []);

    const handleInputChange = (day, time, lectureIndex, field, value) => {
        setSchedule(prev => {
            const newSchedule = JSON.parse(JSON.stringify(prev));
            if (!newSchedule[day]) newSchedule[day] = {};
            if (!newSchedule[day][time]) newSchedule[day][time] = [];
            newSchedule[day][time][lectureIndex] = newSchedule[day][time][lectureIndex] || {};
            newSchedule[day][time][lectureIndex][field] = value;
            return newSchedule;
        });
    };

    const addLecture = (day, time) => {
        setSchedule(prev => {
            const newSchedule = JSON.parse(JSON.stringify(prev));
            if (!newSchedule[day]) newSchedule[day] = {};
            if (!newSchedule[day][time]) newSchedule[day][time] = [];
            newSchedule[day][time].push({ subject: '', teacher: '', hall: '' });
            return newSchedule;
        });
    };

    const removeLecture = (day, time, lectureIndex) => {
        setSchedule(prev => {
            const newSchedule = JSON.parse(JSON.stringify(prev));
            newSchedule[day][time].splice(lectureIndex, 1);
            return newSchedule;
        });
    };

    const handleSave = async () => {
        try {
            await saveTimetable({ timeSlots, schedule });
            alert("Timetable saved successfully!");
        } catch (error) {
            alert("Failed to save timetable.");
        }
    };

    const addColumn = (newTime) => {
        if (newTime && !timeSlots.includes(newTime)) {
            setTimeSlots([...timeSlots, newTime].sort());
        }
    };

    const removeColumn = (timeToRemove) => {
        if (confirm(`Remove time slot: ${timeToRemove}?`)) {
            setTimeSlots(timeSlots.filter(time => time !== timeToRemove));
            const newSchedule = { ...schedule };
            for (const day in newSchedule) {
                delete newSchedule[day][timeToRemove];
            }
            setSchedule(newSchedule);
        }
    };

    if (loading) return <p>Loading timetable...</p>;

    return (
        <div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <AddTimeSlotModal onAdd={addColumn} onClose={() => setIsModalOpen(false)} />
            </Modal>
            <h1>Timetable Management</h1>
            <Card>
                <div className={styles.actions}>
                    <Button onClick={() => setIsModalOpen(true)} variant="secondary">Add Time Slot</Button>
                    <Button onClick={handleSave}>Save Timetable</Button>
                </div>
                <div className={styles.gridContainer}>
                    <table className={styles.timetableGrid}>
                        <thead>
                            <tr>
                                <th>Day</th>
                                {timeSlots.map(time => (
                                    <th key={time}>
                                        {time}
                                        <button onClick={() => removeColumn(time)} className={styles.removeBtn}>×</button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {initialDays.map(day => (
                                <tr key={day}>
                                    <td><strong>{day}</strong></td>
                                    {timeSlots.map(time => (
                                        <td key={time}>
                                            {/* --- THIS IS THE CORRECTED UI LOGIC --- */}
                                            {(schedule[day]?.[time] || []).map((lecture, index) => (
                                                <div key={index} className={styles.lectureBlock}>
                                                    <button onClick={() => removeLecture(day, time, index)} className={styles.removeLectureBtn}>-</button>
                                                    <input
                                                        type="text" placeholder="Subject" className={styles.inputField}
                                                        value={lecture.subject || ''}
                                                        onChange={e => handleInputChange(day, time, index, 'subject', e.target.value)}
                                                    />
                                                    <input
                                                        type="text" placeholder="Teacher" className={styles.inputField}
                                                        value={lecture.teacher || ''}
                                                        onChange={e => handleInputChange(day, time, index, 'teacher', e.target.value)}
                                                    />
                                                    <input
                                                        type="text" placeholder="Hall No" className={styles.inputField}
                                                        value={lecture.hall || ''}
                                                        onChange={e => handleInputChange(day, time, index, 'hall', e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                            <Button onClick={() => addLecture(day, time)} variant="secondary">+</Button>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}