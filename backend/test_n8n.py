import httpx
import asyncio

API = "http://194.44.193.90:5679"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmI2MmQxMi05ZjcyLTQ2Y2UtYjdhNS00ZjBiZTU1NGE3MDQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcxMTA4NTE5fQ.taRWHnfZJCDS13TjWIcw7AeVLVwqYSSP7uv7L8LO3pg"
HEADERS = {"X-N8N-API-KEY": KEY}
WF_ID = "UCafkxFrXJ9R3kXu"

async def main():
    async with httpx.AsyncClient() as c:
        # 1. Check workflow exists and is active
        r = await c.get(f"{API}/api/v1/workflows/{WF_ID}", headers=HEADERS, timeout=10)
        d = r.json()
        print(f"GET workflow: status={r.status_code}, active={d.get('active')}, name={d.get('name')}")
        
        # 2. Try execute API
        r2 = await c.post(
            f"{API}/api/v1/workflows/{WF_ID}/execute",
            json={"keywords": "test", "location": "Kyiv"},
            headers=HEADERS,
            timeout=10,
        )
        print(f"POST execute: status={r2.status_code}")
        print(f"  body: {r2.text[:500]}")
        
        # 3. Try /api/v1/executions endpoint (to run workflow)
        r3 = await c.post(
            f"{API}/api/v1/executions",
            json={"workflowId": WF_ID},
            headers=HEADERS,
            timeout=10,
        )
        print(f"POST executions: status={r3.status_code}")
        print(f"  body: {r3.text[:500]}")

asyncio.run(main())
