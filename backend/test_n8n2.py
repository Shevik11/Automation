import httpx
import asyncio
import json

API = "http://194.44.193.90:5679"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmI2MmQxMi05ZjcyLTQ2Y2UtYjdhNS00ZjBiZTU1NGE3MDQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcxMTA4NTE5fQ.taRWHnfZJCDS13TjWIcw7AeVLVwqYSSP7uv7L8LO3pg"
HEADERS = {"X-N8N-API-KEY": KEY}
WF_ID = "UCafkxFrXJ9R3kXu"

async def main():
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{API}/api/v1/workflows/{WF_ID}", headers=HEADERS, timeout=10)
        d = r.json()
        
        # Find webhook nodes
        nodes = d.get("nodes", [])
        for node in nodes:
            if "webhook" in node.get("type", "").lower() or "webhook" in node.get("name", "").lower():
                print(f"Webhook node: name={node.get('name')}, type={node.get('type')}")
                params = node.get("parameters", {})
                print(f"  path: {params.get('path')}")
                print(f"  httpMethod: {params.get('httpMethod')}")
                print(f"  options: {params.get('options')}")
                wh_id = node.get("webhookId")
                print(f"  webhookId: {wh_id}")
                print()

        # Try webhook on the n8n API port (5679) directly
        webhook_path = "92d49b70-e031-4987-bc66-f9e7259bb769"
        urls_to_try = [
            f"{API}/webhook/{webhook_path}",
            f"{API}/webhook-test/{webhook_path}",
            f"http://194.44.193.90:5679/webhook/{webhook_path}",
        ]
        for url in urls_to_try:
            try:
                r2 = await c.post(url, json={"keywords":"test","location":"Kyiv"}, timeout=5)
                print(f"POST {url}: status={r2.status_code}, body={r2.text[:200]}")
            except Exception as e:
                print(f"POST {url}: ERROR={str(e)[:100]}")

asyncio.run(main())
