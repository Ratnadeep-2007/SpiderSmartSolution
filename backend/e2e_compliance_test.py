import httpx
import asyncio
import json
import uuid

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@spidersmart.com"
ADMIN_PASS = "admin123"

async def test_lifecycle():
    async with httpx.AsyncClient(timeout=60.0) as client:
        print("--- 1. AUTHENTICATION ---")
        login_res = await client.post(f"{BASE_URL}/auth/login", data={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASS
        })
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.\n")

        print("--- 2. INGESTION (Dynamic Record Creation) ---")
        # Fetch record types to get a valid ID
        rt_res = await client.get(f"{BASE_URL}/master/record-types", headers=headers)
        record_type = rt_res.json()[0] # Grab "Box Record" seeded earlier
        
        # Get master IDs
        et_resp = await client.get(f"{BASE_URL}/master/entity-types", headers=headers)
        entity_type_id = et_resp.json()[0]['id']
        
        e_resp = await client.get(f"{BASE_URL}/master/entities", headers=headers)
        entity = e_resp.json()[0]
        entity_id = entity['id']
        entity_code = entity['entity_code']
        
        d_resp = await client.get(f"{BASE_URL}/master/departments", params={'entity_id': entity_id}, headers=headers)
        department_id = d_resp.json()[0]['id']

        box_barcode = f"BOX{str(uuid.uuid4().int)[:8]}"
        file_barcode = f"FILE{str(uuid.uuid4().int)[:9]}"
        
        payload = {
            "record_type_id": record_type["id"],
            "entity_type_id": entity_type_id,
            "entity_id": entity_id,
            "department_id": department_id,
            "entity": entity["name"],
            "entity_code": entity_code,
            "department": "Finance",
            "location": "Warehouse A",
            "box_barcode": box_barcode,
            "file_barcode": file_barcode,
            "description": "Compliance Test Record - Confidential Assets",
            "record_date": "2024-01-01",
            "custom_fields": {
                "invoice_number": "INV-12345",
                "amount": 100.00,
                "project_code": "PROJ-999",
                "is_confidential": True
            }
        }
        
        create_res = await client.post(f"{BASE_URL}/records/", json=payload, headers=headers)
        if create_res.status_code != 201:
            print(f"Creation failed: {create_res.text}")
            return
        
        record = create_res.json()
        record_id = record["id"]
        print(f"Record created successfully. ID: {record_id}, Version: {record['version']}, Due: {record['retention_due_date']}\n")

        print("--- 3. SEARCH (Full-Text & Faceted) ---")
        search_res = await client.get(f"{BASE_URL}/search/?q=Confidential&entity={entity['name']}", headers=headers)
        found_records = search_res.json()["data"]
        found_match = any(r["id"] == record_id for r in found_records)
        print(f"FTS Search for 'Confidential': {'SUCCESS' if found_match else 'FAILED'}\n")

        print("--- 4. VERSIONING (Update Snapshot) ---")
        update_payload = {"description": "Updated Compliance Test Record"}
        update_res = await client.put(f"{BASE_URL}/records/{record_id}", json=update_payload, headers=headers)
        updated_record = update_res.json()
        print(f"Record updated. New Version: {updated_record['version']}, Description: {updated_record['description']}\n")

        print("--- 5. COMPLIANCE (Legal Hold & Disposition Block) ---")
        # Apply Hold
        hold_res = await client.post(f"{BASE_URL}/retention/records/{record_id}/legal-hold", 
                                    json={"reason": "Audit in progress"}, headers=headers)
        print(f"Applied Legal Hold: {hold_res.json()['legal_hold']}")
        
        # Try to dispose (should fail because status is ACTIVE and on HOLD)
        dispose_res = await client.post(f"{BASE_URL}/retention/records/{record_id}/dispose", headers=headers)
        print(f"Disposal attempt (should be 400): {dispose_res.status_code} - {dispose_res.json().get('detail')}\n")

        print("--- 6. AUDIT INTEGRITY ---")
        # Verify the whole chain
        verify_res = await client.get(f"{BASE_URL}/audit/verify", headers=headers)
        integrity = verify_res.json()
        print(f"Tamper-Evident Verification: {'VALID' if integrity['is_valid'] else 'INVALID'}")
        print(f"Total Logs Checked: {integrity['total_checked']}\n")

if __name__ == "__main__":
    asyncio.run(test_lifecycle())
