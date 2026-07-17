import asyncio
import os
import sys
from dotenv import load_dotenv

# Ensure backend directory is in the import path
app_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, app_dir)

# Load environment variables
load_dotenv(os.path.join(app_dir, ".env"))

from app.scheduler import run_retention_sweep, run_classification_sweep, run_embedding_backfill, run_dco_sweep

async def main():
    print("--- Starting Scheduled Sweeps ---")
    
    print("1. Running Retention Sweep...")
    try:
        await run_retention_sweep()
    except Exception as e:
        print(f"Error in Retention Sweep: {e}")
        
    print("2. Running Classification Sweep...")
    try:
        await run_classification_sweep()
    except Exception as e:
        print(f"Error in Classification Sweep: {e}")
        
    print("3. Running Embedding Backfill...")
    try:
        await run_embedding_backfill()
    except Exception as e:
        print(f"Error in Embedding Backfill: {e}")
        
    print("4. Running DCO Sweep...")
    try:
        await run_dco_sweep()
    except Exception as e:
        print(f"Error in DCO Sweep: {e}")
        
    print("--- All Sweeps Completed Successfully ---")

if __name__ == "__main__":
    asyncio.run(main())
