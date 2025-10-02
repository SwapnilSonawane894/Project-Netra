// project-netra-frontend/src/app/(dashboard)/timetable/page.js (FINAL - With Class Tabs)
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTimetable, saveTimetable, getSubjects, getStaff, getAvailableClasses } from '@/services/api';
import styles from './timetable.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

// A template for a new, empty timetable for a class
const createNewTimetable = () => ({
    timeSlots: [],
    schedule: {
        Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {}, Saturday: {},
    },
});

export default function TimetablePage() {
    const { user } = useAuth();
    const [allTimetables, setAllTimetables] = useState({});
    const [activeTab, setActiveTab] = useState(''); // The currently selected class tab (e.g., 'SYCO')
    const [subjects, setSubjects] = useState([]);
    const [staff, setStaff] = useState([]);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTimeSlot, setNewTimeSlot] = useState({ start: '09:00', end: '10:00' });
    const [isLoading, setIsLoading] = useState(true);



    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [timetableData, subjectsData, staffData, availableClassesData] = await Promise.all([
                getTimetable(), getSubjects(), getStaff(), getAvailableClasses()
            ]);
            
            // Initialize timetables for all available classes
            console.log('Timetable data from backend:', timetableData);
            console.log('Available classes from backend:', availableClassesData);
            
            const initializedTimetables = {};
            availableClassesData.forEach(cls => {
                if (timetableData && timetableData[cls]) {
                    // Use existing data from backend but ensure all days are present
                    const existingTimetable = timetableData[cls];
                    initializedTimetables[cls] = {
                        timeSlots: existingTimetable.timeSlots || [],
                        schedule: {
                            Monday: existingTimetable.schedule?.Monday || {},
                            Tuesday: existingTimetable.schedule?.Tuesday || {},
                            Wednesday: existingTimetable.schedule?.Wednesday || {},
                            Thursday: existingTimetable.schedule?.Thursday || {},
                            Friday: existingTimetable.schedule?.Friday || {},
                            Saturday: existingTimetable.schedule?.Saturday || {},
                        }
                    };
                } else {
                    // Create empty timetable for new classes
                    initializedTimetables[cls] = createNewTimetable();
                }
            });

            setAllTimetables(initializedTimetables);
            setSubjects(subjectsData || []);
            setStaff(staffData || []);
            setAvailableClasses(availableClassesData || []);
            if (availableClassesData.length > 0 && !activeTab) {
                setActiveTab(availableClassesData[0]);
            }
        } catch (error) {
            console.error('Error loading timetable data:', error);
            alert('Failed to load timetable data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (user) {
            fetchAllData();
        }
    }, [user, fetchAllData]);
    
    // Derived state for the currently active timetable, makes logic much cleaner
    const activeTimetable = useMemo(() => {
        const timetable = allTimetables[activeTab] || createNewTimetable();
        
        // Ensure all days are present in the schedule
        const fullSchedule = {
            Monday: {},
            Tuesday: {},
            Wednesday: {},
            Thursday: {},
            Friday: {},
            Saturday: {},
            ...timetable.schedule
        };
        
        console.log('Active timetable for', activeTab, ':', { ...timetable, schedule: fullSchedule });
        
        return {
            ...timetable,
            schedule: fullSchedule
        };
    }, [allTimetables, activeTab]);
    
    const handleUpdateActiveTimetable = (newTimetable) => {
        setAllTimetables(prev => ({
            ...prev,
            [activeTab]: newTimetable,
        }));
    };

    const handleAddTimeSlot = () => {
        const { start, end } = newTimeSlot;
        if (!start || !end || start >= end) {
            alert('Invalid time slot. End time must be after start time.');
            return;
        }
        const newSlot = `${start}-${end}`;
        if (activeTimetable.timeSlots.includes(newSlot)) {
            alert('This time slot already exists.');
            return;
        }
        const updatedSlots = [...activeTimetable.timeSlots, newSlot].sort();
        handleUpdateActiveTimetable({ ...activeTimetable, timeSlots: updatedSlots });
        setIsModalOpen(false);
    };

    const handleRemoveTimeSlot = (slotToRemove) => {
        if (!window.confirm(`Are you sure you want to remove the time slot ${slotToRemove}?`)) return;
        
        const newSchedule = { ...activeTimetable.schedule };
        Object.keys(newSchedule).forEach(day => {
            delete newSchedule[day][slotToRemove];
        });

        handleUpdateActiveTimetable({
            ...activeTimetable,
            timeSlots: activeTimetable.timeSlots.filter(slot => slot !== slotToRemove),
            schedule: newSchedule,
        });
    };

    const handleAddLecture = (day, timeSlot) => {
        const newLecture = { id: Date.now(), subject: '', teacher: '', hall: '', class: activeTab };
        const updatedDaySchedule = { ...activeTimetable.schedule[day] };
        if (!updatedDaySchedule[timeSlot]) {
            updatedDaySchedule[timeSlot] = [];
        }
        updatedDaySchedule[timeSlot].push(newLecture);
        
        handleUpdateActiveTimetable({
            ...activeTimetable,
            schedule: { ...activeTimetable.schedule, [day]: updatedDaySchedule },
        });
    };

    const handleLectureChange = (day, timeSlot, lectureId, field, value) => {
        const updatedLectures = activeTimetable.schedule[day][timeSlot].map(lec =>
            lec.id === lectureId ? { ...lec, [field]: value } : lec
        );
        handleUpdateActiveTimetable({
            ...activeTimetable,
            schedule: {
                ...activeTimetable.schedule,
                [day]: { ...activeTimetable.schedule[day], [timeSlot]: updatedLectures },
            },
        });
    };
    
    const handleRemoveLecture = (day, timeSlot, lectureId) => {
         const updatedLectures = activeTimetable.schedule[day][timeSlot].filter(lec => lec.id !== lectureId);
         handleUpdateActiveTimetable({
            ...activeTimetable,
            schedule: {
                ...activeTimetable.schedule,
                [day]: { ...activeTimetable.schedule[day], [timeSlot]: updatedLectures },
            },
        });
    };

    const handleSaveTimetable = async () => {
        try {
            // Save all class timetables to backend in multi-class format
            console.log('Saving all timetables:', allTimetables);
            await saveTimetable(allTimetables);
            alert('All class timetables saved successfully!');
        } catch (error) {
            console.error('Timetable save error:', error);
            alert('Error saving timetable: ' + error.message);
        }
    };

    if (isLoading) return <p>Loading timetable...</p>;
    
    return (
        <div>
            <h1>Timetable Management</h1>
            <Card>
                {/* --- TAB UI --- */}
                      <div className={styles.tabContainer}>
        <h3 className={styles.tabHeader}>Select Class Timetable:</h3>
        <div className={styles.tabs}>
          {availableClasses.map((className) => (
            <button
              key={className}
              onClick={() => setActiveTab(className)}
              className={`${activeTab === className ? styles.activeTab : ''}`}
              style={{
                backgroundColor: activeTab === className ? '#007bff' : '#f8f9fa',
                color: activeTab === className ? 'white' : '#495057',
                fontWeight: activeTab === className ? 'bold' : 'normal',
                transform: activeTab === className ? 'translateY(-2px)' : 'none',
                boxShadow: activeTab === className ? '0 4px 8px rgba(0, 123, 255, 0.3)' : 'none'
              }}
            >
              {className}
              {activeTab === className && <span style={{marginLeft: '8px'}}>✓</span>}
            </button>
          ))}
        </div>
        <p className={styles.activeIndicator}>
          Currently editing: <strong>{activeTab}</strong> timetable
        </p>
      </div>

                <div className={styles.actions}>
                    <Button onClick={() => setIsModalOpen(true)}>Add Time Slot</Button>
                    <Button onClick={handleSaveTimetable} variant="primary">Save Timetable</Button>
                </div>

                <div className={styles.gridContainer}>
                    <table className={styles.timetableGrid}>
                        <thead>
                            <tr>
                                <th>Day</th>
                                {activeTimetable.timeSlots.map(slot => (
                                    <th key={slot}>
                                        {slot}
                                        <button onClick={() => handleRemoveTimeSlot(slot)} className={styles.removeBtn}>×</button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(activeTimetable.schedule).map(day => (
                                <tr key={day}>
                                    <td>{day}</td>
                                    {activeTimetable.timeSlots.map(timeSlot => (
                                        <td key={timeSlot}>
                                            {activeTimetable.schedule[day]?.[timeSlot]?.map(lec => (
                                                <div key={lec.id} className={styles.lectureBlock}>
                                                    <button onClick={() => handleRemoveLecture(day, timeSlot, lec.id)} className={styles.removeLectureBtn}>×</button>
                                                    <select className={styles.inputField} value={lec.subject || ''} onChange={(e) => handleLectureChange(day, timeSlot, lec.id, 'subject', e.target.value)}>
                                                        <option value="">Select Subject</option>
                                                        {subjects.map(s => <option key={s.id} value={s.abbreviation}>{s.name} ({s.abbreviation})</option>)}
                                                    </select>
                                                    <select className={styles.inputField} value={lec.teacher || ''} onChange={(e) => handleLectureChange(day, timeSlot, lec.id, 'teacher', e.target.value)}>
                                                        <option value="">Select Teacher</option>
                                                        {staff.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
                                                    </select>
                                                     <input type="text" className={styles.inputField} placeholder="Hall No." value={lec.hall || ''} onChange={(e) => handleLectureChange(day, timeSlot, lec.id, 'hall', e.target.value)} />
                                                </div>
                                            ))}
                                            <Button onClick={() => handleAddLecture(day, timeSlot)}>+</Button>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Time Slot">
                    <div className={styles.inputGroup}>
                        <label>Start Time</label>
                        <input type="time" value={newTimeSlot.start} onChange={(e) => setNewTimeSlot(p => ({...p, start: e.target.value}))} />
                    </div>
                     <div className={styles.inputGroup}>
                        <label>End Time</label>
                        <input type="time" value={newTimeSlot.end} onChange={(e) => setNewTimeSlot(p => ({...p, end: e.target.value}))} />
                    </div>
                    <Button onClick={handleAddTimeSlot}>Add Slot</Button>
                </Modal>
            )}
        </div>
    );
}