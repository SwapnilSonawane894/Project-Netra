# backend/routes/attendance.py (Final Hardened Version)
import cv2
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from threading import Thread, Event
from pydantic import BaseModel
from typing import Optional
import queue # Use the correct import
import time

from ..pipeline import VerificationPipeline

logger = logging.getLogger(__name__)
router = APIRouter()

pipeline_thread = None
pipeline_instance = None
stop_event = None
frame_queue = None

class StartRequest(BaseModel):
    current_lecture: Optional[dict] = None

def run_pipeline_in_background():
    """Target function that runs the pipeline and puts frames into a queue."""
    global frame_queue
    try:
        if pipeline_instance and pipeline_instance.is_initialized:
            for frame in pipeline_instance.run():
                if stop_event and stop_event.is_set():
                    break
                if frame_queue.full():
                    try:
                        frame_queue.get_nowait()
                    except queue.Empty:
                        pass
                frame_queue.put(frame)
        else:
            logger.error("Pipeline instance not initialized, thread cannot run.")
    except Exception as e:
        logger.error(f"Pipeline crashed: {e}", exc_info=True)


@router.post("/start_verification")
async def start_verification(request: StartRequest):
    global pipeline_thread, pipeline_instance, stop_event, frame_queue
    if pipeline_thread and pipeline_thread.is_alive():
        raise HTTPException(status_code=400, detail="Verification is already running.")
    
    logger.info("Starting verification process...")
    stop_event = Event()
    frame_queue = queue.Queue(maxsize=2)
    pipeline_instance = VerificationPipeline(stop_event, request.current_lecture)
    
    if not pipeline_instance.is_initialized:
        raise HTTPException(status_code=500, detail="Failed to initialize verification pipeline. Check backend logs for model/video path errors.")

    pipeline_thread = Thread(target=run_pipeline_in_background, daemon=True)
    pipeline_thread.start()
    
    return {"status": "Verification started successfully."}


@router.post("/stop_verification")
async def stop_verification():
    global pipeline_thread, stop_event, pipeline_instance
    if not stop_event:
        raise HTTPException(status_code=400, detail="Verification is not running.")
    
    logger.info("Stopping verification process...")
    stop_event.set()
    if pipeline_thread:
        pipeline_thread.join(timeout=5)
    
    pipeline_instance = None
    return {"status": "Verification stopped."}


@router.get("/get_attendance")
async def get_attendance():
    if not pipeline_instance:
        return {}
    return pipeline_instance.get_attendance()


def stream_generator():
    """Yields frames from the shared queue."""
    if not frame_queue:
        logger.warning("Stream requested but frame queue is not available.")
        return
    
    logger.info("Stream generator attached to frame queue.")
    while not stop_event or not stop_event.is_set():
        try:
            frame = frame_queue.get(timeout=1.0)
            (flag, encodedImage) = cv2.imencode(".jpg", frame)
            if not flag: continue
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
                   bytearray(encodedImage) + b'\r\n')
        except queue.Empty:
            if stop_event and stop_event.is_set():
                break
            continue
    logger.info("Stream generator has detached.")


@router.get("/stream")
async def video_stream():
    """Returns the streaming response."""
    return StreamingResponse(stream_generator(), media_type="multipart/x-mixed-replace; boundary=frame")