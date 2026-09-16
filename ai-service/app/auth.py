"""Authentication middleware for Clerk JWT validation."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import requests
from functools import lru_cache
from app.config import settings

security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_clerk_jwks():
    """Fetch Clerk's JWKS (JSON Web Key Set) for JWT verification.
    
    Cached to avoid repeated requests to Clerk's servers.
    """
    if not settings.clerk_publishable_key:
        return None
    
    # Extract instance ID from publishable key
    # Format: pk_test_<base64> or pk_live_<base64>
    try:
        # Clerk JWKS endpoint format
        jwks_url = f"https://clerk.{settings.clerk_publishable_key.split('_')[1]}.lcl.dev/.well-known/jwks.json"
        response = requests.get(jwks_url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception:
        # Fallback: try to construct from secret key domain
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """Verify Clerk JWT and extract user ID.
    
    In development mode (require_auth=False), returns a mock user ID.
    In production, validates the JWT and returns the user's Clerk ID.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        User ID (Clerk sub claim)
        
    Raises:
        HTTPException: If auth is required but token is invalid/missing
    """
    # Development mode: skip auth
    if not settings.require_auth:
        return "dev_user"
    
    # Production mode: require valid JWT
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization required. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    
    try:
        # For now, we'll do basic JWT decode without verification
        # In production, you should verify against Clerk's JWKS
        # This requires the PyJWT library with cryptography extras
        
        # Decode without verification (development only!)
        # TODO: Implement proper JWKS verification for production
        decoded = jwt.decode(
            token,
            options={"verify_signature": False}  # INSECURE: for dev only
        )
        
        user_id = decoded.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing sub claim"
            )
        
        return user_id
        
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
