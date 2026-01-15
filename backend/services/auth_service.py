from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.user import User
from utils.security import verify_password, get_password_hash, create_access_token
from schemas.auth import UserCreate, UserResponse
from datetime import timedelta
from app.config import settings
from services.workflow_service import create_default_workflow_for_user, create_saved_preset
from schemas.workflow import SavedPresetCreate
import logging

logger = logging.getLogger(__name__)


def get_user_by_email(db: Session, email: str) -> User | None:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user_data: UserCreate) -> User:
    """Create a new user and automatically create default workflow"""
    try:
        logger.info(f"Creating user: {user_data.email}")
        
        # Check if user already exists
        existing_user = get_user_by_email(db, user_data.email)
        if existing_user:
            logger.warning(f"User already exists: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        logger.info(f"Hashing password for: {user_data.email}")
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password
        )
        logger.info(f"Saving user to DB: {user_data.email}")
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"User created successfully: {db_user.id}")
        
        # Automatically create default workflow for new user
        try:
            logger.info(f"Creating default workflow for user: {db_user.id}")
            default_workflow = create_default_workflow_for_user(db, db_user)
            logger.info(f"Default workflow created for user: {db_user.id}")

            # Create some default presets for the new user
            try:
                logger.info(f"Creating default presets for user: {db_user.id}")
                default_presets = [
                    {
                        "preset_name": "Пошук вакансій у Києві",
                        "workflow_config_id": default_workflow.id,
                        "keywords": "Python developer",
                        "location": "Київ"
                    },
                    {
                        "preset_name": "Пошук вакансій у Львові",
                        "workflow_config_id": default_workflow.id,
                        "keywords": "Frontend developer",
                        "location": "Львів"
                    },
                    {
                        "preset_name": "Пошук вакансій у Харкові",
                        "workflow_config_id": default_workflow.id,
                        "keywords": "DevOps engineer",
                        "location": "Харків"
                    }
                ]

                for preset_data in default_presets:
                    preset_create = SavedPresetCreate(**preset_data)
                    create_saved_preset(db, db_user, preset_create)
                    logger.info(f"Created preset '{preset_data['preset_name']}' for user {db_user.id}")

                logger.info(f"Default presets created for user: {db_user.id}")
            except Exception as e:
                logger.exception(f"Could not create default presets for user {db_user.id}: {str(e)}")

        except Exception as e:
            logger.exception(f"Could not create default workflow for user {db_user.id}: {str(e)}")
        
        return db_user
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Create user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
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
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    return access_token

