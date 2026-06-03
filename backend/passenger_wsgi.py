import os
import sys

# Add the application path to python's import path
sys.path.insert(0, os.path.dirname(__file__))

# Import the FastAPI application
from app.main import app
from a2wsgi import ASGIMiddleware

# Create WSGI application for Phusion Passenger
application = ASGIMiddleware(app)
