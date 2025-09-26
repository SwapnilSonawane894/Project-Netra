// src/components/specific/WebcamCapture.js
"use client";
import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

// You will need to install react-webcam: npm install react-webcam
export default function WebcamCapture({ onCapture }) {
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
        // Convert base64 to Blob for sending to backend
        fetch(imageSrc)
            .then(res => res.blob())
            .then(blob => {
                onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
            });
    }, [webcamRef, setImgSrc, onCapture]);

    return (
        <div>
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width="100%"
            />
            <button type="button" onClick={capture}>Capture photo</button>
            {imgSrc && <img src={imgSrc} alt="capture" />}
        </div>
    );
}