## Surgical Scene ML Pipeline

This folder contains a self-contained PyTorch pipeline for the hackathon challenge. It covers:

1. Multi-class surgical phase classification
2. Semantic segmentation on CholecSeg8k to pick out instruments/organs
3. Importance scoring logic that blends quality, phase, and segmentation cues
4. A lightweight inference service that the FastAPI backend can call

### Folder structure

```
ml_pipeline/
├── config.py                # Dataset + training configuration
├── dataset.py               # CholecSeg8k dataset loader with pseudo phase labels
├── models/                  # UNet + phase classifier definitions
├── losses.py                # Dice + CE combined loss
├── ranking.py               # Importance heuristics shared with the backend
├── inference_service.py     # Runtime wrapper used by FastAPI
├── train_models.py          # CLI to train segmentation + phase models
└── README.md
```

### Usage

1. **Install dependencies**

   ```bash
   pip install -r requirements-ml.txt
   ```

2. **Train both models**

   ```bash
   python -m ml_pipeline.train_models \
     --dataset-root cholecseg8k_dataset \
     --artifacts-dir ml_pipeline/artifacts \
     --batch-size 4 \
     --image-size 512
   ```

   Checkpoints are saved in `ml_pipeline/artifacts/segmentation_unet.pt` and `phase_classifier.pt`.

3. **(Optional) Drop-in EndoViT checkpoints**

   If you have downloaded the EndoViT segmentation checkpoint (`endovit_seg.pth` from the official repository),
   place it inside `ml_pipeline/artifacts/`. The analyzer will automatically switch to the higher quality
   MAE+DPT model without retraining. The same mechanism is ready for future surgical-phase checkpoints:
   drop them as `endovit_phase.pth` and the pipeline will pick them up when we wire a phase head.

4. **Run inference / integrate with backend**

   ```python
   from ml_pipeline import SurgicalSceneAnalyzer

   analyzer = SurgicalSceneAnalyzer()
   analysis = analyzer.analyze_frame(frame_numpy_array, quality_score=88.5)
   print(analysis["phase"], analysis["detected_objects"], analysis["importance_score"])
   ```

### Notes

- The CholecSeg8k masks encode classes via grayscale integers. The map lives in `config.py`.
- Ground-truth surgical phases are not shipped with the dataset, so the loader derives pseudo labels based on the relative frame position within a surgery. This keeps the classifier lightweight but still useful for ranking.
- The ranking routine prioritizes `critical_dissection` and `clip_and_divide` phases, and boosts frames that show cystic structures, scissors, or grasper interactions.
