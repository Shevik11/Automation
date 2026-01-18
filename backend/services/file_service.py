"""
File service for managing static workflow files
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from utils.workflow_validator import WorkflowImportError, validate_workflow_for_import

logger = logging.getLogger(__name__)


def _sanitize_filename(filename: str) -> str:
    # Reject absolute paths
    if filename.startswith("/") or filename.startswith("\\"):
        raise ValueError(f"Absolute paths not allowed: {filename}")

    # Reject directory traversal attempts
    if ".." in filename or filename.startswith("."):
        raise ValueError(f"Path traversal not allowed: {filename}")

    # Reject null bytes
    if "\x00" in filename:
        raise ValueError(f"Null bytes not allowed: {filename}")

    return filename


def get_static_directory() -> Path:
    """Get the static directory path"""
    return Path(__file__).parent.parent / "static"


def _validate_file_path(filename: str) -> Path:
    # Sanitize filename to prevent basic path traversal
    filename = _sanitize_filename(filename)

    static_dir = get_static_directory()
    file_path = static_dir / filename

    # Resolve both paths to handle symlinks and relative components
    try:
        static_dir_resolved = static_dir.resolve()
        file_path_resolved = file_path.resolve()
    except (OSError, RuntimeError) as e:
        raise ValueError(f"Invalid path: {e}")

    # Ensure file_path is inside static_dir (prevent path traversal)
    try:
        file_path_resolved.relative_to(static_dir_resolved)
    except ValueError:
        raise ValueError(f"Path traversal not allowed: {filename}")

    return file_path


def read_json_from_static(filename: str) -> Dict[str, Any]:
    # Validate filename and get safe file path
    file_path = _validate_file_path(filename)

    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if not filename.endswith(".json"):
        raise ValueError(f"File must be a JSON file: {filename}")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # If it looks like a workflow JSON, validate it
        if isinstance(data, dict) and "nodes" in data:
            validate_workflow_for_import(data)

        return data
    except json.JSONDecodeError as e:
        raise WorkflowImportError(f"Invalid JSON in file {filename}: {str(e)}")
    except Exception as e:
        if isinstance(e, (FileNotFoundError, ValueError, WorkflowImportError)):
            raise
        raise WorkflowImportError(f"Failed to read file {filename}: {str(e)}")


def list_static_json_files() -> List[str]:
    static_dir = get_static_directory()

    if not static_dir.exists():
        return []

    json_files = []
    for file_path in static_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() == ".json":
            json_files.append(file_path.name)

    return sorted(json_files)


def save_json_to_static(filename: str, data: Dict[str, Any]) -> bool:
    # Reject absolute paths and filenames containing parent segments
    if filename.startswith("/") or filename.startswith("\\"):
        raise ValueError(f"Absolute paths not allowed: {filename}")
    if ".." in filename or filename.startswith("."):
        raise ValueError(f"Path traversal not allowed: {filename}")

    # Compute target_path
    static_dir = get_static_directory()
    target_path = (static_dir.resolve() / filename).resolve()

    # Verify target_path is within static directory
    if not target_path.is_relative_to(static_dir.resolve()):
        raise ValueError(f"Path traversal not allowed: {filename}")

    # Replace file_path with target_path
    file_path = target_path

    if not filename.endswith(".json"):
        raise ValueError(f"Filename must end with .json: {filename}")

    # Create static directory if it doesn't exist
    static_dir.mkdir(parents=True, exist_ok=True)

    try:
        # If it looks like a workflow JSON, validate it before saving
        if isinstance(data, dict) and "nodes" in data:
            validate_workflow_for_import(data)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return True
    except Exception as e:
        if isinstance(e, (ValueError, WorkflowImportError)):
            raise
        raise WorkflowImportError(f"Failed to save file {filename}: {str(e)}")


def file_exists_in_static(filename: str) -> bool:
    # Validate filename and get safe file path
    file_path = _validate_file_path(filename)
    return file_path.exists() and file_path.is_file()


def delete_file_from_static(filename: str) -> bool:
    # Validate filename and get safe file path
    file_path = _validate_file_path(filename)

    if not file_path.exists():
        logger.warning(f"File does not exist, cannot delete: {filename}")
        return False

    try:
        file_path.unlink()
        logger.info(f"Successfully deleted file: {filename}")
        return True
    except PermissionError as e:
        logger.error(f"Permission denied when deleting file {filename}: {str(e)}")
        return False
    except OSError as e:
        logger.error(f"OS error when deleting file {filename}: {str(e)}")
        return False
    except Exception as e:
        logger.error(
            f"Unexpected error when deleting file {filename}: {str(e)}", exc_info=True
        )
        return False
