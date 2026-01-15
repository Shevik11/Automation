"""
File service for managing static workflow files
"""
from typing import Dict, Any, List
from pathlib import Path
import json
from utils.workflow_validator import validate_workflow_for_import, WorkflowImportError


def get_static_directory() -> Path:
    """Get the static directory path"""
    return Path(__file__).parent.parent / "static"


def read_json_from_static(filename: str) -> Dict[str, Any]:
    """
    Read JSON file from static directory
    
    Args:
        filename: Name of the JSON file to read
        
    Returns:
        Parsed JSON data as dictionary
        
    Raises:
        FileNotFoundError: If file doesn't exist
        json.JSONDecodeError: If file contains invalid JSON
        WorkflowImportError: If workflow validation fails
    """
    static_dir = get_static_directory()
    file_path = static_dir / filename
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    if not filename.endswith('.json'):
        raise ValueError(f"File must be a JSON file: {filename}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
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
    """
    List all JSON files in static directory
    
    Returns:
        List of JSON filenames
    """
    static_dir = get_static_directory()
    
    if not static_dir.exists():
        return []
    
    json_files = []
    for file_path in static_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() == '.json':
            json_files.append(file_path.name)
    
    return sorted(json_files)


def save_json_to_static(filename: str, data: Dict[str, Any]) -> bool:
    """
    Save JSON data to static directory
    
    Args:
        filename: Name of the file to save
        data: Dictionary data to save as JSON
        
    Returns:
        True if successful, False otherwise
        
    Raises:
        ValueError: If filename is not a JSON file
        WorkflowImportError: If saving fails
    """
    if not filename.endswith('.json'):
        raise ValueError(f"Filename must end with .json: {filename}")
    
    static_dir = get_static_directory()
    
    # Create static directory if it doesn't exist
    static_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = static_dir / filename
    
    try:
        # If it looks like a workflow JSON, validate it before saving
        if isinstance(data, dict) and "nodes" in data:
            validate_workflow_for_import(data)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        if isinstance(e, (ValueError, WorkflowImportError)):
            raise
        raise WorkflowImportError(f"Failed to save file {filename}: {str(e)}")


def file_exists_in_static(filename: str) -> bool:
    """
    Check if file exists in static directory
    
    Args:
        filename: Name of the file to check
        
    Returns:
        True if file exists, False otherwise
    """
    static_dir = get_static_directory()
    file_path = static_dir / filename
    return file_path.exists() and file_path.is_file()


def delete_file_from_static(filename: str) -> bool:
    """
    Delete file from static directory
    
    Args:
        filename: Name of the file to delete
        
    Returns:
        True if successful, False otherwise
    """
    static_dir = get_static_directory()
    file_path = static_dir / filename
    
    if not file_path.exists():
        return False
    
    try:
        file_path.unlink()
        return True
    except Exception:
        return False

