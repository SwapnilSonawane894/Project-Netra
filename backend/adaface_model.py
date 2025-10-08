# backend/adaface_model.py - FINAL WORKING VERSION
import torch
import cv2
import numpy as np
import os
from torchvision import transforms

# This is now a simple, direct import because net.py is in the same folder.
# This solves the "attempted relative import" error.
try:
    from .net import IR_101
except ImportError as e:
    print("="*70)
    print("ERROR: Could not import 'IR_101' from 'net'.")
    print("Please ensure you have copied 'net.py' from the AdaFace repository into this 'backend' folder.")
    print(f"Import Error: {e}")
    print("="*70)
    raise e


class AdaFaceModel:
    def __init__(self, model_path, use_gpu=True):
        """
        Initializes the AdaFace model.
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"AdaFace model not found at path: {model_path}")
            
        self.device = torch.device('cuda' if use_gpu and torch.cuda.is_available() else 'cpu')
        print(f"AdaFace is using device: {self.device}")
        
        # The model requires an input_size argument.
        self.model = IR_101(input_size=(112, 112))
        self.model.to(self.device)

        # Load Weights from Checkpoint
        try:
            # First, try to load the full checkpoint which might be from a training session
            checkpoint = torch.load(model_path, map_location=self.device)
            # Check if the weights are inside a 'state_dict' key
            if 'state_dict' in checkpoint:
                state_dict = checkpoint['state_dict']
            else:
                # If not, assume the file itself is the state_dict
                state_dict = checkpoint
            
            # The keys in the official checkpoint have a "model." prefix, which we need to remove.
            model_state_dict = {key.replace('model.', ''): val for key, val in state_dict.items()}
            self.model.load_state_dict(model_state_dict, strict=False)
            print(f"AdaFace model loaded successfully from {model_path}")
        except Exception as e:
            print(f"Error loading AdaFace model: {e}")
            raise e
            
        self.model.eval()

        # Define Image Preprocessing
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
        ])

    def get_embedding(self, face_crop_bgr):
        """
        Generates a 512-dimensional embedding for a cropped face image.
        """
        if face_crop_bgr is None or face_crop_bgr.size == 0:
            return None

        # Preprocess the image
        face_resized = cv2.resize(face_crop_bgr, (112, 112), interpolation=cv2.INTER_CUBIC)
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
        face_tensor = self.transform(face_rgb).unsqueeze(0).to(self.device)

        # Get embedding with no gradient calculation
        with torch.no_grad():
            # The model returns (embedding, norm). We only need the embedding.
            embedding, _ = self.model(face_tensor)
            embedding_numpy = embedding.cpu().numpy().flatten()
            
        return embedding_numpy