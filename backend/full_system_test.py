import asyncio
import uuid
import httpx
import traceback
from datetime import datetime

async def test_system():
    base_url = 'http://localhost:8000/api/v1'
    
    print('Testing Login...')
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # 1. Login
            resp = await client.post(f'{base_url}/auth/login', data={'username': 'admin@spidersmart.com', 'password': 'admin123'})
            if resp.status_code != 200:
                print(f'Login failed: {resp.status_code} - {resp.text}')
                return
            token = resp.json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            print('Login Success!')

            # 2. Create Record
            print('\nTesting Record Creation & Auto-classification...')
            box_code = 'T' + str(uuid.uuid4().hex[:10]).upper()
            file_code = 'F' + str(uuid.uuid4().hex[:12]).upper()
            record_data = {
                'box_barcode': box_code,
                'file_barcode': file_code,
                'entity': 'Spider Smart',
                'entity_code': 11,
                'department': 'Finance',
                'location': 'Rack A1',
                'description': '2024 invoice for tax audit - spider smart invoice',
                'record_date': '2024-01-01',
                'tags': []
            }
            resp = await client.post(f'{base_url}/records/', json=record_data, headers=headers)
            if resp.status_code != 201:
                print(f'Create failed: {resp.status_code} - {resp.text}')
                return
            record = resp.json()
            record_id = record['id']
            print(f'Record Created: {record_id}')
            print(f'Tags: {record.get("tags")}')

            # 3. Optimistic Locking
            print('\nTesting Optimistic Locking...')
            updated_data = record_data.copy()
            updated_data['description'] = 'Updated description'
            
            # Conflict test
            resp = await client.put(f'{base_url}/records/{record_id}', json=updated_data, headers={**headers, 'If-Match': '2000-01-01T00:00:00Z'})
            print(f'Optimistic Locking (Conflict): Status {resp.status_code} (Expected 409)')
            
            # Success test
            resp = await client.put(f'{base_url}/records/{record_id}', json=updated_data, headers={**headers, 'If-Match': record['updated_at']})
            if resp.status_code == 200:
                print('Update Success with ETag!')
            else:
                print(f'Update failed: {resp.status_code} - {resp.text}')

            # 4. Reports
            print('\nTesting Reports Stats...')
            resp = await client.get(f'{base_url}/reports/stats', headers=headers)
            if resp.status_code == 200:
                print(f'Dashboard Stats: {resp.json()}')
            
            # 5. eDiscovery
            print('\nTesting eDiscovery Export...')
            resp = await client.post(f'{base_url}/ediscovery/export-zip', json=[record_id], headers=headers)
            if resp.status_code == 200:
                print('ZIP Export Success!')
            
            print('\nSYSTEM TEST COMPLETE!')

        except Exception as e:
            print(f'Test Error: {e}')
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_system())
