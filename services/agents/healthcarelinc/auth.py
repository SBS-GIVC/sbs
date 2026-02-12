"""
JWT Authentication and Role-Based Access Control
"""

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os

from models import HealthcareUser, UserRole

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


class TokenData(BaseModel):
    """JWT token payload"""
    username: str
    user_id: int
    role: str
    exp: datetime


class LoginRequest(BaseModel):
    """Login request"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """Login response"""
    access_token: str
    token_type: str
    user: dict


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> TokenData:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        exp: datetime = datetime.fromtimestamp(payload.get("exp"))
        
        if username is None or user_id is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(username=username, user_id=user_id, role=role, exp=exp)
    
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = None
) -> TokenData:
    """
    Get current authenticated user from JWT token
    
    Dependency injection for protected routes
    """
    token = credentials.credentials
    token_data = decode_token(token)
    
    # Check if token is expired
    if token_data.exp < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_data


class RoleChecker:
    """
    Role-based access control dependency
    
    Usage:
        @app.get("/admin")
        async def admin_route(current_user: TokenData = Depends(RoleChecker(["admin"]))):
            ...
    """
    
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(self.allowed_roles)}"
            )
        return current_user


# Pre-defined role checkers
require_patient = RoleChecker([UserRole.PATIENT.value])
require_provider = RoleChecker([UserRole.PROVIDER.value])
require_payer = RoleChecker([UserRole.PAYER.value])
require_admin = RoleChecker([UserRole.ADMIN.value])

# Combined role checkers
require_patient_or_provider = RoleChecker([
    UserRole.PATIENT.value,
    UserRole.PROVIDER.value
])

require_payer_or_admin = RoleChecker([
    UserRole.PAYER.value,
    UserRole.ADMIN.value
])

require_any_authenticated = RoleChecker([
    UserRole.PATIENT.value,
    UserRole.PROVIDER.value,
    UserRole.PAYER.value,
    UserRole.ADMIN.value
])


def authenticate_user(db: Session, username: str, password: str) -> Optional[HealthcareUser]:
    """
    Authenticate user with username and password
    
    Returns user object if authentication succeeds, None otherwise
    """
    try:
        user = db.query(HealthcareUser).filter(
            HealthcareUser.username == username,
            HealthcareUser.is_active == True
        ).first()
        
        if not user:
            return None
        
        if not verify_password(password, user.password_hash):
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user
    
    except Exception:
        return None


def create_user_response(user: HealthcareUser) -> dict:
    """Create safe user response (without password hash)"""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value,
        "full_name": user.full_name,
        "phone": user.phone,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None
    }
