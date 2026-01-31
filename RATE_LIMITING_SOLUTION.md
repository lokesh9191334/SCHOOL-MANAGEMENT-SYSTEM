# Rate Limiting Solutions

## Problem
If you're getting "Rate limit exceeded" errors like:
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 51 seconds.",
  "retry_after": 51
}
```

## Solutions

### Option 1: Use the No-Rate-Limit Server (Recommended for Development)

**Using PowerShell:**
```powershell
.\manage.ps1 dev:noratelimit
```

**Using Batch File:**
```cmd
start_no_rate_limit.bat
```

**Manual:**
```cmd
set DISABLE_RATE_LIMITING=true
set FLASK_DEBUG=true
python app.py
```

### Option 2: Use Development Mode (Higher Limits)
```powershell
.\manage.ps1 dev
```

### Option 3: Environment Variables
Set these environment variables before starting:
- `DISABLE_RATE_LIMITING=true` - Completely disables rate limiting
- `FLASK_DEBUG=true` - Enables debug mode with higher limits

## Rate Limiting Configuration

### Current Limits:
- **Production:** 60 requests/minute, 1000 requests/hour
- **Development:** 1000 requests/minute, 50000 requests/hour  
- **Disabled:** No limits

### How to Configure Permanently
Edit `config.py` and modify:
```python
DISABLE_RATE_LIMITING = os.environ.get('DISABLE_RATE_LIMITING', 'True').lower() == 'true'
```

## Why This Happens
The rate limiter prevents abuse by limiting requests per IP address. During development, you might make many requests quickly while testing, triggering the limit.

## Troubleshooting
1. Make sure environment variables are set BEFORE starting the server
2. Check the server logs for rate limiting messages
3. Use the `start_no_rate_limit.bat` file for easiest solution
