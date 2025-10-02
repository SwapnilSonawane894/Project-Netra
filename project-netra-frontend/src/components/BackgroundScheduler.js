// src/components/BackgroundScheduler.js
"use client";
import { useEffect } from 'react';
import { useTimetableScheduler } from '../hooks/useTimetableScheduler';

/**
 * Background scheduler component that runs independently
 * Ensures automatic attendance starts based on timetable schedule
 */
export default function BackgroundScheduler() {
  // Run the timetable scheduler globally
  useTimetableScheduler();

  // This component doesn't render anything
  return null;
}