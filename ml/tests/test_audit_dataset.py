"""Unit tests for the AquaTrace ML Dataset Audit utility (ml/scripts/audit_dataset.py)."""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

# Import functions from audit_dataset
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from ml.scripts.audit_dataset import (
    audit_dataset_directory,
    compute_tiff_pixel_stats,
    extract_tiff_metadata,
    format_bytes,
    generate_markdown_report,
    inspect_image_file,
    is_mask_file,
    sample_tiff_file,
    save_reports,
)

try:
    import tifffile
except ImportError:
    tifffile = None


def test_format_bytes():
    """Test human-readable byte formatting."""
    assert format_bytes(0) == "0 B"
    assert format_bytes(500) == "500.0 B"
    assert format_bytes(1024) == "1.0 KB"
    assert format_bytes(1024 * 1024 * 5) == "5.0 MB"
    assert format_bytes(1024 * 1024 * 1024 * 2) == "2.0 GB"


def test_is_mask_file(tmp_path):
    """Test mask identification heuristic via filename and parent directory."""
    root = tmp_path

    # By filename
    assert is_mask_file(root / "scene_01_mask.png", root) is True
    assert is_mask_file(root / "patch_04_m.png", root) is True
    assert is_mask_file(root / "sample_label.tif", root) is True
    assert is_mask_file(root / "img_gt.png", root) is True
    assert is_mask_file(root / "patch_target.png", root) is True
    assert is_mask_file(root / "oil_seg.png", root) is True

    # By folder name
    mask_dir = root / "masks"
    mask_dir.mkdir(parents=True, exist_ok=True)
    assert is_mask_file(mask_dir / "sample_01.png", root) is True

    # Non-mask files
    assert is_mask_file(root / "scene_01_vv.tif", root) is False
    assert is_mask_file(root / "sar_intensity.tiff", root) is False
    assert is_mask_file(root / "metadata.json", root) is False


def test_unicode_path(tmp_path):
    """Test auditing dataset with Unicode paths and filenames."""
    unicode_dir = tmp_path / "SAR_lookalike_üñîçødé_波_データ"
    unicode_dir.mkdir()

    tiff_file = unicode_dir / "scene_01_é_波.tif"
    data = np.array([[12.5, -34.2], [5.0, 18.1]], dtype=np.float32)
    tifffile.imwrite(str(tiff_file), data)

    audit_data = audit_dataset_directory(unicode_dir, sample_size=5)
    summary = audit_data["summary"]

    assert summary["total_files"] == 1
    assert summary["total_images"] == 1
    assert summary["corrupted_or_unreadable_images"] == 0

    sampled = audit_data["sampled_tiff_radiometry"]
    assert len(sampled) == 1
    assert sampled[0]["filename"] == "scene_01_é_波.tif"
    assert sampled[0]["readable"] is True
    assert sampled[0]["dtype"] == "float32"
    assert sampled[0]["min"] == -34.2
    assert sampled[0]["max"] == 18.1


def test_floating_point_tiff(tmp_path):
    """Test inspecting multi-band float32 TIFF with NaNs, Infs, and negative values."""
    tiff_path = tmp_path / "fp_sar.tif"

    # 2 bands, shape (2, 4, 4) with NaN and Inf
    band1 = np.array([
        [-50.5, -20.2, 0.0, 10.5],
        [np.nan, -30.0, 5.0, 15.0],
        [1.0, 2.0, 3.0, 4.0],
        [10.0, 20.0, 30.0, 40.0]
    ], dtype=np.float32)

    band2 = np.array([
        [-10.0, -5.0, 0.0, 5.0],
        [np.inf, -15.0, 2.0, 4.0],
        [0.0, 0.0, 0.0, 0.0],
        [1.0, 2.0, 3.0, 4.0]
    ], dtype=np.float32)

    data = np.stack([band1, band2], axis=-1)  # shape (4, 4, 2)
    tifffile.imwrite(str(tiff_path), data, photometric="minisblack")

    res = sample_tiff_file(tiff_path)
    assert res["readable"] is True
    assert res["filename"] == "fp_sar.tif"
    assert res["shape"] == [4, 4, 2]
    assert res["dimensions"] == {"width": 4, "height": 4}
    assert res["bands"] == 2
    assert res["dtype"] == "float32"
    assert res["nan_count"] == 1
    assert res["inf_count"] == 1
    assert res["has_nan"] is True
    assert res["is_finite"] is False
    assert res["min"] == -50.5
    assert res["max"] == 40.0
    assert res["band_details"] is not None
    assert len(res["band_details"]) == 2
    assert res["band_details"][0]["nan_count"] == 1
    assert res["band_details"][0]["inf_count"] == 0
    assert res["band_details"][1]["nan_count"] == 0
    assert res["band_details"][1]["inf_count"] == 1


def test_readable_tiff_with_metadata(tmp_path):
    """Test extracting compression, photometric, and tag metadata from a readable TIFF."""
    tiff_path = tmp_path / "metadata_test.tif"
    data = np.ones((32, 32), dtype=np.float32) * 5.5

    tifffile.imwrite(
        str(tiff_path),
        data,
        compression="zlib",
        photometric="minisblack",
        metadata={"Description": "AquaTrace Test SAR Scene"}
    )

    res = sample_tiff_file(tiff_path)
    assert res["readable"] is True
    meta = res["metadata"]
    assert "compression" in meta
    assert "photometric" in meta
    assert "samples_per_pixel" in meta
    assert meta["samples_per_pixel"] == 1
    assert "bits_per_sample" in meta
    assert res["min"] == 5.5
    assert res["max"] == 5.5
    assert res["mean"] == 5.5
    assert res["nan_count"] == 0
    assert res["inf_count"] == 0


def test_unreadable_tiff_corruption(tmp_path):
    """Test corruption detection: tifffile failure records filename and actual exception."""
    corrupt_tiff = tmp_path / "corrupt_sar.tif"
    corrupt_tiff.write_bytes(b"NOT_A_VALID_TIFF_MAGIC_NUMBER_HEADER")

    # 1. inspect_image_file returns error with tifffile exception
    dim, channels, dtype_str, err = inspect_image_file(corrupt_tiff)
    assert dim is None
    assert channels is None
    assert err is not None
    assert "tifffile failed to open/read" in err
    assert "cv2" not in err.lower()

    # 2. sample_tiff_file marks readable=False and records error
    res = sample_tiff_file(corrupt_tiff)
    assert res["readable"] is False
    assert res["error"] is not None
    assert len(res["error"]) > 0

    # 3. 0-byte file check
    empty_tiff = tmp_path / "empty.tif"
    empty_tiff.write_bytes(b"")
    _, _, _, empty_err = inspect_image_file(empty_tiff)
    assert empty_err is not None
    assert "empty" in empty_err.lower()


def test_empty_directory(tmp_path):
    """Test auditing an empty directory without errors or division by zero."""
    empty_dir = tmp_path / "empty_dir"
    empty_dir.mkdir()

    audit_data = audit_dataset_directory(empty_dir)
    assert audit_data["summary"]["total_files"] == 0
    assert audit_data["summary"]["total_images"] == 0
    assert audit_data["summary"]["corrupted_or_unreadable_images"] == 0
    assert audit_data["sampled_tiff_radiometry"] == []

    # Verify report generation on empty dataset
    reports_dir = tmp_path / "empty_reports"
    json_p, md_p = save_reports(audit_data, reports_dir, report_name="empty_audit")
    assert json_p.exists()
    assert md_p.exists()


def test_nonexistent_directory(tmp_path):
    """Test error handling when passed a nonexistent directory."""
    nonexistent = tmp_path / "does_not_exist_folder"

    with pytest.raises(FileNotFoundError):
        audit_dataset_directory(nonexistent)

    # CLI subprocess
    script_path = Path(__file__).resolve().parent.parent / "scripts" / "audit_dataset.py"
    cmd = [sys.executable, str(script_path), str(nonexistent)]
    res = subprocess.run(cmd, capture_output=True, text=True)
    assert res.returncode != 0
    assert "Error during dataset audit" in res.stderr


def test_sample_size_option(tmp_path):
    """Test the --sample-size parameter both in Python API and CLI."""
    dataset_dir = tmp_path / "sample_size_dataset"
    dataset_dir.mkdir()

    # Create 8 small TIFF files
    for i in range(8):
        f = dataset_dir / f"image_{i:02d}.tif"
        data = np.full((16, 16), fill_value=float(i), dtype=np.float32)
        tifffile.imwrite(str(f), data)

    # Test API with sample_size=3
    audit_data = audit_dataset_directory(dataset_dir, sample_size=3)
    assert len(audit_data["sampled_tiff_radiometry"]) == 3

    # Test CLI with --sample-size 4
    reports_dir = tmp_path / "sample_reports"
    script_path = Path(__file__).resolve().parent.parent / "scripts" / "audit_dataset.py"
    cmd = [
        sys.executable,
        str(script_path),
        str(dataset_dir),
        "--output-dir",
        str(reports_dir),
        "--sample-size",
        "4",
        "--report-name",
        "sample_test"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    assert res.returncode == 0

    with open(reports_dir / "sample_test.json", "r", encoding="utf-8") as jf:
        saved_json = json.load(jf)
    assert len(saved_json["sampled_tiff_radiometry"]) == 4


def test_no_cv2_imported():
    """Verify that audit_dataset.py has zero references to cv2."""
    script_path = Path(__file__).resolve().parent.parent / "scripts" / "audit_dataset.py"
    content = script_path.read_text(encoding="utf-8")
    assert "cv2" not in content, "Found cv2 reference in audit_dataset.py!"
