import httpx
from typing import Optional, Dict, Any, Tuple
from app.config import settings
import logging


logger = logging.getLogger(__name__)


class N8NService:
    def __init__(self):
        self.base_url = settings.N8N_API_URL or "http://localhost:5678"
        self.api_key = settings.N8N_API_KEY
        self.webhook_url = settings.N8N_WEBHOOK_URL
        self.headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            self.headers["X-N8N-API-KEY"] = self.api_key

    def _extract_webhook_path_from_json(self, workflow_json: Dict[str, Any]) -> Optional[str]:
        """Extract webhook path from workflow JSON if webhook node exists"""
        nodes = workflow_json.get("nodes", [])
        for node in nodes:
            if node.get("type") == "n8n-nodes-base.webhook":
                params = node.get("parameters", {})
                # Try to get path from webhook node
                path = params.get("path") or params.get("webhookId")
                if path:
                    return path
        return None

    async def trigger_workflow(
        self,
        workflow_id: str,
        data: Dict[str, Any],
        webhook_path: Optional[str] = None,
        workflow_json: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Trigger n8n workflow via webhook or API.
        For cloud setups where Public API may be disabled, a provided webhook_path
        will be used first.
        
        Args:
            workflow_id: n8n workflow ID
            data: Data to send to workflow (keywords, frequency, location)
            webhook_path: Optional explicit webhook path (if different from workflow_id)
            workflow_json: Optional workflow JSON (to extract webhook path if not provided)
        
        Returns:
            Response from n8n API
        """
        # Try to extract webhook path from workflow JSON if not provided
        if not webhook_path and workflow_json:
            webhook_path = self._extract_webhook_path_from_json(workflow_json)
        
        execute_url = f"{self.base_url}/api/v1/workflows/{workflow_id}/execute"
        webhook_url = self.webhook_url

        # Avoid logging full API key; log length only
        headers_to_log = dict(self.headers)
        if "X-N8N-API-KEY" in headers_to_log:
            headers_to_log["X-N8N-API-KEY"] = f"***len={len(self.api_key)}***"

        logger.info(
            "n8n execute start. url=%s webhook_url=%s data=%s headers=%s",
            execute_url,
            webhook_url,
            data,
            headers_to_log,
        )
        
        async with httpx.AsyncClient() as client:
            # First, try to verify workflow exists
            workflow_check = await self.get_workflow(workflow_id)
            if workflow_check is None:
                logger.warning(
                    f"Workflow {workflow_id} not found via API check, but will try execute/webhook anyway. "
                    f"This might be normal if Public API is disabled."
                )
            # 1) If webhook_path provided, try webhook first (for cloud without Public API)
            if webhook_path:
                logger.info(
                    "Attempting n8n webhook trigger. webhook_path=%s url=%s data=%s",
                    webhook_path,
                    webhook_url,
                    data,
                )
                try:
                    response = await client.post(
                        webhook_url,
                        json=data,
                        headers=self.headers,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    body = response.json()
                    logger.info(
                        "n8n webhook PRIMARY SUCCESS. url=%s status=%s body=%s",
                        webhook_url,
                        response.status_code,
                        body,
                    )
                    return body
                except httpx.HTTPError as e:
                    status_code = getattr(e.response, "status_code", None) if hasattr(e, "response") else None
                    error_text = getattr(e.response, "text", None) if hasattr(e, "response") else None
                    logger.warning(
                        "n8n webhook PRIMARY FAILED. url=%s status=%s error=%s data=%s",
                        webhook_url,
                        status_code,
                        error_text or str(e),
                        data,
                    )
                    # fall through to execute attempt

            # 2) Try execute API
            try:
                response = await client.post(
                    execute_url,
                    json=data,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                body = response.json()
                logger.info(
                    "n8n execute success. url=%s status=%s body=%s",
                    execute_url,
                    response.status_code,
                    body,
                )
                return body
            except httpx.HTTPError as e:
                logger.exception(
                    "n8n execute API failed. url=%s status=%s text=%s data=%s",
                    execute_url,
                    getattr(e.response, "status_code", None) if hasattr(e, "response") else None,
                    getattr(e.response, "text", None) if hasattr(e, "response") else None,
                    data,
                )
                # 3) Fallback to webhook (even if webhook_path was None, use workflow_id)
                try:
                    response = await client.post(
                        webhook_url,
                        json=data,
                        headers=self.headers,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    body = response.json()
                    logger.info(
                        "n8n webhook FALLBACK SUCCESS. url=%s status=%s body=%s",
                        webhook_url,
                        response.status_code,
                        body,
                    )
                    return body
                except httpx.HTTPError as webhook_err:
                    status_code = getattr(webhook_err.response, "status_code", None) if hasattr(webhook_err, "response") else None
                    error_text = getattr(webhook_err.response, "text", None) if hasattr(webhook_err, "response") else None
                    
                    logger.exception(
                        "n8n webhook fallback failed. url=%s status=%s text=%s data=%s", 
                        webhook_url, status_code, error_text, data
                    )
                    
                    # Provide detailed error message
                    execute_status = getattr(e.response, "status_code", None) if hasattr(e, "response") else None
                    if execute_status == 404 and status_code == 404:
                        error_msg = (
                            f"Failed to trigger workflow {workflow_id}: "
                            f"Both API execute and webhook returned 404. "
                            f"This usually means: 1) Webhook node doesn't exist in workflow, "
                            f"2) Webhook path '{webhook_suffix}' is incorrect, or "
                            f"3) Public API is disabled. "
                            f"Please add a Webhook node to the workflow with correct path, "
                            f"or enable Public API (N8N_PUBLIC_API_DISABLED=false)."
                        )
                    else:
                        error_msg = (
                            f"Failed to trigger n8n workflow {workflow_id}: "
                            f"Execute API failed with {execute_status}, "
                            f"webhook fallback failed with {status_code}. "
                            f"Original error: {str(e)}"
                        )
                    raise Exception(error_msg)

    async def get_execution_status(
        self,
        execution_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get execution status from n8n
        
        Args:
            execution_id: n8n execution ID
        
        Returns:
            Execution status data
        """
        url = f"{self.base_url}/api/v1/executions/{execution_id}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError:
                return None

    async def cancel_execution(
        self,
        execution_id: str
    ) -> bool:
        """
        Cancel n8n execution
        
        Args:
            execution_id: n8n execution ID
        
        Returns:
            True if successful
        """
        url = f"{self.base_url}/api/v1/executions/{execution_id}/stop"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                return True
            except httpx.HTTPError:
                return False

    async def create_workflow_from_json(
        self,
        workflow_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new workflow in n8n from JSON configuration
        
        Args:
            workflow_json: Full n8n workflow JSON configuration
            
        Returns:
            Created workflow with ID from n8n
        """
        url = f"{self.base_url}/api/v1/workflows"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json=workflow_json,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                error_detail = "Unknown error"
                try:
                    error_detail = e.response.json().get("message", str(e))
                except:
                    error_detail = str(e)
                raise Exception(f"Failed to create workflow in n8n: {error_detail}")
            except httpx.HTTPError as e:
                raise Exception(f"Failed to create workflow in n8n: {str(e)}")

    async def update_workflow(
        self,
        workflow_id: str,
        workflow_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update existing workflow in n8n
        
        Args:
            workflow_id: n8n workflow ID
            workflow_json: Updated workflow JSON configuration
            
        Returns:
            Updated workflow from n8n
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.put(
                    url,
                    json=workflow_json,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise Exception(f"Workflow {workflow_id} not found in n8n")
                error_detail = "Unknown error"
                try:
                    error_detail = e.response.json().get("message", str(e))
                except:
                    error_detail = str(e)
                raise Exception(f"Failed to update workflow in n8n: {error_detail}")
            except httpx.HTTPError as e:
                raise Exception(f"Failed to update workflow in n8n: {str(e)}")

    async def get_workflow(
        self,
        workflow_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve workflow configuration from n8n
        
        Args:
            workflow_id: n8n workflow ID
            
        Returns:
            Full workflow JSON configuration, or None if not found
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError:
                return None

    async def delete_workflow(
        self,
        workflow_id: str
    ) -> bool:
        """
        Delete workflow from n8n
        
        Args:
            workflow_id: n8n workflow ID
            
        Returns:
            True if successful, False otherwise
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(
                    url,
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 404:
                    return False
                response.raise_for_status()
                return True
            except httpx.HTTPError:
                return False

    async def activate_workflow(
        self,
        workflow_id: str,
        active: bool
    ) -> bool:
        """
        Activate or deactivate workflow in n8n
        
        Args:
            workflow_id: n8n workflow ID
            active: True to activate, False to deactivate
            
        Returns:
            True if successful, False otherwise
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}/activate"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json={"active": active},
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 404:
                    return False
                response.raise_for_status()
                return True
            except httpx.HTTPError:
                return False

    def validate_workflow_json(
        self,
        workflow_json: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate workflow JSON structure
        
        Args:
            workflow_json: Workflow JSON to validate
            
        Returns:
            Tuple of (is_valid, error_message)
            - is_valid: True if valid, False otherwise
            - error_message: Error description if invalid, None if valid
        """
        # Check if workflow_json is a dictionary
        if not isinstance(workflow_json, dict):
            return False, "Workflow JSON must be a dictionary"
        
        # Check required fields
        required_fields = ["name", "nodes"]
        for field in required_fields:
            if field not in workflow_json:
                return False, f"Missing required field: '{field}'"
        
        # Validate name is a string
        if not isinstance(workflow_json.get("name"), str):
            return False, "Field 'name' must be a string"
        
        # Validate nodes is a list
        nodes = workflow_json.get("nodes")
        if not isinstance(nodes, list):
            return False, "Field 'nodes' must be a list"
        
        if len(nodes) == 0:
            return False, "Workflow must have at least one node"
        
        # Validate each node has required fields
        for i, node in enumerate(nodes):
            if not isinstance(node, dict):
                return False, f"Node at index {i} must be a dictionary"
            
            if "id" not in node:
                return False, f"Node at index {i} is missing required field 'id'"
            
            if "type" not in node:
                return False, f"Node at index {i} is missing required field 'type'"
        
        # Validate connections if present (optional but should be dict if exists)
        connections = workflow_json.get("connections")
        if connections is not None and not isinstance(connections, dict):
            return False, "Field 'connections' must be a dictionary if provided"
        
        # All validations passed
        return True, None


# Singleton instance
n8n_service = N8NService()

