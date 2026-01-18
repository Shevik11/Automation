import logging
from datetime import timedelta

from app.config import settings
from models.user import User
from schemas.auth import UserCreate, UserResponse
from services.workflow_service import create_default_workflow_for_user
from sqlalchemy.orm import Session
from utils.exceptions import raise_user_already_exists_error, raise_default_workflow_creation_error
from utils.logger import auth_logger
from utils.security import create_access_token, get_password_hash, verify_password

logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    """Mask email for logging to avoid PII exposure"""
    if "@" not in email:
        return "***@***"
    username, domain = email.split("@", 1)
    if len(username) <= 2:
        masked_username = "*" * len(username)
    else:
        masked_username = username[0] + "*" * (len(username) - 2) + username[-1]
    return f"{masked_username}@{domain}"


def get_user_by_email(db: Session, email: str) -> User | None:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user_data: UserCreate) -> User:
    """Create a new user and automatically create default workflow"""
    try:
        logger.info(f"Creating user: {_mask_email(user_data.email)}")

        # Check if user already exists
        existing_user = get_user_by_email(db, user_data.email)
        if existing_user:
            auth_logger.log_operation("User creation", "failed", f"user already exists: {_mask_email(user_data.email)}")
            raise_user_already_exists_error(user_data.email)

        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(email=user_data.email, password_hash=hashed_password)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"User created successfully: {db_user.id}")

        # Automatically create default workflow for new user
        try:
            logger.info(f"Creating default workflow for user: {db_user.id}")
        except Exception as e:
            logger.exception(
                f"Could not create default workflow for user {db_user.id}: {str(e)}"
            )

        return db_user
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Create user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed"
        )


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Authenticate user with email and password"""
    user = get_user_by_email(db, email)
    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def create_token_for_user(user: User) -> str:
    """Create JWT token for user"""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return access_token


class AuthService:
    @staticmethod
    def register_user(db: Session, user_data: UserCreate) -> dict:
        """Register a new user and return auth response"""
        user = create_user(db, user_data)
        access_token = create_token_for_user(user)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else "",
            },
        }

    @staticmethod
    def login_user(db: Session, email: str, password: str) -> dict:
        """Authenticate user and return auth response"""
        user = authenticate_user(db, email, password)
        if not user:
            return None

        access_token = create_token_for_user(user)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else "",
            },
        }

    @staticmethod
    def get_user_profile(user: User) -> dict:
        """Get user profile data"""
        return {
            "id": user.id,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else "",
        }