import asyncio
import copy
import logging
from typing import Any, Dict, Optional, Tuple

import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class N8NService:
    def __init__(self):
        self.base_url = settings.N8N_API_URL
        self.api_key = settings.N8N_API_KEY
        self.webhook_url = settings.N8N_WEBHOOK_URL
        self.project_id = settings.N8N_PROJECT_ID
        self.folder_id = settings.N8N_FOLDER_ID

        # Validate configuration
        if not self.base_url:
            logger.warning("N8N_API_URL is not configured - workflow execution may fail")
        else:
            logger.info(f"N8N_API_URL configured: {self.base_url}")
            
        if not self.webhook_url:
            logger.warning("N8N_WEBHOOK_URL is not configured - webhook fallback will fail")
        
        # Log API key status
        if self.api_key:
            logger.info(f"N8N_API_KEY configured (length: {len(self.api_key)})")
        else:
            logger.warning("N8N_API_KEY is not configured - API authentication will fail")
        
        # Log project/folder configuration
        if self.project_id:
            logger.info(f"N8N_PROJECT_ID configured: {self.project_id}")
        else:
            logger.warning("N8N_PROJECT_ID is not configured - workflows will be created in default location")
        if self.folder_id:
            logger.info(f"N8N_FOLDER_ID configured: {self.folder_id}")
        else:
            logger.warning("N8N_FOLDER_ID is not configured - workflows will be created in default location")

        self.headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            self.headers["X-N8N-API-KEY"] = self.api_key

    def _extract_webhook_path_from_json(
        self, workflow_json: Dict[str, Any]
    ) -> Optional[str]:
        nodes = workflow_json.get("nodes", [])
        for node in nodes:
            if node.get("type") == "n8n-nodes-base.webhook":
                params = node.get("parameters", {})
                # Try to get path from webhook node
                path = params.get("path") or params.get("webhookId")
                if path:
                    return path
        return None

    def _extract_execution_id(self, trigger_response: Dict[str, Any]) -> Optional[str]:
        """Extract execution id from different n8n response shapes."""
        if not isinstance(trigger_response, dict):
            return None
        if trigger_response.get("executionId"):
            return str(trigger_response["executionId"])
        if trigger_response.get("id"):
            return str(trigger_response["id"])
        data = trigger_response.get("data")
        if isinstance(data, dict):
            if data.get("executionId"):
                return str(data["executionId"])
            if data.get("id"):
                return str(data["id"])
        return None

    def _map_execution_status(self, execution: Optional[Dict[str, Any]]) -> str:
        """Normalize n8n execution payload to: success|failed|running|unknown."""
        if not execution:
            return "unknown"

        raw_status = str(execution.get("status", "")).lower()
        if raw_status in {"success"}:
            return "success"
        if raw_status in {"error", "failed", "crashed"}:
            return "failed"
        if raw_status in {"running", "new", "waiting"}:
            return "running"

        if execution.get("finished") is True:
            err = (
                execution.get("data", {})
                .get("resultData", {})
                .get("error")
            )
            return "failed" if err else "success"

        return "unknown"

    async def _wait_for_execution_terminal_status(
        self,
        execution_id: str,
        timeout_seconds: int = 45,
        poll_interval_seconds: int = 2,
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """Poll execution until terminal status or timeout."""
        attempts = max(1, timeout_seconds // poll_interval_seconds)
        last_payload: Optional[Dict[str, Any]] = None

        for _ in range(attempts):
            last_payload = await self.get_execution_status(execution_id)
            status = self._map_execution_status(last_payload)
            if status in {"success", "failed"}:
                return status, last_payload
            await asyncio.sleep(poll_interval_seconds)

        return self._map_execution_status(last_payload), last_payload

    async def _wait_for_workflow_active(
        self,
        workflow_id: str,
        timeout_seconds: int = 20,
        poll_interval_seconds: float = 1.0,
    ) -> bool:
        """Wait until workflow is reported active by n8n."""
        attempts = max(1, int(timeout_seconds / poll_interval_seconds))
        for _ in range(attempts):
            wf = await self.get_workflow(workflow_id)
            if isinstance(wf, dict) and wf.get("active") is True:
                return True
            await asyncio.sleep(poll_interval_seconds)
        return False

    async def create_and_run_workflow_once(
        self,
        workflow_json: Dict[str, Any],
        trigger_data: Optional[Dict[str, Any]] = None,
        delete_after_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Create workflow, run exactly once, and return status for persistence/UI.
        """
        # Swap schedule triggers for webhooks so we can trigger on-demand
        workflow_json = self.replace_schedule_trigger_with_webhook(workflow_json)

        valid, validation_error = self.validate_workflow_json(workflow_json)
        if not valid:
            return {
                "success": False,
                "status": "failed",
                "workflow_id": None,
                "execution_id": None,
                "error": validation_error,
            }

        workflow_id: Optional[str] = None
        activated_for_retry = False
        try:
            created = await self.create_workflow_from_json(workflow_json, active=False)
            workflow_id = created.get("id")
            if not workflow_id:
                raise Exception("n8n did not return workflow id")

            if self.folder_id:
                await self.move_workflow_to_folder(workflow_id, self.folder_id)

            # IMPORTANT: resolve webhook path from persisted workflow on n8n (not template only)
            persisted_workflow = await self.get_workflow(workflow_id)
            webhook_path = self._extract_webhook_path_from_json(persisted_workflow or workflow_json)
            logger.info("Resolved webhook path for workflow %s: %s", workflow_id, webhook_path)

            # Pre-activate workflow (webhook workflows need active state for production
            # URLs; non-webhook workflows need it for POST /api/v1/executions)
            activated_for_retry = await self.activate_n8n_workflow(workflow_id)
            if not activated_for_retry:
                raise Exception(f"Failed to activate workflow {workflow_id}")
            became_active = await self._wait_for_workflow_active(workflow_id)
            if not became_active:
                raise Exception(f"Workflow {workflow_id} did not become active in time")
            if webhook_path:
                await asyncio.sleep(1.0)  # webhook registration propagation buffer

            response = None
            last_trigger_err: Optional[Exception] = None

            if webhook_path:
                # Webhook-based workflow: trigger via webhook with retries
                max_attempts = 8
                for attempt in range(max_attempts):
                    try:
                        response = await self.trigger_workflow(
                            workflow_id=workflow_id,
                            data=trigger_data or {},
                            webhook_path=webhook_path,
                            workflow_json=None,
                        )
                        break
                    except Exception as trigger_err:
                        last_trigger_err = trigger_err
                        if not self._is_inactive_webhook_error(str(trigger_err)):
                            raise
                        if attempt < max_attempts - 1:
                            await asyncio.sleep(1.2 * (attempt + 1))
                            continue
                        raise

                if response is None and last_trigger_err:
                    raise last_trigger_err
            else:
                # Schedule-based workflow: activation is the trigger.
                # n8n will execute it on its schedule.
                logger.info(
                    "Workflow %s has no webhook path — activated and waiting for scheduled execution.",
                    workflow_id,
                )
                response = {}

            execution_id = self._extract_execution_id(response)

            status = "unknown"
            execution_payload = None
            if execution_id:
                status, execution_payload = await self._wait_for_execution_terminal_status(execution_id)
            else:
                # If no execution id is returned, assume trigger accepted but status unknown.
                status = "unknown"

            result = {
                "success": status == "success",
                "status": status,  # success | failed | running | unknown
                "workflow_id": workflow_id,
                "execution_id": execution_id,
                "trigger_response": response,
                "execution": execution_payload,
            }

            if delete_after_run and workflow_id:
                # best-effort deactivate before delete
                await self.deactivate_n8n_workflow(workflow_id)
                result["deleted"] = await self.delete_workflow(workflow_id)

            logger.info(
                "One-time workflow run completed: workflow_id=%s execution_id=%s status=%s",
                workflow_id, execution_id, status,
            )
            return result

        except Exception as e:
            logger.error("One-time workflow run failed: workflow_id=%s error=%s", workflow_id, str(e))
            cleanup_deleted = False
            if delete_after_run and workflow_id:
                try:
                    await self.deactivate_n8n_workflow(workflow_id)
                    cleanup_deleted = await self.delete_workflow(workflow_id)
                except Exception:
                    cleanup_deleted = False

            return {
                "success": False,
                "status": "failed",
                "workflow_id": workflow_id,
                "execution_id": None,
                "error": str(e),
                "deleted": cleanup_deleted if delete_after_run else None,
            }
        finally:
            # keep previous behavior only when workflow is intended to remain
            if activated_for_retry and workflow_id and not delete_after_run:
                await self.deactivate_n8n_workflow(workflow_id)

    def _is_inactive_webhook_error(self, err_text: str) -> bool:
        text = (err_text or "").lower()
        return (
            "not registered" in text
            or "must be active" in text
            or "requested webhook" in text
        )

    async def trigger_workflow(
        self,
        workflow_id: str,
        data: Dict[str, Any],
        webhook_path: Optional[str] = None,
        workflow_json: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        # Try to extract webhook path from workflow JSON if not provided
        if not webhook_path and workflow_json:
            webhook_path = self._extract_webhook_path_from_json(workflow_json)

        webhook_urls = self._build_webhook_urls(webhook_path)

        async with httpx.AsyncClient() as client:
            # --- Webhook-based workflows ---
            if webhook_path and webhook_urls:
                webhook_errors = []
                for url in webhook_urls:
                    try:
                        response = await client.post(
                            url, json=data, headers=self.headers, timeout=30.0
                        )
                        response.raise_for_status()
                        body = response.json()
                        logger.info("n8n webhook success. url=%s status=%s body=%s", url, response.status_code, body)
                        return body
                    except httpx.HTTPError as e:
                        resp_status = getattr(e.response, "status_code", None) if hasattr(e, "response") else None
                        resp_text = getattr(e.response, "text", None) if hasattr(e, "response") else str(e)
                        webhook_errors.append((url, resp_status, resp_text))
                        logger.warning("n8n webhook failed. url=%s status=%s text=%s", url, resp_status, resp_text)

                raise Exception(
                    f"Failed to trigger n8n webhook workflow {workflow_id}. "
                    f"webhook_attempts={webhook_errors}"
                )

            # --- Non-webhook workflows: POST /api/v1/workflows/{id}/execute ---
            execute_url = f"{self.base_url}/api/v1/workflows/{workflow_id}/execute"
            try:
                response = await client.post(
                    execute_url, json=data, headers=self.headers, timeout=30.0
                )
                response.raise_for_status()
                body = response.json()
                logger.info("n8n execute success. url=%s status=%s body=%s", execute_url, response.status_code, body)
                return body
            except httpx.HTTPError as e:
                resp_status = getattr(e.response, "status_code", None) if hasattr(e, "response") else None
                resp_text = getattr(e.response, "text", None) if hasattr(e, "response") else str(e)
                logger.warning("n8n execute failed. url=%s status=%s text=%s", execute_url, resp_status, resp_text)

            raise Exception(
                f"Failed to trigger n8n workflow {workflow_id}. "
                f"POST {execute_url} failed (status={resp_status})"
            )

    def _build_webhook_urls(self, webhook_path: Optional[str]) -> list[str]:
        """Build webhook URL candidates from the n8n base URL and a webhook path.

        Uses ``self.base_url`` (N8N_API_URL) which is always the clean host:port
        (e.g. ``http://host:5679``).  ``self.webhook_url`` (N8N_WEBHOOK_URL) may
        contain a legacy full webhook URL and is only used as a last-resort
        fallback when no ``webhook_path`` is provided.
        """
        if not webhook_path:
            # No path — fall back to the literal N8N_WEBHOOK_URL if set
            if self.webhook_url:
                return [self.webhook_url.rstrip("/")]
            return []

        if not self.base_url:
            return []

        host = self.base_url.rstrip("/")
        path = webhook_path.lstrip("/")

        return [
            f"{host}/webhook/{path}",
            f"{host}/webhook-test/{path}",
        ]

    async def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/api/v1/executions/{execution_id}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=10.0)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError:
                return None

    async def get_n8n_executions_for_workflow(self, workflow_id: str) -> list:
        """Get recent executions from n8n for a specific workflow ID."""
        url = f"{self.base_url}/api/v1/executions"
        params = {"workflowId": workflow_id, "limit": 20}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, params=params, timeout=15.0)
                response.raise_for_status()
                data = response.json()
                return data.get("data", data) if isinstance(data, dict) else data
            except httpx.HTTPError as e:
                logger.warning("Failed to get n8n executions for workflow %s: %s", workflow_id, str(e))
                return []

    async def cancel_execution(self, execution_id: str) -> bool:
        url = f"{self.base_url}/api/v1/executions/{execution_id}/stop"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=self.headers, timeout=10.0)
                response.raise_for_status()
                return True
            except httpx.HTTPError:
                return False

    async def create_workflow_from_json(
        self, workflow_json: Dict[str, Any], active: bool = False
    ) -> Dict[str, Any]:
        """Create a workflow on n8n, sanitizing the JSON to only include expected fields.
        
        Workflows are created as inactive. Use activate_n8n_workflow() and
        move_workflow_to_folder() after creation to activate and place in the right folder.
        """
        url = f"{self.base_url}/api/v1/workflows"

        # Sanitize workflow JSON - only keep fields that n8n API accepts
        # Remove any custom fields we added for local tracking
        # Note: 'active' field is read-only and cannot be set even during creation
        sanitized = {
            "name": workflow_json.get("name"),
            "nodes": workflow_json.get("nodes", []),
            "connections": workflow_json.get("connections", {}),
            "settings": workflow_json.get("settings", {}),
        }
        
        # Remove None values and empty dicts to avoid "additional properties" error
        sanitized = {k: v for k, v in sanitized.items() if v not in (None, {})}
        
        # Note: n8n REST API doesn't support projectId/folderId in workflow creation payload.
        # Folder placement is handled by move_workflow_to_folder() called from activate_workflow().

        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Creating workflow with sanitized JSON. Fields: {list(sanitized.keys())}")
                if self.project_id and self.folder_id:
                    logger.info(
                        f"Workflow will be created in default location first, "
                        f"then moved to folder {self.folder_id} and activated by activate_workflow()."
                    )
                response = await client.post(
                    url, json=sanitized, headers=self.headers, timeout=30.0
                )
                logger.info(f"Create workflow response status: {response.status_code}")
                if response.status_code >= 400:
                    logger.error(f"Create workflow error response: {response.text}")
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
        self, workflow_id: str, workflow_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.put(
                    url, json=workflow_json, headers=self.headers, timeout=30.0
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

    async def get_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=10.0)
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError:
                return None

    async def delete_workflow(self, workflow_id: str) -> bool:
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(url, headers=self.headers, timeout=10.0)
                if response.status_code == 404:
                    return False
                response.raise_for_status()
                return True
            except httpx.HTTPError:
                return False

    async def activate_n8n_workflow(self, workflow_id: str) -> bool:
        """Activate a workflow on n8n via POST /activate endpoint"""
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}/activate"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=self.headers, timeout=15.0)
                if response.status_code >= 400:
                    logger.error(
                        "Failed to activate workflow %s on n8n: status=%s, body=%s",
                        workflow_id, response.status_code, response.text,
                    )
                    return False
                logger.info("Successfully activated workflow %s on n8n", workflow_id)
                return True
            except httpx.HTTPError as e:
                logger.error("HTTP error activating workflow %s: %s", workflow_id, str(e))
                return False

    async def deactivate_n8n_workflow(self, workflow_id: str) -> bool:
        """Deactivate a workflow on n8n via POST /deactivate endpoint"""
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}/deactivate"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=self.headers, timeout=15.0)
                if response.status_code >= 400:
                    logger.error(
                        "Failed to deactivate workflow %s on n8n: status=%s, body=%s",
                        workflow_id, response.status_code, response.text,
                    )
                    return False
                logger.info("Successfully deactivated workflow %s on n8n", workflow_id)
                return True
            except httpx.HTTPError as e:
                logger.error("HTTP error deactivating workflow %s: %s", workflow_id, str(e))
                return False

    async def move_workflow_to_folder(self, workflow_id: str, folder_id: str) -> bool:
        """Move a workflow to a specific project/folder on n8n.
        
        n8n transfer API requires 'destinationProjectId'.
        We use N8N_PROJECT_ID as the destination project.
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}/transfer"
        # n8n requires destinationProjectId for the transfer endpoint
        destination_project_id = self.project_id
        if not destination_project_id:
            logger.warning("N8N_PROJECT_ID not configured, cannot move workflow %s", workflow_id)
            return False
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.put(
                    url,
                    json={"destinationProjectId": destination_project_id},
                    headers=self.headers,
                    timeout=15.0,
                )
                if response.status_code >= 400:
                    logger.warning(
                        "Failed to move workflow %s to project %s: status=%s, body=%s",
                        workflow_id, destination_project_id, response.status_code, response.text,
                    )
                    return False
                logger.info("Successfully moved workflow %s to project %s", workflow_id, destination_project_id)
                return True
            except httpx.HTTPError as e:
                logger.warning("HTTP error moving workflow %s to project: %s", workflow_id, str(e))
                return False

    async def activate_workflow(self, workflow_id: str, active: bool = True, workflow_json: Dict[str, Any] = None):
        """Interface rewritten:
        - active=True  => create workflow and run it one time, return success/failed
        - active=False => deactivate/delete existing workflow
        """
        # Check if n8n API is configured
        if not self.base_url:
            logger.error(
                "N8N_API_URL is not configured. Cannot manage workflow %s.",
                workflow_id,
            )
            return False, None

        async with httpx.AsyncClient() as client:
            try:
                # Check if workflow exists
                get_url = f"{self.base_url}/api/v1/workflows/{workflow_id}"
                get_response = await client.get(
                    get_url,
                    headers=self.headers,
                    timeout=10.0,
                )
                workflow_exists = get_response.status_code == 200
                
                if active:
                    if not workflow_json:
                        logger.error(
                            "Cannot run workflow once for %s: workflow JSON is required",
                            workflow_id,
                        )
                        return False, None

                    run_once = await self.create_and_run_workflow_once(
                        workflow_json=workflow_json,
                        trigger_data={},
                        delete_after_run=True,  # execute once, then remove from n8n
                    )

                    logger.info(
                        "Run-once result for workflow %s: status=%s execution_id=%s deleted=%s",
                        run_once.get("workflow_id"),
                        run_once.get("status"),
                        run_once.get("execution_id"),
                        run_once.get("deleted"),
                    )
                    return bool(run_once.get("success")), run_once.get("workflow_id")

                else:
                    # DEACTIVATION: Just delete the workflow
                    if not workflow_exists:
                        logger.info("Workflow %s doesn't exist on n8n, nothing to deactivate", workflow_id)
                        return True, None
                    
                    # First deactivate on n8n, then delete
                    logger.info("Deactivating workflow %s on n8n", workflow_id)
                    await self.deactivate_n8n_workflow(workflow_id)
                    
                    logger.info("Deleting workflow %s from n8n", workflow_id)
                    delete_url = f"{self.base_url}/api/v1/workflows/{workflow_id}"
                    delete_response = await client.delete(
                        delete_url,
                        headers=self.headers,
                        timeout=10.0,
                    )
                    
                    if delete_response.status_code >= 400:
                        logger.error(
                            "Failed to delete workflow %s (status %s): %s",
                            workflow_id, delete_response.status_code, delete_response.text,
                        )
                        return False, None
                    
                    logger.info("Successfully deactivated and deleted workflow %s", workflow_id)
                    return True, None
                
            except httpx.HTTPError as e:
                status_code = getattr(e.response, "status_code", "unknown") if hasattr(e, "response") else "unknown"
                error_text = getattr(e.response, "text", str(e)) if hasattr(e, "response") else str(e)
                logger.error(
                    "HTTPError managing workflow %s (active=%s): status=%s, error=%s",
                    workflow_id, active, status_code, error_text,
                )
                return False, None
            except Exception as e:
                logger.error(
                    "Unexpected error managing workflow %s (active=%s): %s",
                    workflow_id, active, str(e),
                )
                return False, None

    @staticmethod
    def replace_schedule_trigger_with_webhook(workflow_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Replace any n8n-nodes-base.scheduleTrigger node with an
        n8n-nodes-base.webhook node so the workflow can be triggered
        on-demand via HTTP instead of waiting for a cron schedule.

        Preserves the node id, position and name so that existing
        connections in the ``connections`` dict remain valid.

        Returns a deep copy — the original dict is never mutated.
        """
        workflow = copy.deepcopy(workflow_json)
        for i, node in enumerate(workflow.get("nodes", [])):
            if node.get("type") != "n8n-nodes-base.scheduleTrigger":
                continue

            webhook_node = {
                "parameters": {
                    "httpMethod": "POST",
                    "path": node["id"],  # use the original node id as the webhook path
                    "options": {},
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": node.get("position", [0, 0]),
                "id": node["id"],
                "name": node.get("name", "Webhook"),
                "webhookId": node["id"],
            }
            workflow["nodes"][i] = webhook_node
        return workflow

    @staticmethod
    def inject_user_id_into_workflow(workflow_json: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        """
        Replace the `={{ $json.user_id }}` N8N expression in every Postgres upsert node
        with the actual integer user_id before uploading the workflow instance to N8N.

        This ensures the Schedule Trigger (which has no webhook context) still writes
        the correct user_id into linkedin_results without needing any post-processing.

        Returns a deep copy — the original dict is never mutated.
        """
        _USER_ID_EXPR = "={{ $json.user_id }}"
        workflow = copy.deepcopy(workflow_json)
        for node in workflow.get("nodes", []):
            if node.get("type") != "n8n-nodes-base.postgres":
                continue
            params = node.get("parameters", {})
            if params.get("operation") != "upsert":
                continue
            value = params.get("columns", {}).get("value", {})
            if value.get("user_id") == _USER_ID_EXPR:
                value["user_id"] = user_id
        return workflow

    def validate_workflow_json(
        self, workflow_json: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
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
