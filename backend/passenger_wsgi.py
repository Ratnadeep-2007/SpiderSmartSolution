import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file using its absolute path
app_dir = os.path.dirname(__file__)
load_dotenv(os.path.join(app_dir, '.env'))

# Add the application path to python's import path
sys.path.insert(0, app_dir)

# Import the FastAPI application
from app.main import app
from a2wsgi import ASGIMiddleware

# Create WSGI application for Phusion Passenger
application = ASGIMiddleware(app)
