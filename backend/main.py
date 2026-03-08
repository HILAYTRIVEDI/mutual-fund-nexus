import os
import asyncio
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from nse_auth import NSEAPIAuthEngine

# Load environment variables (from frontend .env for now)
load_dotenv("../.env")

app = FastAPI(title="RuaCapital Backend")

# Initialize Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use Service Role for backend bypass RLS

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    print("WARNING: Supabase URL or Key not found.")
    supabase = None

auth_engine = NSEAPIAuthEngine()

class SyncResponse(BaseModel):
    status: str
    message: str

@app.get("/")
def read_root():
    return {"status": "ruacapital backend is running"}

@app.post("/sync/nav", response_model=SyncResponse)
async def sync_daily_nav(background_tasks: BackgroundTasks):
    """
    Triggers the download of the Scheme Master API daily to update
    the current_nav of all mutual_funds in our Supabase DB.
    """
    background_tasks.add_task(process_nav_sync)
    return {"status": "success", "message": "NAV sync task started in background"}

@app.post("/sync/settlements", response_model=SyncResponse)
async def sync_settlements(background_tasks: BackgroundTasks):
    """
    Polls NSE Order Status API to check which records in pending_settlements 
    have completed, then moves them to settlement_archive.
    """
    background_tasks.add_task(process_settlement_sync)
    return {"status": "success", "message": "Settlement poll task started in background"}


async def process_nav_sync():
    print("Starting NAV Sync...")
    try:
        # Example API call structure for Scheme Master Download
        # Currently placeholder path until we confirm the exact Master Download endpoint
        async with auth_engine.get_client() as client:
            # response = await client.get("/nsemfdesk/api/v2/reports/scheme_master")
            # response.raise_for_status()
            # data = response.json()
            
            # Simulated updating DB:
            # for row in data:
            #     supabase.table("mutual_funds").update({"current_nav": row["nav"], "last_updated": "now()"}).eq("code", row["scheme_code"]).execute()
            pass
        print("NAV Sync Complete.")
    except Exception as e:
        print(f"NAV Sync Failed: {e}")


async def process_settlement_sync():
    print("Starting Settlement Sync...")
    try:
        if not supabase:
            return

        # 1. Fetch pending settlements
        pending = supabase.table("pending_settlements").select("*").in_("status", ["processing", "pending_nse_confirmation"]).execute()
        
        async with auth_engine.get_client() as client:
            for item in pending.data:
                # 2. Check Order Status or Redemption Report via NSE API
                # Example:
                # payload = {"transaction_id": item["transaction_id"]}
                # response = await client.post("/nsemfdesk/api/v2/reports/order_status", json=payload)
                # status = response.json().get("status")

                # Simulated success completion
                status = "COMPLETED" 

                if status == "COMPLETED":
                    # 3. Move to Archive
                    archive_data = {
                        "user_id": item["user_id"],
                        "scheme_code": item["scheme_code"],
                        "original_transaction_id": item["transaction_id"],
                        "units_sold": item["units_sold"],
                        "settled_amount": item["expected_amount"], # Or matched from NSE response
                        "sell_date": item["sell_date"],
                    }
                    supabase.table("settlement_archive").insert(archive_data).execute()
                    
                    # 4. Remove from Pending
                    supabase.table("pending_settlements").delete().eq("id", item["id"]).execute()
        print("Settlement Sync Complete.")
    except Exception as e:
        print(f"Settlement Sync Failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
