// project-netra-frontend/src/hooks/useTimetableScheduler.js (FINAL - Class-Aware)
import { useEffect, useRef } from 'react';
import { getTimetablePublic, notifyAbsenteesPublic, startVerificationPublic, stopVerificationPublic } from '../services/api';
import { useAuth } from '../context/AuthContext';

const timeToMinutes = (timeStr) => {
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    } catch (e) {
        console.error("Invalid time format:", timeStr);
        return 0;
    }
};

export const useTimetableScheduler = () => {
    const { user, isVerifying, setIsVerifying, currentLecture, setCurrentLecture } = useAuth();
    const isProcessing = useRef(false);

    useEffect(() => {
        // Always run scheduler when app is loaded, regardless of user login status
        // This ensures automatic attendance starts based on timetable schedule

        let isMounted = true;
        const checkSchedule = async () => {
            if (isProcessing.current) return;

            let activeLecture = null;
            try {
                const allTimetables = await getTimetablePublic();
                
                // Check if we have valid timetable data
                if (!allTimetables || typeof allTimetables !== 'object') {
                    console.log("No timetables available");
                    return;
                }
                
                console.log('All timetables received:', allTimetables);
                console.log('User info:', user ? { role: user.role, assignedClass: user.assignedClass, fullName: user.fullName } : 'Not logged in');
                
                // Check ALL class schedules for any active lectures
                // This ensures attendance starts automatically regardless of who's logged in
                const scheduleToCheck = allTimetables;
                console.log('Checking all class schedules for active lectures (independent of user login)');
                
                if (Object.keys(scheduleToCheck).length === 0) {
                    console.log('No timetable schedules available');
                    return;
                }
                
                if (Object.keys(scheduleToCheck).length > 0) {
                    const now = new Date();
                    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
                    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

                    // Search through the relevant schedule(s)
                    for (const className in scheduleToCheck) {
                        const timetable = scheduleToCheck[className];
                        // Safety check: ensure timetable has the expected structure
                        if (!timetable || !timetable.timeSlots || !Array.isArray(timetable.timeSlots) || !timetable.schedule) {
                            console.log(`Invalid timetable structure for class ${className}`);
                            continue;
                        }
                        
                        for (const timeSlot of timetable.timeSlots) {
                            const lecturesInSlot = timetable.schedule[dayOfWeek]?.[timeSlot];
                            if (lecturesInSlot && lecturesInSlot.length > 0) {
                                // Find any lecture in current time slot (independent of user)
                                // This ensures automatic attendance regardless of login status
                                const targetLecture = lecturesInSlot[0]; // Take first lecture in the slot
                                
                                if (targetLecture) {
                                    const [startTime, endTime] = timeSlot.split('-').map(timeToMinutes);
                                    if (currentTimeInMinutes >= startTime && currentTimeInMinutes < endTime) {
                                        activeLecture = { 
                                            ...targetLecture, 
                                            time: timeSlot,
                                            class: className  // Add the class information
                                        };
                                        console.log(`Found scheduled active lecture:`, activeLecture);
                                        break; // Found our lecture, stop searching
                                    }
                                }
                            }
                        }
                        if (activeLecture) break; // Stop searching other classes if we found our lecture
                    }
                }

                // --- State Transition Logic (Remains the same, but now uses the correctly-found lecture) ---
                if (activeLecture && !isVerifying) {
                    isProcessing.current = true;
                    console.log(`SCHEDULER: Auto-starting lecture: ${activeLecture.subject} for class ${activeLecture.class}`);
                    try {
                        await startVerificationPublic(activeLecture);
                        if (isMounted) {
                            setIsVerifying(true);
                            setCurrentLecture(activeLecture);
                        }
                        console.log("SCHEDULER: Verification started successfully");
                    } catch (startError) {
                        console.error("SCHEDULER: Failed to start verification:", startError.message);
                        console.error("Full error:", startError);
                    }
                } 
                else if (!activeLecture && isVerifying) {
                    isProcessing.current = true;
                    console.log(`SCHEDULER: Auto-stopping lecture: ${currentLecture.subject}`);
                    try {
                        await stopVerificationPublic();
                        console.log("SCHEDULER: Verification stopped successfully");
                        
                        const today = new Date().toISOString().split('T')[0];
                        const notificationPayload = {
                            date: today,
                            subject: currentLecture.subject,
                            teacher: currentLecture.teacher,
                            time_slot: currentLecture.time,
                            student_class: currentLecture.class
                        };
                        
                        console.log("SCHEDULER: Sending notifications...");
                        await notifyAbsenteesPublic(notificationPayload);
                        console.log("SCHEDULER: Notification process finished.");

                        if (isMounted) {
                            setIsVerifying(false);
                            setCurrentLecture(null);
                        }
                    } catch (stopError) {
                        console.error("SCHEDULER: Failed to stop verification or send notifications:", stopError.message);
                        console.error("Full error:", stopError);
                        // Still update the state even if stop fails
                        if (isMounted) {
                            setIsVerifying(false);
                            setCurrentLecture(null);
                        }
                    }
                }
            } catch (error) {
                console.error("Error in schedule check:", error.message);
            } finally {
                if (isMounted) {
                    isProcessing.current = false;
                }
            }
        };

        const interval = setInterval(checkSchedule, 15000);
        checkSchedule();

        return () => { isMounted = false; clearInterval(interval); };
    }, [isVerifying, currentLecture, setCurrentLecture, setIsVerifying]); // Removed user dependency
};