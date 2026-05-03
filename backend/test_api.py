import asyncio
from httpx import AsyncClient
from app.main import app

async def test_categories():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # We need a token because it Depends(get_current_user)
        # For simplicity, let's bypass auth in a mock or just try to see if it even gets to the handler
        response = await ac.get("/api/v1/master/categories")
        print(f"Status: {response.status_code}")
        if response.status_code == 500:
            print(f"Error Detail: {response.text}")
        else:
            print(f"Data: {response.json()}")

if __name__ == "__main__":
    asyncio.run(test_categories())
