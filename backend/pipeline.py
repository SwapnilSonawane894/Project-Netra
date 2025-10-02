# backend/pipeline.py (Final Version with Correct Tracker Formatting)
from dotenv import load_dotenv
load_dotenv()
import cv2
import torch
import numpy as np
import logging
import time
import os
from threading import Event
import backend.database_handler as database_handler
from scipy.spatial.distance import cosine
from deepface import DeepFace
from bytetracker import BYTETracker

log_format = '%(asctime)s - %(levelname)s - [%(module)s:%(lineno)d] - %(message)s'
logging.basicConfig(level=logging.INFO, format=log_format, filename='logs/app.log', filemode='a')
logger = logging.getLogger(__name__)

class VerificationPipeline:
    def __init__(self, stop_event: Event, current_lecture: dict = None):
        self.is_initialized = False
        try:
            self.video_source = os.getenv("VIDEO_SOURCE", "0")
            self.recognition_model = os.getenv("RECOGNITION_MODEL", "ArcFace")
            self.recognition_threshold = float(os.getenv("RECOGNITION_THRESHOLD", 0.4))
            self.frame_skip = int(os.getenv("FRAME_SKIP", 5))
            self.current_lecture = current_lecture if current_lecture else {}
            
            logger.info("Using RetinaFace for detection and ArcFace for recognition.")
            logger.info("Loading student database...")
            
            # Load student database - revert to original approach for accuracy
            logger.info("Loading all student database for face recognition...")
            self.student_db = database_handler.get_all_student_data()
            logger.info(f"Loaded {len(self.student_db)} total students for face recognition")
            
            # Validate student database for debugging
            valid_students = 0
            for roll_no, data in self.student_db.items():
                if "arcface_embedding" in data and data["arcface_embedding"] is not None:
                    valid_students += 1
                else:
                    logger.warning(f"Student {roll_no} has missing or invalid embedding")
            logger.info(f"Valid embeddings: {valid_students}/{len(self.student_db)}")
            
            # If class info is available, log it for filtering attendance records later
            if current_lecture and current_lecture.get('class'):
                lecture_class = current_lecture.get('class')
                logger.info(f"Attendance will be recorded for class: {lecture_class}")
                self.target_class = lecture_class
            else:
                logger.warning("No class information provided in lecture")
                self.target_class = None
            
            self.tracker = BYTETracker(frame_rate=30)
            self.stop_event = stop_event
            self.confirmed_attendance = {}
            self.tracks = {}
            self.is_initialized = True
            logger.info("Verification pipeline initialized successfully.")
        except Exception as e:
            logger.error(f"FATAL: Failed to initialize VerificationPipeline: {e}", exc_info=True)
            self.is_initialized = False

    def _get_embedding_from_crop(self, face_crop):
        try:
            embedding_objs = DeepFace.represent(
                img_path=face_crop, model_name=self.recognition_model, 
                enforce_detection=False, detector_backend='skip'
            )
            return embedding_objs[0]["embedding"] if embedding_objs else None
        except Exception:
            return None

    def _match_embedding_to_db(self, embedding):
        min_dist, matched_roll_no = float('inf'), "Unknown"
        second_min_dist = float('inf')
        
        for roll_no, data in self.student_db.items():
            dist = cosine(embedding, data["arcface_embedding"])
            if dist < min_dist:
                second_min_dist = min_dist
                min_dist, matched_roll_no = dist, roll_no
            elif dist < second_min_dist:
                second_min_dist = dist
        
        # Log matching details for debugging
        if min_dist < self.recognition_threshold:
            confidence_gap = second_min_dist - min_dist
            student_name = self.student_db.get(matched_roll_no, {}).get("name", "Unknown")
            logger.info(f"Face matched: {student_name} ({matched_roll_no}) - Distance: {min_dist:.3f}, Confidence Gap: {confidence_gap:.3f}")
            return matched_roll_no
        else:
            logger.debug(f"No match found - Minimum distance: {min_dist:.3f} (threshold: {self.recognition_threshold})")
            return "Unknown"

    def run(self):
        if not self.is_initialized: return
        
        source_to_open = int(self.video_source) if self.video_source.isdigit() else self.video_source
        video_capture = cv2.VideoCapture(source_to_open)
        if not video_capture.isOpened():
            logger.error(f"FATAL: Cannot open video source: '{self.video_source}'.")
            return

        frame_count = 0
        while not self.stop_event.is_set():
            ret, frame = video_capture.read()
            if not ret: break
            
            frame_count += 1
            if frame_count % self.frame_skip != 0:
                yield frame
                continue

            annotated_frame = frame.copy()
            online_targets = []
            
            try:
                detected_faces = DeepFace.extract_faces(
                    img_path=frame, detector_backend='retinaface', enforce_detection=False
                )
                
                detections_for_tracker = []
                for face_obj in detected_faces:
                    fa = face_obj['facial_area']
                    x, y, w, h = fa['x'], fa['y'], fa['w'], fa['h']
                    confidence = face_obj['confidence']
                    # --- THIS IS THE CRITICAL FIX ---
                    # Add a dummy class ID of 0 for BYTETracker compatibility
                    detections_for_tracker.append([x, y, x + w, y + h, confidence, 0])

                if detections_for_tracker:
                    online_targets = self.tracker.update(torch.tensor(detections_for_tracker), [frame.shape[0], frame.shape[1]])
            except Exception as e:
                logger.warning(f"Face detection/tracking failed for frame {frame_count}: {e}")

            for t in online_targets:
                x1, y1, x2, y2, track_id = map(int, t[:5])
                
                if track_id not in self.tracks:
                    face_crop = frame[y1:y2, x1:x2]
                    embedding = self._get_embedding_from_crop(face_crop)
                    
                    if embedding is not None:
                        roll_no = self._match_embedding_to_db(embedding)
                        student_info = self.student_db.get(roll_no, {})
                        student_name = student_info.get("name", "Unknown")
                        self.tracks[track_id] = {"name": student_name, "roll_no": roll_no}
                        
                        if roll_no != "Unknown" and roll_no not in self.confirmed_attendance:
                            # Check if student belongs to the target class (if specified)
                            should_record = True
                            if self.target_class:
                                student_class = database_handler.get_student_class(roll_no)
                                if student_class != self.target_class:
                                    logger.info(f"Student {student_name} ({roll_no}) detected but belongs to {student_class}, not {self.target_class}. Skipping attendance.")
                                    should_record = False
                            
                            if should_record:
                                self.confirmed_attendance[roll_no] = {"name": student_name, "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')}
                                database_handler.record_attendance(roll_no, student_name, self.current_lecture)
                                logger.info(f"Recorded attendance for {student_name} ({roll_no}) in class {self.target_class or 'Any'}")
                    else:
                        self.tracks[track_id] = {"name": "Unknown", "roll_no": "Unknown"}
                
                track_info = self.tracks.get(track_id)
                if track_info:
                    color = (0, 255, 0) if track_info["roll_no"] != "Unknown" else (0, 0, 255)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(annotated_frame, track_info["name"], (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            yield annotated_frame

        video_capture.release()

    def get_attendance(self):
        return self.confirmed_attendance