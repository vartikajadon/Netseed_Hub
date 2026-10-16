import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app as fastapi_app
from app.database.session import Base, get_db
import app.models.all_models
from app.models.all_models import User, Program, Batch, Student

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Global Seed Users for tests
    admin = User(id="usr-admin-001", email="admin@netlink.org", full_name="Admin Test", role="SUPER_ADMIN", is_active=True)
    hr = User(id="usr-hr-001", email="hr@netlink.org", full_name="HR Test", role="HR", is_active=True)
    mentor1 = User(id="usr-men-001", email="mentor1@netlink.org", full_name="Lead Mentor 1", role="MENTOR", is_active=True)
    mentor2 = User(id="usr-men-002", email="mentor2@netlink.org", full_name="Lead Mentor 2", role="MENTOR", is_active=True)
    non_mentor = User(id="usr-user-001", email="user1@netlink.org", full_name="Regular User", role="STUDENT", is_active=True)
    student1 = User(id="usr-student-001", email="student1@netlink.org", full_name="Student One", role="STUDENT", is_active=True)
    student2 = User(id="usr-student-002", email="student2@netlink.org", full_name="Student Two", role="STUDENT", is_active=True)
    
    db.add_all([admin, hr, mentor1, mentor2, non_mentor, student1, student2])
    db.commit()
    db.close()
    
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(fastapi_app)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
