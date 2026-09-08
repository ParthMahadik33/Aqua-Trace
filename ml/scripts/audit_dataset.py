#!/usr/bin/env python3
"""AquaTrace ML - Dataset Audit Utility for Sentinel-1 SAR Oil Spill Datasets.

Recursively inspects a supplied dataset directory and generates both a
machine-readable JSON report and a comprehensive Markdown report documenting:
- File counts & extension distribution
- Total storage footprint
- Image formats (TIFF, PNG, JPEG, etc.)
- Mask identification and counts
- Image dimensions and channel/band distributions
- Corrupted / unreadable image detection using tifffile
- Radiometric / pixel statistics (min, max, mean, std, NaN, Inf) for sampled TIFF images
- TIFF metadata (compression, photometric, samples_per_pixel, bits_per_sample, GeoTIFF)
- Directory-level breakdown and representative sample filenames.

Usage:
    python ml/scripts/audit_dataset.py <dataset_path> [--output-dir ml/reports] [--sample-size 15]
"""

from __future__ import annotations

import argparse
import datetime
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:
    import tifffile
except ImportError:
    tifffile = None  # type: ignore

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:
    Image = None  # type: ignore
    UnidentifiedImageError = Exception  # type: ignore


# Known image extensions
IMAGE_EXTENSIONS = {
    ".tif", ".tiff", ".png", ".jpg", ".jpeg",
    ".bmp", ".webp", ".jp2", ".img", ".gif",
    ".npy", ".nc", ".h5", ".hdf5"
}

TIFF_EXTENSIONS = {".tif", ".tiff"}
PNG_EXTENSIONS = {".png"}
JPEG_EXTENSIONS = {".jpg", ".jpeg"}

# Common mask / annotation patterns in filenames or directory names
MASK_NAME_PATTERNS = [
    re.compile(r"(?:^|[_\-.])mask(?:[_\-.]|$)", re.IGNORECASE),
    re.compile(r"(?:^|[_\-.])label(?:s)?(?:[_\-.]|$)", re.IGNORECASE),
    re.compile(r"(?:^|[_\-.])gt(?:[_\-.]|$)", re.IGNORECASE),
    re.compile(r"(?:^|[_\-.])target(?:[_\-.]|$)", re.IGNORECASE),
    re.compile(r"(?:^|[_\-.])annotation(?:s)?(?:[_\-.]|$)", re.IGNORECASE),
    re.compile(r"(?:^|[_\-.])seg(?:[_\-.]|$)", re.IGNORECASE),
    re.compile(r"_m\.[a-zA-Z0-9]+$", re.IGNORECASE),
    re.compile(r"_mask\.[a-zA-Z0-9]+$", re.IGNORECASE),
    re.compile(r"_label\.[a-zA-Z0-9]+$", re.IGNORECASE),
]

MASK_DIR_NAMES = {
    "mask", "masks", "label", "labels",
    "annotation", "annotations", "ground_truth",
    "target", "targets", "gt", "segmentation"
}


def format_bytes(size_bytes: int) -> str:
    """Format bytes into a human-readable string (B, KB, MB, GB, TB)."""
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    i = int(math.floor(math.log(max(size_bytes, 1), 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {units[i]}"


def json_serial(obj: Any) -> Any:
    """JSON serializer for objects not serializable by standard json."""
    if hasattr(obj, "name"):
        return obj.name
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    if isinstance(obj, Path):
        return str(obj)
    if np is not None:
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
    return str(obj)


def sanitize_metadata(val: Any) -> Any:
    """Recursively convert enum and non-serializable objects into JSON-friendly types."""
    if isinstance(val, dict):
        return {str(k): sanitize_metadata(v) for k, v in val.items()}
    elif isinstance(val, (list, tuple)):
        return [sanitize_metadata(v) for v in val]
    elif hasattr(val, "name"):
        return val.name
    elif isinstance(val, (int, float, str, bool)) or val is None:
        return val
    elif np is not None and isinstance(val, (np.integer, np.floating)):
        return val.item()
    else:
        return str(val)


def is_mask_file(file_path: Path, root_path: Path) -> bool:
    """Determine if a given file is a ground-truth/annotation mask."""
    filename = file_path.name
    # 1. Check filename patterns
    for pattern in MASK_NAME_PATTERNS:
        if pattern.search(filename):
            return True

    # 2. Check path relative to root directory for mask-specific folder names
    try:
        rel_parts = [p.lower() for p in file_path.relative_to(root_path).parts[:-1]]
        if any(part in MASK_DIR_NAMES for part in rel_parts):
            return True
    except ValueError:
        pass

    return False


def inspect_image_file(file_path: Path) -> Tuple[Optional[Tuple[int, int]], Optional[int], Optional[str], Optional[str]]:
    """Inspect image dimensions (width, height), channel count, dtype, and return error if unreadable.

    TIFF files are inspected using tifffile. Non-TIFF formats use PIL.

    Returns:
        ((width, height), channels, dtype_str, error_message)
    """
    ext = file_path.suffix.lower()

    # If file is empty (0 bytes), mark as corrupted
    try:
        if file_path.stat().st_size == 0:
            return None, None, None, "File is empty (0 bytes)"
    except Exception as e:
        return None, None, None, f"Cannot access file stats: {e}"

    # Primary inspection for TIFF files using tifffile
    if ext in TIFF_EXTENSIONS:
        if tifffile is None:
            return None, None, None, "tifffile library is not installed"

        try:
            with tifffile.TiffFile(str(file_path)) as tif:
                if not tif.pages:
                    return None, None, None, "TIFF file has no valid pages"

                # Prefer series shape/dtype if available, otherwise first page
                if tif.series:
                    series = tif.series[0]
                    shape = series.shape
                    dtype_str = str(series.dtype)
                else:
                    page = tif.pages[0]
                    shape = page.shape
                    dtype_str = str(page.dtype)

                if len(shape) == 2:
                    h, w = shape
                    return (w, h), 1, dtype_str, None
                elif len(shape) == 3:
                    if shape[0] in (1, 2, 3, 4, 8, 12, 16) and shape[0] < shape[1] and shape[0] < shape[2]:
                        c, h, w = shape
                    else:
                        h, w, c = shape
                    return (w, h), c, dtype_str, None
                elif len(shape) == 4:
                    # e.g., (pages, channels, height, width)
                    return (shape[-1], shape[-2]), shape[1] if shape[1] < 20 else shape[0], dtype_str, None
                else:
                    return (shape[-1], shape[-2]), 1, dtype_str, None
        except Exception as tiff_err:
            return None, None, None, f"tifffile failed to open/read: {type(tiff_err).__name__}: {tiff_err}"

    # Non-TIFF image inspection using PIL
    if Image is not None:
        try:
            with Image.open(file_path) as img:
                w, h = img.size
                mode = img.mode
                mode_channels = {
                    "1": 1, "L": 1, "P": 1, "I": 1, "F": 1, "I;16": 1, "I;16B": 1,
                    "RGB": 3, "YCbCr": 3, "LAB": 3, "HSV": 3,
                    "RGBA": 4, "CMYK": 4, "RGBX": 4
                }
                channels = mode_channels.get(mode, len(img.getbands()) if hasattr(img, "getbands") else 1)
                dtype_str = "float32" if mode == "F" else ("int32" if mode == "I" else ("uint16" if "16" in mode else "uint8"))
                return (w, h), channels, dtype_str, None
        except Exception as pil_err:
            return None, None, None, f"PIL failed to read image: {type(pil_err).__name__}: {pil_err}"

    return None, None, None, "No supported image reader available for format"


def extract_tiff_metadata(file_path: Path) -> Dict[str, Any]:
    """Inspect TIFF metadata where available: compression, photometric, samples_per_pixel, bits_per_sample, GeoTIFF tags."""
    if tifffile is None:
        return {}

    metadata: Dict[str, Any] = {}
    try:
        with tifffile.TiffFile(str(file_path)) as tif:
            if not tif.pages:
                return metadata

            page = tif.pages[0]

            # Compression
            if hasattr(page, "compression"):
                comp = page.compression
                metadata["compression"] = comp.name if hasattr(comp, "name") else str(comp)
            elif "Compression" in page.tags:
                c_val = page.tags["Compression"].value
                metadata["compression"] = c_val.name if hasattr(c_val, "name") else str(c_val)

            # Photometric Interpretation
            if hasattr(page, "photometric"):
                photo = page.photometric
                metadata["photometric"] = photo.name if hasattr(photo, "name") else str(photo)
            elif "PhotometricInterpretation" in page.tags:
                p_val = page.tags["PhotometricInterpretation"].value
                metadata["photometric"] = p_val.name if hasattr(p_val, "name") else str(p_val)

            # Samples per pixel
            if hasattr(page, "samplesperpixel") and page.samplesperpixel is not None:
                metadata["samples_per_pixel"] = int(page.samplesperpixel)
            elif "SamplesPerPixel" in page.tags:
                try:
                    metadata["samples_per_pixel"] = int(page.tags["SamplesPerPixel"].value)
                except Exception:
                    metadata["samples_per_pixel"] = sanitize_metadata(page.tags["SamplesPerPixel"].value)

            # Bits per sample
            if hasattr(page, "bitspersample") and page.bitspersample is not None:
                metadata["bits_per_sample"] = sanitize_metadata(page.bitspersample)
            elif "BitsPerSample" in page.tags:
                metadata["bits_per_sample"] = sanitize_metadata(page.tags["BitsPerSample"].value)

            # Sample format
            if hasattr(page, "sampleformat") and page.sampleformat is not None:
                metadata["sample_format"] = sanitize_metadata(page.sampleformat)
            elif "SampleFormat" in page.tags:
                metadata["sample_format"] = sanitize_metadata(page.tags["SampleFormat"].value)

            # Relevant GeoTIFF metadata
            geotiff = getattr(tif, "geotiff_metadata", None)
            if geotiff:
                metadata["geotiff"] = sanitize_metadata(geotiff)

            # Interesting tags if present
            interesting_tags = [
                "ModelTransformationTag", "ModelPixelScaleTag", "ModelTiepointTag",
                "GeoKeyDirectoryTag", "GeoAsciiParamsTag", "Software", "DateTime"
            ]
            tag_dict = {}
            for t_name in interesting_tags:
                if t_name in page.tags:
                    tag_dict[t_name] = sanitize_metadata(page.tags[t_name].value)
            if tag_dict:
                metadata["tags"] = tag_dict

    except Exception as e:
        metadata["metadata_error"] = str(e)

    return metadata


def sample_tiff_file(file_path: Path, root_path: Optional[Path] = None) -> Dict[str, Any]:
    """Inspect metadata and compute radiometric/pixel statistics for a sampled TIFF image using tifffile."""
    filename = file_path.name
    rel_path = str(file_path.relative_to(root_path)) if root_path else filename

    result: Dict[str, Any] = {
        "filename": filename,
        "relative_path": rel_path,
        "readable": False,
        "shape": None,
        "dimensions": None,
        "bands": None,
        "dtype": None,
        "min": None,
        "max": None,
        "mean": None,
        "std": None,
        "nan_count": 0,
        "inf_count": 0,
        "is_finite": True,
        "has_nan": False,
        "zero_pixel_percent": None,
        "metadata": {},
        "band_details": None,
        "error": None,
    }

    if tifffile is None:
        result["error"] = "tifffile library is not installed"
        return result

    # 1. Extract metadata
    result["metadata"] = extract_tiff_metadata(file_path)

    # 2. Read pixel data using tifffile
    try:
        arr = tifffile.imread(str(file_path))
    except Exception as read_err:
        result["error"] = f"{type(read_err).__name__}: {read_err}"
        return result

    if arr is None or np is None:
        result["error"] = "Failed to load pixel array"
        return result

    result["readable"] = True
    result["shape"] = list(arr.shape)
    result["dtype"] = str(arr.dtype)

    # Determine width, height, and band count
    if len(arr.shape) == 2:
        h, w = arr.shape
        num_bands = 1
        band_axis = -1
        result["dimensions"] = {"width": int(w), "height": int(h)}
        result["bands"] = 1
    elif len(arr.shape) == 3:
        if arr.shape[0] in (1, 2, 3, 4, 8, 12, 16) and arr.shape[0] < arr.shape[1] and arr.shape[0] < arr.shape[2]:
            num_bands, h, w = arr.shape
            band_axis = 0
        else:
            h, w, num_bands = arr.shape
            band_axis = 2
        result["dimensions"] = {"width": int(w), "height": int(h)}
        result["bands"] = int(num_bands)
    elif len(arr.shape) == 4:
        h, w = arr.shape[-2], arr.shape[-1]
        num_bands = arr.shape[1] if arr.shape[1] < 20 else arr.shape[0]
        band_axis = 1
        result["dimensions"] = {"width": int(w), "height": int(h)}
        result["bands"] = int(num_bands)
    else:
        num_bands = 1
        band_axis = -1
        result["dimensions"] = {"width": int(arr.shape[-1]), "height": int(arr.shape[-2]) if len(arr.shape) > 1 else 1}
        result["bands"] = 1

    # NaN / Inf statistics
    is_float = np.issubdtype(arr.dtype, np.floating)
    if is_float:
        nan_count = int(np.isnan(arr).sum())
        inf_count = int(np.isinf(arr).sum())
        result["nan_count"] = nan_count
        result["inf_count"] = inf_count
        result["has_nan"] = bool(nan_count > 0)
        result["is_finite"] = bool(nan_count == 0 and inf_count == 0)
        valid_arr = arr[np.isfinite(arr)]
    else:
        result["nan_count"] = 0
        result["inf_count"] = 0
        result["has_nan"] = False
        result["is_finite"] = True
        valid_arr = arr

    if arr.size > 0:
        result["zero_pixel_percent"] = round(float((np.count_nonzero(arr == 0) / arr.size) * 100.0), 2)
    else:
        result["zero_pixel_percent"] = 0.0

    if valid_arr.size > 0:
        result["min"] = round(float(np.min(valid_arr)), 4)
        result["max"] = round(float(np.max(valid_arr)), 4)
        result["mean"] = round(float(np.mean(valid_arr)), 4)
        result["std"] = round(float(np.std(valid_arr)), 4)

    # Per-channel / band statistics
    if len(arr.shape) == 3 and result["bands"] > 1:
        band_stats = []
        for b in range(result["bands"]):
            b_arr = arr[b, :, :] if band_axis == 0 else arr[:, :, b]
            b_nan = int(np.isnan(b_arr).sum()) if is_float else 0
            b_inf = int(np.isinf(b_arr).sum()) if is_float else 0
            v_b = b_arr[np.isfinite(b_arr)] if is_float else b_arr
            b_info: Dict[str, Any] = {
                "band_index": b + 1,
                "nan_count": b_nan,
                "inf_count": b_inf,
            }
            if v_b.size > 0:
                b_info["min"] = round(float(np.min(v_b)), 4)
                b_info["max"] = round(float(np.max(v_b)), 4)
                b_info["mean"] = round(float(np.mean(v_b)), 4)
                b_info["std"] = round(float(np.std(v_b)), 4)
            band_stats.append(b_info)
        result["band_details"] = band_stats

    return result


def compute_tiff_pixel_stats(file_path: Path) -> Optional[Dict[str, Any]]:
    """Backward-compatible helper to compute radiometric / pixel statistics using tifffile."""
    res = sample_tiff_file(file_path)
    if not res.get("readable"):
        return None
    res["bands"] = res.get("band_details")
    return res


def audit_dataset_directory(
    dataset_path: Path,
    sample_size: int = 15
) -> Dict[str, Any]:
    """Recursively audits a dataset directory and gathers comprehensive metrics."""
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset path does not exist: {dataset_path}")
    if not dataset_path.is_dir():
        raise NotADirectoryError(f"Dataset path is not a directory: {dataset_path}")

    dataset_path = dataset_path.resolve()

    total_files = 0
    total_directories = 0
    total_storage_bytes = 0

    extension_counts: Counter[str] = Counter()
    format_counts: Dict[str, int] = {
        "TIFF": 0,
        "PNG": 0,
        "JPEG": 0,
        "Other_Images": 0,
        "Non_Image_Files": 0,
        "Total_Images": 0,
    }

    mask_count = 0
    non_mask_image_count = 0

    image_count_by_dir: Dict[str, int] = defaultdict(int)
    mask_count_by_dir: Dict[str, int] = defaultdict(int)
    file_count_by_dir: Dict[str, int] = defaultdict(int)
    bytes_by_dir: Dict[str, int] = defaultdict(int)

    image_dimensions: Counter[str] = Counter()
    channel_distributions: Counter[str] = Counter()
    dtypes_distribution: Counter[str] = Counter()

    corrupted_files: List[Dict[str, str]] = []
    sample_filenames_by_ext: Dict[str, List[str]] = defaultdict(list)
    all_tiff_files: List[Path] = []

    # Walk directory tree
    for root, dirs, files in os.walk(dataset_path):
        root_path = Path(root)
        total_directories += len(dirs)

        rel_dir = str(root_path.relative_to(dataset_path))
        if rel_dir == ".":
            rel_dir = "/"

        for file_name in files:
            file_path = root_path / file_name
            total_files += 1

            # Storage & Extension
            try:
                size = file_path.stat().st_size
            except Exception:
                size = 0
            total_storage_bytes += size
            bytes_by_dir[rel_dir] += size
            file_count_by_dir[rel_dir] += 1

            ext = file_path.suffix.lower()
            extension_counts[ext if ext else "[no_extension]"] += 1

            # Collect sample filenames (up to 5 per extension)
            if len(sample_filenames_by_ext[ext if ext else "[no_extension]"]) < 5:
                sample_filenames_by_ext[ext if ext else "[no_extension]"].append(file_name)

            # Check if image
            is_image = ext in IMAGE_EXTENSIONS
            if is_image:
                format_counts["Total_Images"] += 1
                image_count_by_dir[rel_dir] += 1

                if ext in TIFF_EXTENSIONS:
                    format_counts["TIFF"] += 1
                    all_tiff_files.append(file_path)
                elif ext in PNG_EXTENSIONS:
                    format_counts["PNG"] += 1
                elif ext in JPEG_EXTENSIONS:
                    format_counts["JPEG"] += 1
                else:
                    format_counts["Other_Images"] += 1

                # Check mask status
                is_mask = is_mask_file(file_path, dataset_path)
                if is_mask:
                    mask_count += 1
                    mask_count_by_dir[rel_dir] += 1
                else:
                    non_mask_image_count += 1

                # Inspect image dimensions and channels
                dim, channels, dtype_str, error_msg = inspect_image_file(file_path)
                if error_msg:
                    corrupted_files.append({
                        "filename": file_name,
                        "relative_path": str(file_path.relative_to(dataset_path)),
                        "error": error_msg
                    })
                else:
                    if dim:
                        dim_key = f"{dim[0]}x{dim[1]}"
                        image_dimensions[dim_key] += 1
                    if channels is not None:
                        chan_key = f"{channels} {'band' if channels == 1 else 'bands'}"
                        channel_distributions[chan_key] += 1
                    if dtype_str:
                        dtypes_distribution[dtype_str] += 1
            else:
                format_counts["Non_Image_Files"] += 1

    # Radiometric statistics and metadata inspection on sampled TIFF images
    sampled_tiff_stats: List[Dict[str, Any]] = []
    if all_tiff_files and sample_size > 0:
        step = max(1, len(all_tiff_files) // sample_size)
        sampled_candidates = all_tiff_files[::step][:sample_size]

        for tiff_path in sampled_candidates:
            stats = sample_tiff_file(tiff_path, dataset_path)
            sampled_tiff_stats.append(stats)

    # Format directory level breakdown
    directory_breakdown = {}
    for d_path in sorted(file_count_by_dir.keys()):
        directory_breakdown[d_path] = {
            "total_files": file_count_by_dir[d_path],
            "image_files": image_count_by_dir[d_path],
            "mask_files": mask_count_by_dir[d_path],
            "storage_bytes": bytes_by_dir[d_path],
            "storage_formatted": format_bytes(bytes_by_dir[d_path]),
        }

    audit_result = {
        "dataset_name": dataset_path.name,
        "dataset_path": str(dataset_path),
        "audit_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": {
            "total_files": total_files,
            "total_directories": total_directories,
            "total_storage_bytes": total_storage_bytes,
            "total_storage_formatted": format_bytes(total_storage_bytes),
            "total_images": format_counts["Total_Images"],
            "mask_images": mask_count,
            "non_mask_images": non_mask_image_count,
            "corrupted_or_unreadable_images": len(corrupted_files),
        },
        "image_formats": format_counts,
        "file_extensions": dict(sorted(extension_counts.items(), key=lambda item: item[1], reverse=True)),
        "image_dimensions": dict(sorted(image_dimensions.items(), key=lambda item: item[1], reverse=True)),
        "channel_distributions": dict(sorted(channel_distributions.items(), key=lambda item: item[1], reverse=True)),
        "data_types": dict(sorted(dtypes_distribution.items(), key=lambda item: item[1], reverse=True)),
        "corrupted_files": corrupted_files,
        "sampled_tiff_radiometry": sampled_tiff_stats,
        "directory_breakdown": directory_breakdown,
        "sample_filenames_by_extension": dict(sample_filenames_by_ext),
    }

    return audit_result


def generate_markdown_report(audit_data: Dict[str, Any]) -> str:
    """Generates a comprehensive, clean GitHub-flavored Markdown audit report."""
    summary = audit_data["summary"]
    formats = audit_data["image_formats"]
    extensions = audit_data["file_extensions"]
    dims = audit_data["image_dimensions"]
    channels = audit_data["channel_distributions"]
    dtypes = audit_data["data_types"]
    corrupted = audit_data["corrupted_files"]
    tiff_stats = audit_data["sampled_tiff_radiometry"]
    dirs = audit_data["directory_breakdown"]
    samples = audit_data["sample_filenames_by_extension"]

    timestamp = audit_data["audit_timestamp"]
    ds_name = audit_data["dataset_name"]
    ds_path = audit_data["dataset_path"]

    status_badge = "✅ **HEALTHY (0 corrupted files)**" if len(corrupted) == 0 else f"⚠️ **ISSUES DETECTED ({len(corrupted)} unreadable files)**"

    lines = [
        f"# Dataset Audit Report: `{ds_name}`",
        "",
        f"- **Audited Path**: `{ds_path}`",
        f"- **Timestamp (UTC)**: `{timestamp}`",
        f"- **Audit Status**: {status_badge}",
        "",
        "---",
        "",
        "## 1. Executive Summary",
        "",
        "| Metric | Value |",
        "| :--- | :--- |",
        f"| **Total Files** | {summary['total_files']:,} |",
        f"| **Total Storage** | {summary['total_storage_formatted']} ({summary['total_storage_bytes']:,} bytes) |",
        f"| **Total Subdirectories** | {summary['total_directories']:,} |",
        f"| **Total Image Files** | {summary['total_images']:,} |",
        f"| **Segmentation Masks Identified** | {summary['mask_images']:,} |",
        f"| **Non-Mask Imagery** | {summary['non_mask_images']:,} |",
        f"| **Corrupted / Unreadable Files** | {summary['corrupted_or_unreadable_images']} |",
        "",
        "---",
        "",
        "## 2. Image Format & Extension Breakdown",
        "",
        "### Image Modalities & Encodings",
        "",
        "| Format | Count | Percentage |",
        "| :--- | :--- | :--- |",
    ]

    for fmt_name in ["TIFF", "PNG", "JPEG", "Other_Images", "Non_Image_Files"]:
        cnt = formats.get(fmt_name, 0)
        pct = (cnt / summary['total_files'] * 100.0) if summary['total_files'] > 0 else 0.0
        lines.append(f"| **{fmt_name}** | {cnt:,} | {pct:.1f}% |")

    lines.extend([
        "",
        "### All File Extensions",
        "",
        "| Extension | File Count |",
        "| :--- | :--- |",
    ])
    for ext, cnt in extensions.items():
        lines.append(f"| `{ext}` | {cnt:,} |")

    lines.extend([
        "",
        "---",
        "",
        "## 3. Spatial & Radiometric Characteristics",
        "",
        "### Image Dimensions (Width x Height)",
        "",
    ])

    total_imgs = summary['total_images'] if summary['total_images'] > 0 else 1
    if dims:
        lines.extend([
            "| Dimension (W x H) | Count | Share |",
            "| :--- | :--- | :--- |",
        ])
        for dim_str, cnt in dims.items():
            pct = (cnt / total_imgs * 100.0)
            lines.append(f"| `{dim_str}` | {cnt:,} | {pct:.1f}% |")
    else:
        lines.append("*No valid images found for spatial dimension inspection.*")

    lines.extend([
        "",
        "### Channel / Band Configuration",
        "",
    ])
    if channels:
        lines.extend([
            "| Channel Configuration | Image Count |",
            "| :--- | :--- |",
        ])
        for ch_str, cnt in channels.items():
            lines.append(f"| {ch_str} | {cnt:,} |")
    else:
        lines.append("*No channel information detected.*")

    lines.extend([
        "",
        "### Data Types (Dtypes)",
        "",
    ])
    if dtypes:
        lines.extend([
            "| Data Type | Image Count |",
            "| :--- | :--- |",
        ])
        for dt_str, cnt in dtypes.items():
            lines.append(f"| `{dt_str}` | {cnt:,} |")
    else:
        lines.append("*No data types detected.*")

    lines.extend([
        "",
        "---",
        "",
        "## 4. Sampled TIFF Radiometric & Value Statistics",
        "",
    ])

    if tiff_stats:
        lines.extend([
            "| Sample Filename | Readable | Shape | Dimensions | Bands | Dtype | Min | Max | Mean | NaN Count | Inf Count | Compression | Photometric |",
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        ])
        for ts in tiff_stats:
            fname = ts.get("filename", "N/A")
            readable_str = "Yes" if ts.get("readable") else "No"
            shape_str = str(ts.get("shape", "N/A"))
            dims_dict = ts.get("dimensions")
            dim_str = f"{dims_dict.get('width')}x{dims_dict.get('height')}" if isinstance(dims_dict, dict) else "N/A"
            bands_str = str(ts.get("bands", "N/A"))
            dtype_str = str(ts.get("dtype", "N/A"))
            min_v = ts.get("min", "N/A")
            max_v = ts.get("max", "N/A")
            mean_v = ts.get("mean", "N/A")
            nan_v = ts.get("nan_count", 0)
            inf_v = ts.get("inf_count", 0)
            meta = ts.get("metadata", {})
            comp_v = meta.get("compression", "N/A")
            photo_v = meta.get("photometric", "N/A")

            lines.append(
                f"| `{fname}` | {readable_str} | `{shape_str}` | `{dim_str}` | {bands_str} | "
                f"`{dtype_str}` | {min_v} | {max_v} | {mean_v} | {nan_v} | {inf_v} | {comp_v} | {photo_v} |"
            )

        # Additional metadata details
        lines.extend([
            "",
            "### Sampled TIFF GeoTIFF & Encoding Metadata",
            "",
        ])
        for ts in tiff_stats[:5]:
            fname = ts.get("filename", "N/A")
            meta = ts.get("metadata", {})
            geotiff = meta.get("geotiff", {})
            spp = meta.get("samples_per_pixel", "N/A")
            bps = meta.get("bits_per_sample", "N/A")
            sfmt = meta.get("sample_format", "N/A")

            lines.append(f"#### `{fname}`")
            lines.append(f"- **Compression**: `{meta.get('compression', 'N/A')}` | **Photometric**: `{meta.get('photometric', 'N/A')}`")
            lines.append(f"- **Samples Per Pixel**: `{spp}` | **Bits Per Sample**: `{bps}` | **Sample Format**: `{sfmt}`")
            if geotiff:
                model_type = geotiff.get("GTModelTypeGeoKey", "N/A")
                geo_type = geotiff.get("GeographicTypeGeoKey", "N/A")
                citation = geotiff.get("GTCitationGeoKey", "N/A")
                lines.append(f"- **GeoTIFF CRS / Model**: `{model_type}` (GCS: `{geo_type}`, Citation: `{citation}`)")
            if ts.get("band_details"):
                lines.append("- **Band Details**:")
                for b_info in ts["band_details"]:
                    lines.append(
                        f"  - Band {b_info.get('band_index')}: min={b_info.get('min')}, max={b_info.get('max')}, "
                        f"mean={b_info.get('mean')}, NaNs={b_info.get('nan_count')}, Infs={b_info.get('inf_count')}"
                    )
            lines.append("")
    else:
        lines.append("*No TIFF images were available for radiometric sampling.*")

    lines.extend([
        "---",
        "",
        "## 5. Directory Breakdown",
        "",
        "| Directory Path | Files | Images | Masks | Storage |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ])
    for dir_path, dir_info in dirs.items():
        lines.append(
            f"| `{dir_path}` | {dir_info['total_files']:,} | {dir_info['image_files']:,} | "
            f"{dir_info['mask_files']:,} | {dir_info['storage_formatted']} |"
        )

    lines.extend([
        "",
        "---",
        "",
        "## 6. Integrity & Corrupted Files",
        "",
    ])
    if corrupted:
        lines.extend([
            "> [!WARNING]",
            f"> Found **{len(corrupted)}** corrupted or unreadable image file(s):",
            "",
            "| Relative Path | Error Description |",
            "| :--- | :--- |",
        ])
        for c in corrupted:
            lines.append(f"| `{c['relative_path']}` | {c['error']} |")
    else:
        lines.append("> [!NOTE]\n> All inspected image files are valid and readable via tifffile/PIL.")

    lines.extend([
        "",
        "---",
        "",
        "## 7. Sample Filenames by Extension",
        "",
    ])
    for ext, files_list in samples.items():
        lines.append(f"- **`{ext}`** ({len(files_list)} shown): {', '.join(f'`{fn}`' for fn in files_list)}")

    lines.append("")
    return "\n".join(lines)


def save_reports(
    audit_data: Dict[str, Any],
    output_dir: Path,
    report_name: Optional[str] = None
) -> Tuple[Path, Path]:
    """Save both JSON and Markdown audit reports to the output directory."""
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    dataset_slug = re.sub(r"[^a-zA-Z0-9_\-]", "_", audit_data["dataset_name"]).lower()

    base_name = report_name if report_name else f"audit_{dataset_slug}_{timestamp_str}"

    json_path = output_dir / f"{base_name}.json"
    md_path = output_dir / f"{base_name}.md"

    # Write JSON report safely with custom serializer
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(audit_data, f, indent=2, default=json_serial)

    # Write Markdown report
    md_content = generate_markdown_report(audit_data)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    return json_path, md_path


def print_cli_summary(audit_data: Dict[str, Any], json_path: Path, md_path: Path) -> None:
    """Print a clean CLI summary to stdout."""
    summary = audit_data["summary"]
    formats = audit_data["image_formats"]
    sampled_tiffs = audit_data.get("sampled_tiff_radiometry", [])

    print("\n" + "=" * 65)
    print(" AquaTrace ML - Sentinel-1 Dataset Audit Complete")
    print("=" * 65)
    print(f" Dataset Target     : {audit_data['dataset_path']}")
    print(f" Total Storage      : {summary['total_storage_formatted']} ({summary['total_storage_bytes']:,} bytes)")
    print(f" Total Files        : {summary['total_files']:,}")
    print(f" Total Subdirs      : {summary['total_directories']:,}")
    print(f" Total Images       : {summary['total_images']:,}")
    print(f"  +- TIFF Images    : {formats['TIFF']:,}")
    print(f"  +- PNG Images     : {formats['PNG']:,}")
    print(f"  +- JPEG Images    : {formats['JPEG']:,}")
    print(f"  +- Other Images   : {formats['Other_Images']:,}")
    print(f" Identified Masks   : {summary['mask_images']:,}")
    print(f" Non-Mask Imagery   : {summary['non_mask_images']:,}")
    print(f" Corrupted Files    : {summary['corrupted_or_unreadable_images']:,}")
    print(f" Sampled TIFFs      : {len(sampled_tiffs):,}")
    if sampled_tiffs:
        readable_count = sum(1 for t in sampled_tiffs if t.get("readable"))
        print(f"  +- Readable TIFFs : {readable_count} / {len(sampled_tiffs)}")
        first_t = sampled_tiffs[0]
        meta = first_t.get("metadata", {})
        print(f"  +- Sample Shape   : {first_t.get('shape')} ({first_t.get('dtype')})")
        print(f"  +- Sample Bands   : {first_t.get('bands')}")
        print(f"  +- Compression    : {meta.get('compression', 'N/A')}")
        print(f"  +- Photometric    : {meta.get('photometric', 'N/A')}")
    print("-" * 65)
    print(" Reports Saved:")
    print(f"  +- Machine JSON   : {json_path}")
    print(f"  +- Human Markdown : {md_path}")
    print("=" * 65 + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="AquaTrace Dataset Audit Tool: Recursively inspect SAR & imagery datasets using tifffile."
    )
    parser.add_argument(
        "dataset_path",
        type=str,
        help="Path to the dataset directory to inspect."
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="ml/reports",
        help="Directory where JSON and Markdown reports will be saved (default: ml/reports)."
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=15,
        help="Number of TIFF images to sample for radiometric statistics (default: 15)."
    )
    parser.add_argument(
        "--report-name",
        type=str,
        default=None,
        help="Custom base name for the generated report files (without extension)."
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress terminal summary output."
    )
    return parser.parse_args()


def main() -> int:
    # Ensure UTF-8 output when possible on Windows terminals
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    if hasattr(sys.stderr, "reconfigure"):
        try:
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    args = parse_args()
    target_path = Path(args.dataset_path)
    output_dir = Path(args.output_dir)

    try:
        audit_data = audit_dataset_directory(
            dataset_path=target_path,
            sample_size=args.sample_size
        )
        json_path, md_path = save_reports(
            audit_data=audit_data,
            output_dir=output_dir,
            report_name=args.report_name
        )

        if not args.quiet:
            print_cli_summary(audit_data, json_path, md_path)

        return 0
    except Exception as e:
        print(f"[ERROR] Error during dataset audit: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
