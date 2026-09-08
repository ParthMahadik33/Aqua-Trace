# AquaTrace ML — Sentinel-1 SAR Oil Spill Datasets

This directory serves as the isolated dataset repository for **AquaTrace Stage 3: Sentinel-1 SAR Oil Spill Detection**.

---

## 1. Datasets in Use

The primary benchmarks for training and evaluating our SAR oil-spill segmentation and classification pipelines are:

1. **Zenodo Sentinel-1 SAR Oil Spill dataset Part II**
2. **Zenodo Sentinel-1 SAR Oil Spill dataset Part III**

### Background & Modality
- **Modality**: Copernicus Sentinel-1 C-band Synthetic Aperture Radar (SAR).
- **Polarizations**: Typically dual-polarization (VV + VH), capturing surface roughness anomalies characteristic of oceanic oil slicks and look-alikes (e.g., biogenic slicks, low wind zones, internal waves).
- **Target Annotations**: Pixel-level binary or multi-class segmentation masks delineating oil spills and look-alikes.

---

## 2. Directory Structure

```
ml/datasets/
├── raw/          # Untouched, original dataset downloads and extracted archives
├── interim/      # Intermediate preprocessed files (e.g., chips, patches, tiled GeoTIFFs)
└── processed/    # Final standardized tensors/formats ready for model training
```

### Purpose of Each Subdirectory:
- **`raw/`**: **Read-only**. Store uncompressed manual downloads exactly as provided by the data publisher. Never modify or normalize files directly in this folder.
- **`interim/`**: Reserved for deterministic transformations, patch extraction, and coordinate re-projections created by downstream pipeline stages.
- **`processed/`**: Reserved for finalized training, validation, and test datasets formatted for deep learning models.

---

## 3. Manual Download Instructions

> **Important Policy**: Datasets are **NOT** downloaded automatically. Datasets must be acquired manually by the developer to comply with data governance and storage management policies.

### Steps:
1. Download the Zenodo Sentinel-1 SAR Oil Spill dataset archives (**Part II** and **Part III**) from the official Zenodo repository.
2. Place the downloaded archive files or extracted directories into `ml/datasets/raw/`:
   ```
   ml/datasets/raw/
   ├── zenodo_part_ii/
   └── zenodo_part_iii/
   ```
3. Verify directory integrity by running the dataset audit tool before any downstream preprocessing.

---

## 4. Dataset Audit & Quality Assurance

Once raw datasets have been placed in `ml/datasets/raw/`, run the dataset audit script:

```bash
python ml/scripts/audit_dataset.py ml/datasets/raw/<dataset_folder_name>
```

This will automatically generate:
- A machine-readable JSON summary in `ml/reports/`
- A human-readable Markdown report in `ml/reports/`

---

## 5. Development Constraints

- **No Raw Data Mutation**: Raw files must remain pristine.
- **Isolation**: Dataset utilities and ML workspace scripts must remain fully isolated from the `backend/` and `frontend/` services.
- **No Training / Splitting Yet**: Model training, dataset splitting, and transformations will be performed in subsequent, dedicated stages.
