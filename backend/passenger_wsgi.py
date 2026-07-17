import os
import sys
import time

# ---------------------------------------------------------
# 1. SETUP LOGGING PATH & DIAGNOSTICS HELPER
# ---------------------------------------------------------
app_dir = os.path.dirname(__file__)
DEBUG_LOG_PATH = os.path.join(app_dir, "passenger_debug.log")

def log_debug(message):
    """Writes diagnostic messages with timestamps to passenger_debug.log and console (stderr)"""
    formatted = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}"
    try:
        with open(DEBUG_LOG_PATH, "a") as f:
            f.write(formatted + "\n")
    except Exception:
        pass
    try:
        sys.stderr.write(formatted + "\n")
        sys.stderr.flush()
    except Exception:
        pass

log_debug("--- Passenger Startup Initiated ---")
log_debug(f"sys.executable: {sys.executable}")
log_debug(f"sys.argv: {sys.argv}")


# ---------------------------------------------------------
# 2. SAFE INTERPRETER RE-EXECUTION (VIRTUALENV ENFORCEMENT)
# ---------------------------------------------------------
# We point to the virtual environment's Python executable.
INTERP = "/home/sspowertechnet/virtualenv/backend/3.10/bin/python"
real_interp = os.path.realpath(INTERP)
real_exec = os.path.realpath(sys.executable)

log_debug(f"Resolved INTERP: {real_interp}")
log_debug(f"Resolved sys.executable: {real_exec}")

# CloudLinux runs Python via a wrapper (/usr/share/l.v.e-manager/utils/python_wrapper).
# Comparing normalized realpaths ensures we don't trigger recursive os.execl calls.
# We also use the '_PASSENGER_REEXEC' env variable as a secondary guardrail.
if real_exec != real_interp and not os.environ.get("_PASSENGER_REEXEC"):
    log_debug("Interpreter mismatch detected. Re-executing process with virtualenv python...")
    os.environ["_PASSENGER_REEXEC"] = "1"
    try:
        os.execl(real_interp, real_interp, *sys.argv)
    except Exception as e:
        log_debug(f"Failed to re-execute process: {e}")

# ---------------------------------------------------------
# 3. ENVIRONMENT AND CONFIGURATION BOOTSTRAPPING
# ---------------------------------------------------------
log_debug("Loading environment variables (.env)...")
from dotenv import load_dotenv
load_dotenv(os.path.join(app_dir, '.env'))

# Diagnosing .htaccess content
try:
    htaccess_path = "/home/sspowertechnet/public_html/.htaccess"
    if os.path.exists(htaccess_path):
        log_debug(f"Reading {htaccess_path}...")
        with open(htaccess_path, "r") as f:
            content = f.read()
        log_debug(f"\n--- .htaccess content start ---\n{content}\n--- .htaccess content end ---")
    else:
        log_debug(".htaccess file not found in public_html")
except Exception as e:
    log_debug(f"Failed to read .htaccess: {e}")

# Diagnosing Database Reachability dynamically from DATABASE_URL

try:
    db_url = os.environ.get("DATABASE_URL") or ""
    log_debug(f"Raw DATABASE_URL from env: {db_url[:45]}... (truncated for security)")
    
    # Parse host/port from URL using urllib
    from urllib.parse import urlparse
    parsed = urlparse(db_url)
    db_host = parsed.hostname
    db_port = parsed.port or 5432
    
    log_debug(f"Parsed Database Host: '{db_host}', Port: {db_port}")
    
    if db_host:
        log_debug(f"Testing TCP connection to parsed host ({db_host}:{db_port})...")
        import socket
        sock = socket.create_connection((db_host, db_port), timeout=3.0)
        sock.close()
        log_debug("TCP connection to database host was successful!")
    else:
        log_debug("TCP connection check skipped: No host found in DATABASE_URL")
except Exception as e:
    log_debug(f"TCP connection check FAILED: {e}")


# CRITICAL: We must disable the background scheduler (APScheduler) in the main web thread.
log_debug("Disabling background scheduler...")
os.environ["RUN_SCHEDULER"] = "false"

# Add the application path to Python's import path
sys.path.insert(0, app_dir)


# ---------------------------------------------------------
# 4. IMPORT AND WRAP THE FASTAPI ASGI APPLICATION
# ---------------------------------------------------------
log_debug("Importing app.main...")
try:
    from app.main import app
    log_debug("app.main imported successfully.")
except Exception as e:
    log_debug(f"Error importing app.main: {e}")
    raise

try:
    _wsgi_app = None


    class LoggingGenerator:
        def __init__(self, iterable):
            self.iterator = iter(iterable)
        def __iter__(self):
            return self
        def __next__(self):
            try:
                return next(self.iterator)
            except StopIteration:
                raise
            except Exception as e:
                log_debug(f"[GENERATOR-ERROR] Exception during response iteration: {e}")
                import traceback
                log_debug(traceback.format_exc())
                raise

    # ---------------------------------------------------------
    # 5. ENTRYPOINT WRAPPER (WSGI CALLABLE)
    # ---------------------------------------------------------
    def application(environ, start_response):
        """The main entrypoint callable that Phusion Passenger triggers for requests."""
        # Clean up path prefix: merge SCRIPT_NAME into PATH_INFO so FastAPI matches the full /api/v1 prefix
        script_name_orig = environ.get('SCRIPT_NAME', '')
        if script_name_orig:
            environ['PATH_INFO'] = script_name_orig + environ.get('PATH_INFO', '')
            environ['SCRIPT_NAME'] = ''
            
        path_info = environ.get('PATH_INFO', '')
        script_name = environ.get('SCRIPT_NAME', '')

        
        # A. Direct WSGI Bypass for Health Checks:
        # If the health check is requested, bypass FastAPI and a2wsgi entirely.
        # This isolates event loop deadlocks and returns a response instantly.
        if path_info in ('/health', '/api/v1/health') or path_info.endswith('/health'):
            log_debug(f"Direct WSGI Health Check Intercepted: {path_info}")
            status = '200 OK'
            body = b'{"status": "healthy_direct_wsgi"}'
            response_headers = [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(body)))
            ]
            start_response(status, response_headers)
            log_debug("Direct WSGI Health Check responded successfully.")
            return [body]

        # A2. Direct WSGI Bypass for Database Connectivity Test:
        if path_info in ('/db-test', '/api/v1/db-test') or path_info.endswith('/db-test'):
            log_debug(f"Direct WSGI DB Test Intercepted: {path_info}. Connecting to database...")
            try:
                import asyncio
                from sqlalchemy.ext.asyncio import create_async_engine
                from sqlalchemy import text
                from sqlalchemy.pool import NullPool
                
                async def run_query():
                    db_url = os.environ.get("DATABASE_URL") or ""
                    engine = create_async_engine(db_url, poolclass=NullPool)
                    async with engine.connect() as conn:
                        res = await conn.execute(text("SELECT 1"))
                        val = res.scalar()
                    await engine.dispose()
                    return val
                
                loop = asyncio.new_event_loop()
                val = loop.run_until_complete(run_query())
                loop.close()
                
                log_debug(f"Direct WSGI DB Test successful! Result: {val}")
                status = '200 OK'
                body = f'{{"status": "db_test_ok", "result": {val}}}'.encode('utf-8')
            except Exception as db_err:
                log_debug(f"Direct WSGI DB Test FAILED: {db_err}")
                import traceback
                log_debug(traceback.format_exc())
                status = '500 Internal Server Error'
                body = f'{{"status": "db_test_failed", "error": "{db_err}"}}'.encode('utf-8')
                
            response_headers = [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(body)))
            ]
            start_response(status, response_headers)
            log_debug("Direct WSGI DB Test responded successfully.")
            return [body]

        # B. Standard Request Routing via a2wsgi:
        global _wsgi_app
        if _wsgi_app is None:
            try:
                log_debug("Initializing ASGIMiddleware dynamically inside request handler (post-fork)...")
                from a2wsgi import ASGIMiddleware
                _wsgi_app = ASGIMiddleware(app, wait_time=3.0)
                log_debug("ASGIMiddleware initialized successfully in worker process.")
            except Exception as init_err:
                log_debug(f"Failed to initialize ASGIMiddleware: {init_err}")
                raise

        log_debug(f"WSGI Request: {environ.get('REQUEST_METHOD')} SCRIPT_NAME='{script_name}' PATH_INFO='{path_info}'")
        
        # Intercept and buffer request body for login/auth requests to diagnose/fix stream hangs
        if 'login' in path_info or 'auth' in path_info:
            try:
                content_length = int(environ.get('CONTENT_LENGTH', 0) or 0)
                content_type = environ.get('CONTENT_TYPE', '')
                log_debug(f"[WSGI-LOGIN] Method: {environ.get('REQUEST_METHOD')} Content-Length: {content_length} Content-Type: '{content_type}'")
                
                wsgi_input = environ.get('wsgi.input')
                if wsgi_input and content_length > 0:
                    log_debug("[WSGI-LOGIN] Reading body from wsgi.input...")
                    body_bytes = wsgi_input.read(content_length)
                    log_debug(f"[WSGI-LOGIN] Read {len(body_bytes)} bytes of body successfully: {body_bytes[:200]}")
                    
                    # Buffer it in memory so a2wsgi can consume it without blocking
                    import io
                    environ['wsgi.input'] = io.BytesIO(body_bytes)
                else:
                    log_debug("[WSGI-LOGIN] Empty body or no wsgi.input stream")
            except Exception as read_err:
                log_debug(f"[WSGI-LOGIN] Failed to read/buffer body: {read_err}")
                
        try:
            res = _wsgi_app(environ, start_response)
            log_debug("WSGI Request processed successfully.")
            return LoggingGenerator(res)
        except Exception as e:
            log_debug(f"WSGI Request failed: {e}")
            raise


except Exception as e:
    log_debug(f"Error wrapping app with ASGIMiddleware: {e}")
    raise
