"""
Workflow JSON validation utilities
"""
from typing import Dict, Any, Tuple, List, Optional
import re


class InvalidWorkflowJsonError(Exception):
    """Raised when workflow JSON is invalid"""
    def __init__(self, message: str, errors: Optional[List[str]] = None):
        self.message = message
        self.errors = errors or []
        super().__init__(self.message)


class WorkflowImportError(Exception):
    """Raised when workflow import fails"""
    pass


class N8NWorkflowError(Exception):
    """Raised when n8n workflow operation fails"""
    pass


def validate_n8n_workflow_json(json_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate n8n workflow JSON structure
    
    Args:
        json_data: Workflow JSON to validate
        
    Returns:
        Tuple of (is_valid, list_of_errors)
        - is_valid: True if valid, False otherwise
        - list_of_errors: List of error messages
    """
    errors: List[str] = []
    
    # Check if json_data is a dictionary
    if not isinstance(json_data, dict):
        errors.append("Workflow JSON must be a dictionary")
        return False, errors
    
    # Check required fields
    required_fields = ["name", "nodes"]
    for field in required_fields:
        if field not in json_data:
            errors.append(f"Missing required field: '{field}'")
    
    # If name is missing, we can't continue validation
    if "name" not in json_data:
        return False, errors
    
    # Validate name is a string and not empty
    name = json_data.get("name")
    if not isinstance(name, str):
        errors.append("Field 'name' must be a string")
    elif len(name.strip()) == 0:
        errors.append("Field 'name' cannot be empty")
    
    # Validate nodes
    nodes = json_data.get("nodes")
    if nodes is None:
        errors.append("Field 'nodes' is required")
        return False, errors
    
    if not isinstance(nodes, list):
        errors.append("Field 'nodes' must be a list")
        return False, errors
    
    if len(nodes) == 0:
        errors.append("Workflow must have at least one node")
        return False, errors
    
    # Validate each node structure
    for i, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(f"Node at index {i} must be a dictionary")
            continue
        
        # Check required node fields
        if "id" not in node:
            errors.append(f"Node at index {i} is missing required field 'id'")
        elif not isinstance(node.get("id"), str):
            errors.append(f"Node at index {i} field 'id' must be a string")
        
        if "type" not in node:
            errors.append(f"Node at index {i} is missing required field 'type'")
        elif not isinstance(node.get("type"), str):
            errors.append(f"Node at index {i} field 'type' must be a string")
        
        # Validate node name if present
        if "name" in node and not isinstance(node.get("name"), str):
            errors.append(f"Node at index {i} field 'name' must be a string if provided")
    
    # Validate connections if present
    connections = json_data.get("connections")
    if connections is not None:
        if not isinstance(connections, dict):
            errors.append("Field 'connections' must be a dictionary if provided")
        else:
            # Basic validation of connections structure
            for node_name, connection_data in connections.items():
                if not isinstance(node_name, str):
                    errors.append(f"Connection key '{node_name}' must be a string")
                if not isinstance(connection_data, dict):
                    errors.append(f"Connection data for '{node_name}' must be a dictionary")
    
    # Validate settings if present
    settings = json_data.get("settings")
    if settings is not None and not isinstance(settings, dict):
        errors.append("Field 'settings' must be a dictionary if provided")
    
    # Validate active field if present
    active = json_data.get("active")
    if active is not None and not isinstance(active, bool):
        errors.append("Field 'active' must be a boolean if provided")
    
    is_valid = len(errors) == 0
    return is_valid, errors


def extract_workflow_metadata(json_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract metadata from workflow JSON
    
    Args:
        json_data: Workflow JSON
        
    Returns:
        Dictionary with metadata: name, id, versionId, active
    """
    metadata = {
        "name": json_data.get("name", "Unnamed Workflow"),
        "id": json_data.get("id"),
        "versionId": json_data.get("versionId"),
        "active": json_data.get("active", True),
        "nodes_count": len(json_data.get("nodes", [])),
        "has_connections": bool(json_data.get("connections")),
    }
    
    return metadata


def sanitize_workflow_json(json_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove sensitive credentials from workflow JSON
    
    Args:
        json_data: Workflow JSON to sanitize
        
    Returns:
        Sanitized workflow JSON
    """
    import copy
    sanitized = copy.deepcopy(json_data)
    
    # List of sensitive field patterns to remove or mask
    sensitive_patterns = [
        r'password',
        r'secret',
        r'api[_-]?key',
        r'token',
        r'credential',
        r'auth',
    ]
    
    def sanitize_dict(obj: Dict[str, Any], path: str = "") -> None:
        """Recursively sanitize dictionary"""
        keys_to_remove = []
        
        for key, value in obj.items():
            current_path = f"{path}.{key}" if path else key
            key_lower = key.lower()
            
            # Check if key matches sensitive patterns
            for pattern in sensitive_patterns:
                if re.search(pattern, key_lower, re.IGNORECASE):
                    keys_to_remove.append(key)
                    break
            
            # Recursively sanitize nested dictionaries
            if isinstance(value, dict):
                sanitize_dict(value, current_path)
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        sanitize_dict(item, f"{current_path}[{i}]")
        
        # Remove sensitive keys
        for key in keys_to_remove:
            del obj[key]
    
    # Sanitize nodes
    if "nodes" in sanitized and isinstance(sanitized["nodes"], list):
        for node in sanitized["nodes"]:
            if isinstance(node, dict):
                # Remove credentials from node
                if "credentials" in node:
                    # Keep credential IDs but remove actual credential data
                    if isinstance(node["credentials"], dict):
                        for cred_type, cred_data in node["credentials"].items():
                            if isinstance(cred_data, dict):
                                # Keep only id and name, remove other fields
                                sanitized_cred = {}
                                if "id" in cred_data:
                                    sanitized_cred["id"] = cred_data["id"]
                                if "name" in cred_data:
                                    sanitized_cred["name"] = cred_data["name"]
                                node["credentials"][cred_type] = sanitized_cred
                
                # Sanitize parameters
                if "parameters" in node and isinstance(node["parameters"], dict):
                    sanitize_dict(node["parameters"], f"nodes[{sanitized['nodes'].index(node)}].parameters")
    
    # Sanitize top-level fields
    sanitize_dict(sanitized)
    
    return sanitized


def validate_workflow_for_import(json_data: Dict[str, Any]) -> None:
    """
    Validate workflow JSON and raise exception if invalid
    
    Args:
        json_data: Workflow JSON to validate
        
    Raises:
        InvalidWorkflowJsonError: If workflow JSON is invalid
    """
    is_valid, errors = validate_n8n_workflow_json(json_data)
    
    if not is_valid:
        error_message = "Workflow JSON validation failed"
        if errors:
            error_message += f": {', '.join(errors[:3])}"  # Show first 3 errors
            if len(errors) > 3:
                error_message += f" and {len(errors) - 3} more"
        
        raise InvalidWorkflowJsonError(error_message, errors)

