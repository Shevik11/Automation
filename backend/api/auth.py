from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from utils.dependencies import get_current_user
from services.auth_service import (
    create_user,
    authenticate_user,
    create_token_for_user,
    _mask_email
)
from schemas.auth import (
    LoginRequest,
    RegisterRequest,
    Token,
    UserResponse
)
from models.user import User
import logging
import traceback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=dict)
async def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db),
    request: Request = None
):
    """Register a new user"""
    try:
        logger.info(f"Register attempt for email: {_mask_email(user_data.email)}")
        user = create_user(db, user_data)
        access_token = create_token_for_user(user)
        logger.info(f"User registered successfully: {user.id}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else ""
            }
        }
    except HTTPException as he:
        logger.error(f"HTTPException in register: {he.detail}")
        raise
    except Exception as e:
        logger.error(f"Register error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed"
        )



@router.post("/login", response_model=dict)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login user and return JWT token"""
    try:
        logger.info(f"Login attempt for email: {_mask_email(credentials.email)}")
        user = authenticate_user(db, credentials.email, credentials.password)
        if not user:
            logger.warning(f"Login failed - invalid credentials for: {_mask_email(credentials.email)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_token_for_user(user)
        logger.info(f"User logged in successfully: {user.id}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else ""
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user info"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else ""
    }

