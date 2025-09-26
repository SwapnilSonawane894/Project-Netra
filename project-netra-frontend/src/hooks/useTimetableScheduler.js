// src/hooks/useTimetableScheduler.js (Final, Hardened Version)
import { useEffect, useRef } from 'react';
import { getTimetable, startVerification, stopVerification, notifyAbsentees } from '../services/api';
import { useAuth } from '../context/AuthContext';

const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

export const useTimetableScheduler = () => {
    const { isVerifying, setIsVerifying, currentLecture, setCurrentLecture } = useAuth();
    // --- THIS IS THE FIX: A flag to prevent multiple API calls ---
    const isProcessing = useRef(false);

    useEffect(() => {
        let isMounted = true;
        const checkSchedule = async () => {
            // If we are already in the middle of a start/stop operation, do nothing.
            if (isProcessing.current) return;

            let activeLecture = null;
            try {
                const data = await getTimetable();
                if (data && data.timeSlots && data.schedule) {
                    const now = new Date();
                    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
                    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
                    
                    for (const timeSlot of data.timeSlots) {
                        const lecturesInSlot = data.schedule[dayOfWeek]?.[timeSlot];
                        if (lecturesInSlot && lecturesInSlot.length > 0) {
                            const [startTime, endTime] = timeSlot.split('-').map(timeToMinutes);
                            if (currentTimeInMinutes >= startTime && currentTimeInMinutes < endTime) {
                                activeLecture = { ...lecturesInSlot[0], time: timeSlot };
                                break;
                            }
                        }
                    }
                }

                // --- State Transition Logic ---
                if (activeLecture && !isVerifying) {
                    isProcessing.current = true; // Set the lock
                    console.log(`Scheduler: Attempting to start verification for ${activeLecture.subject}`);
                    await startVerification(activeLecture);
                    if (isMounted) {
                        setIsVerifying(true);
                        setCurrentLecture(activeLecture);
                    }
                } else if (!activeLecture && isVerifying) {
                    console.log(`Lecture ended: ${currentLecture.subject}`);
                    await stopVerification();
                    
                    const today = new Date().toISOString().split('T')[0];
                    // --- PASS THE FULL LECTURE DETAILS ---
                    await notifyAbsentees({
                        date: today,
                        subject: currentLecture.subject,
                        teacher: currentLecture.teacher, // Add teacher
                        time_slot: currentLecture.time
                    });

                    if (isMounted) {
                        setIsVerifying(false);
                        setCurrentLecture(null);
                    }
                }
            } catch (error) {
                console.error("Error in schedule check:", error.message);
            } finally {
                if (isMounted) {
                    isProcessing.current = false; // Always release the lock
                }
            }
        };

        const interval = setInterval(checkSchedule, 15000); // Check every 15 seconds
        checkSchedule(); // Initial check

        return () => { isMounted = false; clearInterval(interval); };
    }, [isVerifying, setIsVerifying, currentLecture]);
};