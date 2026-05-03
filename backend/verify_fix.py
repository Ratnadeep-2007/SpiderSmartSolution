import asyncio
import httpx
import uuid

async def verify_fix():
    base_url = 'http://localhost:8001/api/v1'
    
    async with httpx.AsyncClient() as client:
        # 1. Login
        resp = await client.post(f'{base_url}/auth/login', data={'username': 'admin@spidersmart.com', 'password': 'admin123'})
        token = resp.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # 2. Get master data
        et_resp = await client.get(f'{base_url}/master/entity-types', headers=headers)
        entity_type_id = et_resp.json()[0]['id']
        
        e_resp = await client.get(f'{base_url}/master/entities', headers=headers)
        entity = e_resp.json()[0]
        entity_id = entity['id']
        entity_code = entity['entity_code']
        
        d_resp = await client.get(f'{base_url}/master/departments', params={'entity_id': entity_id}, headers=headers)
        department_id = d_resp.json()[0]['id']
        
        # 3. Create Record
        box_code = 'B' + str(uuid.uuid4().hex[:10]).upper()
        file_code = 'F' + str(uuid.uuid4().hex[:12]).upper()
        
        record_data = {
            'entity_type_id': entity_type_id,
            'entity_id': entity_id,
            'department_id': department_id,
            'entity_code': entity_code,
            'location': 'Rack A1',
            'box_barcode': box_code,
            'file_barcode': file_code,
            'description': 'Verification record for MissingGreenlet fix',
            'record_date': '2026-04-30',
            'tags': ['test', 'fix-verify']
        }
        
        print('Attempting to create record...')
        resp = await client.post(f'{base_url}/records/', json=record_data, headers=headers)
        if resp.status_code != 201:
             print(f'FAILED CREATE: {resp.status_code} - {resp.text}')
             return
             
        record_id = resp.json()["id"]
        updated_at = resp.json()["updated_at"]
        print(f'SUCCESS: Record created. ID: {record_id}')
        
        # 4. Update Record (Optimistic Locking)
        edit_data = {
            'description': 'Updated description for MissingGreenlet fix verification'
        }
        
        print(f'Attempting to edit record {record_id}...')
        # Test Conflict (wrong If-Match)
        conflict_resp = await client.put(
            f'{base_url}/records/{record_id}', 
            json=edit_data, 
            headers={**headers, 'If-Match': '2000-01-01T00:00:00Z'}
        )
        print(f'Conflict Test: Status {conflict_resp.status_code} (Expected 409)')
        
        # Test Success
        success_resp = await client.put(
            f'{base_url}/records/{record_id}', 
            json=edit_data, 
            headers={**headers, 'If-Match': updated_at}
        )
        if success_resp.status_code == 200:
            print('SUCCESS: Record updated and serialized correctly!')
            print(f'New Version: {success_resp.json()["version"]}')
        else:
            print(f'FAILED EDIT: {success_resp.status_code} - {success_resp.text}')

if __name__ == '__main__':
    asyncio.run(verify_fix())
