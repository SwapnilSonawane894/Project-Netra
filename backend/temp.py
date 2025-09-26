# --- LOAD ENVIRONMENT VARIABLES FIRST ---
from dotenv import load_dotenv
load_dotenv()
# ------------------------------------
import cv2
import torch
import numpy as np
import logging
import time
import os
import collections
from ultralytics import YOLO
from scipy.spatial.distance import cosine
from deepface import DeepFace
from bytetracker import BYTETracker
from torchvision.ops import nms
import backend.database_handler as database_handler

# --- (I) ADVANCED LOGGING SETUP ---
log_format = '%(asctime)s - %(levelname)s - [%(module)s:%(lineno)d] - %(message)s'
logging.basicConfig(level=logging.INFO, format=log_format)
logger = logging.getLogger(__name__)

# --- CONFIGURATION CLASS ---
class Config:
    VIDEO_SOURCE = "sample4.mov"
    
    # --- (I) Backward Compatibility Flags ---
    ENABLE_DETECTION_ENSEMBLE = False # Set to True to enable all 3 detectors
    ENABLE_ENHANCEMENT = False # SET TO FALSE ON CPU FOR PERFORMANCE
    ENABLE_LIVENESS_CHECK = False
    
    # --- (A) Detection ---
    YOLO_MODEL_PATH = "yolov8n-face.pt"
    DETECTION_FUSION_IOU = 0.4
    
    # --- (B) Tracking ---
    MAX_CROPS_PER_TRACK = 10
    
    # --- (E) Recognition ---
    RECOGNITION_MODELS = {"ArcFace": 0.6, "Facenet512": 0.4}
    FUSED_SCORE_THRESHOLD = 0.65
    
    # --- (G) Temporal Consistency ---
    CONFIRMATION_HITS = 3
    CONFIRMATION_WINDOW_SECONDS = 10
    
    # --- (J) Performance ---
    FRAME_SKIP = 3

    def __init__(self):
        # Create debug directories
        os.makedirs("debug/restored", exist_ok=True)
        os.makedirs("debug/failed_crops", exist_ok=True)

# --- HELPER FUNCTIONS ---
def get_image_sharpness(image):
    if image is None or image.size == 0: return 0
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var()

class AdvancedPipeline:
    def __init__(self, config):
        self.config = config
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Initializing pipeline on device: {self.device}")

        # --- LOAD MODELS ---
        # (A) Detection Models
        self.yolo_detector = YOLO(self.config.YOLO_MODEL_PATH)
        if self.config.ENABLE_DETECTION_ENSEMBLE:
            from insightface.app import FaceAnalysis
            self.dsfd_detector = FaceAnalysis(providers=['CPUExecutionProvider'])
            self.dsfd_detector.prepare(ctx_id=0, det_size=(640, 640))
            # RetinaFace is often used for alignment, but we can use it for detection too.
        
        # (B) Tracker
        self.tracker = BYTETracker(frame_rate=30)
        
        # (C) Enhancement Models (Initialize if enabled)
        if self.config.ENABLE_ENHANCEMENT:
            from realesrgan import RealESRGANer
            from gfpgan import GFPGANer
            # Note: These models need specific setup for GPU/CPU
            # self.esrgan = RealESRGANer(...)
            # self.gfpgan = GFPGANer(...)
            pass

        # Load Database
        self.student_db = database_handler.get_all_student_data()
        
        # State
        self.tracks = {} # {track_id: {box, crops, confirmed_roll_no, timestamps}}
        self.present_roll_nos = set()

    def _run_detection(self, frame):
        # Using YOLOv8 as the primary for simplicity. Ensemble logic is complex.
        results = self.yolo_detector(frame, verbose=False)[0].boxes.data
        return results # Returns a torch tensor

    def _recognize_track(self, track_id):
        track_data = self.tracks[track_id]
        
        # (B) Select best N crops
        sorted_crops = sorted(track_data["crops"], key=lambda c: get_image_sharpness(c[1]), reverse=True)
        best_crops = [c[1] for c in sorted_crops[:self.config.MAX_CROPS_PER_TRACK]]
        
        if not best_crops:
            logger.warning(f"No usable crops for Track ID {track_id}")
            track_data["name"] = "Recognition Failed"
            return

        logger.info(f"Recognizing Track ID {track_id} from {len(best_crops)} best crops...")
        
        # (C) & (D) Enhancement & Alignment would happen here on each crop
        
        # (E) Recognition Ensemble
        arc_embeddings = []
        fn_embeddings = []
        for crop in best_crops:
            try:
                arc_embeddings.append(DeepFace.represent(crop, model_name="ArcFace", enforce_detection=False)[0]["embedding"])
                fn_embeddings.append(DeepFace.represent(crop, model_name="Facenet512", enforce_detection=False)[0]["embedding"])
            except: continue
            
        if not arc_embeddings or not fn_embeddings:
            track_data["name"] = "Embedding Failed"
            return

        avg_arc_embed = np.mean(arc_embeddings, axis=0)
        avg_fn_embed = np.mean(fn_embeddings, axis=0)
        
        scores = {}
        for roll_no, data in self.student_db.items():
            arc_sim = 1 - cosine(avg_arc_embed, data["arcface_embedding"])
            fn_sim = 1 - cosine(avg_fn_embed, data["facenet512_embedding"])
            
            # Fuse scores
            fused_score = (self.config.RECOGNITION_MODELS["ArcFace"] * arc_sim) + \
                          (self.config.RECOGNITION_MODELS["Facenet512"] * fn_sim)
            
            # Check individual thresholds
            if arc_sim >= 0.6 and fn_sim >= 0.6:
                scores[roll_no] = fused_score
        
        if not scores:
            track_data["name"] = "Unknown (Below Thresholds)"
            return
            
        best_roll_no = max(scores, key=scores.get)
        best_score = scores[best_roll_no]
        
        if best_score >= self.config.FUSED_SCORE_THRESHOLD:
            student_info = self.student_db[best_roll_no]
            track_data["name"] = student_info["name"]
            track_data["roll_no"] = best_roll_no
            logger.info(f"  -> Tentative Match for Track {track_id}: {student_info['name']} (Score: {best_score:.2f})")
        else:
            track_data["name"] = "Unknown"

    def run(self):
        video_capture = cv2.VideoCapture(self.config.VIDEO_SOURCE)
        frame_count = 0
        
        while True:
            ret, frame = video_capture.read()
            if not ret: break
            
            frame_count += 1
            if frame_count % self.config.FRAME_SKIP != 0: continue
            
            detections_tensor = self._run_detection(frame)
            online_targets = self.tracker.update(detections_tensor, [frame.shape[0], frame.shape[1]])
            
            current_time = time.time()
            
            for t in online_targets:
                x1, y1, x2, y2 = map(int, t[:4])
                track_id = int(t[4])
                
                if track_id not in self.tracks:
                    self.tracks[track_id] = {"box": None, "crops": [], "name": f"Tracking ID:{track_id}", "roll_no": None, "timestamps": []}
                
                track_data = self.tracks[track_id]
                track_data["box"] = (x1, y1, x2, y2)
                
                # Collect crops for unrecognized tracks
                if not track_data["roll_no"]:
                    face_crop = frame[y1:y2, x1:x2]
                    sharpness = get_image_sharpness(face_crop)
                    track_data["crops"].append((sharpness, face_crop))
                    
                    # Try to recognize once we have a few crops
                    if len(track_data["crops"]) % 5 == 0:
                        self._recognize_track(track_id)
                
                # (G) Temporal Consistency Check
                if track_data["roll_no"]:
                    track_data["timestamps"].append(current_time)
                    # Filter timestamps older than the window
                    track_data["timestamps"] = [ts for ts in track_data["timestamps"] if current_time - ts < self.config.CONFIRMATION_WINDOW_SECONDS]
                    
                    if len(track_data["timestamps"]) >= self.config.CONFIRMATION_HITS:
                        if track_data["roll_no"] not in self.present_roll_nos:
                            logger.info(f"*** CONFIRMED PRESENT: {track_data['name']} ***")
                            self.present_roll_nos.add(track_data["roll_no"])

            # Drawing logic
            for track_id, data in self.tracks.items():
                x1, y1, x2, y2 = data["box"]
                if data["roll_no"] and data["roll_no"] in self.present_roll_nos:
                    color = (0, 255, 0) # Green for confirmed
                elif data["roll_no"]:
                    color = (0, 255, 255) # Yellow for tentative match
                else:
                    color = (0, 0, 255) # Red for unknown/tracking
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, data["name"], (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

            cv2.imshow("Advanced Pipeline", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): break

        video_capture.release()
        cv2.destroyAllWindows()
        # Final report generation would go here

if __name__ == "__main__":
    config = Config()
    pipeline = AdvancedPipeline(config)
    pipeline.run()