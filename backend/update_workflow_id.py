"""
Script to update workflow n8n_workflow_id in the database
Run this to sync the database with the actual n8n workflow ID
"""
import asyncio
from sqlalchemy import create_engine, text
from app.config import settings

def update_workflow_id():
    """Update the n8n_workflow_id for a specific workflow"""
    engine = create_engine(settings.DATABASE_URL)
    
    # Get the latest workflow ID from n8n (you saw it in the logs: 5IvCPrx5mywo904m)
    # Update this with the actual workflow ID from n8n
    new_n8n_id = "5IvCPrx5mywo904m"  # Change this to the correct ID from logs
    old_n8n_id = "HktEMZCrvc7shbAF"
    
    with engine.connect() as conn:
        # First, check current value
        result = conn.execute(
            text("SELECT id, workflow_name, n8n_workflow_id FROM workflow_configs WHERE n8n_workflow_id = :old_id"),
            {"old_id": old_n8n_id}
        )
        workflows = result.fetchall()
        
        if not workflows:
            print(f"No workflows found with n8n_workflow_id = {old_n8n_id}")
            return
        
        print(f"Found {len(workflows)} workflow(s) to update:")
        for wf in workflows:
            print(f"  - ID: {wf[0]}, Name: {wf[1]}, Current n8n_id: {wf[2]}")
        
        # Update the workflow ID
        conn.execute(
            text("UPDATE workflow_configs SET n8n_workflow_id = :new_id WHERE n8n_workflow_id = :old_id"),
            {"new_id": new_n8n_id, "old_id": old_n8n_id}
        )
        conn.commit()
        
        print(f"\n✅ Updated workflow n8n_workflow_id from {old_n8n_id} to {new_n8n_id}")
        
        # Verify the update
        result = conn.execute(
            text("SELECT id, workflow_name, n8n_workflow_id FROM workflow_configs WHERE n8n_workflow_id = :new_id"),
            {"new_id": new_n8n_id}
        )
        updated = result.fetchall()
        
        print(f"\nVerification - workflows with new ID:")
        for wf in updated:
            print(f"  - ID: {wf[0]}, Name: {wf[1]}, n8n_id: {wf[2]}")

if __name__ == "__main__":
    update_workflow_id()
