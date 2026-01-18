import logging
import traceback

from app.database import get_db
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from models.user import User
from schemas.auth import LoginRequest, RegisterRequest, Token, UserResponse
from services.auth_service import AuthService, _mask_email
from utils.exceptions import raise_authentication_error, raise_registration_error
from utils.logger import auth_logger
from sqlalchemy.orm import Session
from utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=dict)
async def register(
    user_data: RegisterRequest, db: Session = Depends(get_db), request: Request = None
):
    """Register a new user"""
    try:
        auth_logger.log_operation("User registration", "attempted", f"email: {_mask_email(user_data.email)}")
        result = AuthService.register_user(db, user_data)
        auth_logger.log_operation("User registration", "successful", f"user_id: {result['user']['id']}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.log_error(e, "user registration")
raise_registration_error("Registration failed")


@router.post("/login", response_model=dict)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    try:
        auth_logger.log_auth_attempt(credentials.email, success=False)  # Will be success if login works
        result = AuthService.login_user(db, credentials.email, credentials.password)
        if not result:
            auth_logger.log_auth_attempt(credentials.email, success=False)
            raise_authentication_error()

        auth_logger.log_auth_attempt(credentials.email, success=True)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info"""
    return AuthService.get_user_profile(current_user)
