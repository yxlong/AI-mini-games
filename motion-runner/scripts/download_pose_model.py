#!/usr/bin/env python3
"""Download a pose estimation ONNX model for the Rust/WASM pipeline.

Sources:
  - HuggingFace: qualcomm/MoveNetSinglePose
  - Kaggle: google/movenet (requires kagglehub)

Usage:
  python3 scripts/download_pose_model.py [--source hf|kaggle] [--output public/pose_model.onnx]
"""

import sys
import os

def download_from_huggingface(output: str):
    """Download MoveNet Lightning ONNX from HuggingFace."""
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("Installing huggingface_hub...")
        os.system(f"{sys.executable} -m pip install huggingface_hub -q")
        from huggingface_hub import hf_hub_download

    path = hf_hub_download(
        repo_id="qualcomm/MoveNetSinglePose",
        filename="movenet_singlepose_lightning.onnx",
        local_dir=os.path.dirname(output) or ".",
    )
    # Move to desired output path
    if path != output:
        os.rename(path, output)
    print(f"Model downloaded to: {output}")
    print(f"Size: {os.path.getsize(output) / 1024 / 1024:.1f} MB")

def download_from_kaggle(output: str):
    """Download MoveNet from Kaggle (TFLite format, use tract-tflite)."""
    try:
        import kagglehub
    except ImportError:
        print("Installing kagglehub...")
        os.system(f"{sys.executable} -m pip install kagglehub -q")
        import kagglehub

    path = kagglehub.model_download("google/movenet/tfLite/singlepose-lightning-tflite-float16")
    model_path = os.path.join(path, "1.tflite")
    if os.path.exists(model_path):
        os.rename(model_path, output)
        print(f"Model downloaded to: {output}")
        print(f"Size: {os.path.getsize(output) / 1024 / 1024:.1f} MB")
    else:
        print(f"Model not found in {path}")
        print("Files available:", os.listdir(path))

def main():
    source = "hf"
    output = "public/pose_model.onnx"

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--source" and i + 1 < len(args):
            source = args[i + 1]; i += 2
        elif args[i] == "--output" and i + 1 < len(args):
            output = args[i + 1]; i += 2
        else:
            i += 1

    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)

    if source == "hf":
        download_from_huggingface(output)
    elif source == "kaggle":
        download_from_kaggle(output)
    else:
        print(f"Unknown source: {source}")
        sys.exit(1)

if __name__ == "__main__":
    main()
