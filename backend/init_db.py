"""
Script для ініціалізації бази даних.
Використання: python init_db.py
"""
from app.database import engine, Base
from models.user import User
from models.workflow import WorkflowConfig, SavedPreset
from models.execution import WorkflowExecution


def init_db():
    """Створює всі таблиці в базі даних"""
    print("Створення таблиць в базі даних...")
    Base.metadata.create_all(bind=engine)
    print("Таблиці успішно створені!")


if __name__ == "__main__":
    init_db()

