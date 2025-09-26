// src/components/ui/LiveStream.js (Final Version)
"use client";
import { useState, useEffect } from 'react';
import { getStreamUrl } from '../../services/api';
import styles from './LiveStream.module.css';
import Card from './Card';
import { useAuth } from '../../context/AuthContext'; // Import useAuth to read global state

export default function LiveStream() {
    // --- Read the isVerifying status directly from the global context ---
    const { isVerifying } = useAuth();
    const [streamUrl, setStreamUrl] = useState('');

    useEffect(() => {
        if (isVerifying) {
            setStreamUrl(`${getStreamUrl()}?t=${new Date().getTime()}`);
        } else {
            setStreamUrl('');
        }
    }, [isVerifying]);

    return (
        <Card>
            <h2>Live Stream</h2>
            <div className={styles.videoContainer}>
                {isVerifying && streamUrl ? (
                    <img src={streamUrl} alt="Live Stream" />
                ) : (
                    <div className={styles.placeholder}>Stream is Off</div>
                )}
            </div>
        </Card>
    );
}