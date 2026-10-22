from fastapi import APIRouter
from app.api_routes.auth_routes import router as auth_router
from app.api_routes.admin import router as admin_router
from app.api_routes.users import router as users_router
from app.api_routes.programs import router as programs_router
from app.api_routes.batches import router as batches_router
from app.api_routes.geofences import router as geofences_router
from app.api_routes.students import router as students_router
from app.api_routes.devices import router as devices_router
from app.api_routes.consents import router as consents_router
from app.api_routes.attendance import router as attendance_router
from app.api_routes.institution_trainings import router as institution_trainings_router
from app.api_routes.calendar import router as calendar_router
from app.api_routes.no_dues import router as no_dues_router
from app.api_routes.fees import router as fees_router
from app.api_routes.letters import router as letters_router
from app.api_routes.certificates import router as certificates_router
from app.api_routes.notifications import router as notifications_router
from app.api_routes.trainer_leaves import router as trainer_leaves_router
from app.api_routes.tasks import router as tasks_router, submission_router
from app.api_routes.feedbacks import router as feedbacks_router
from app.api_routes.curriculum import router as curriculum_router
from app.api_routes.assessments import router as assessments_router, submission_router as assessment_submissions_router
from app.api_routes.trainer_feedbacks import router as trainer_feedbacks_router
from app.api_routes.projects import router as projects_router

api_router = APIRouter(prefix="/api/v1")




api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(users_router)
api_router.include_router(programs_router)
api_router.include_router(batches_router)
api_router.include_router(geofences_router)
api_router.include_router(students_router)
api_router.include_router(devices_router)
api_router.include_router(consents_router)
api_router.include_router(attendance_router)
api_router.include_router(institution_trainings_router)
api_router.include_router(calendar_router)
api_router.include_router(no_dues_router)
api_router.include_router(fees_router)
api_router.include_router(letters_router)
api_router.include_router(certificates_router)
api_router.include_router(notifications_router)
api_router.include_router(trainer_leaves_router)
api_router.include_router(tasks_router)
api_router.include_router(submission_router)
api_router.include_router(feedbacks_router)
api_router.include_router(curriculum_router)
api_router.include_router(assessments_router)
api_router.include_router(assessment_submissions_router)
api_router.include_router(trainer_feedbacks_router)
api_router.include_router(projects_router)

@api_router.get("/system/time", summary="Standardized Platform Time Endpoint")


def get_standardized_time():
    import time
    from datetime import datetime, timezone
    now_utc = datetime.now(timezone.utc)
    return {
        "utc_iso": now_utc.isoformat(),
        "timestamp_ms": int(time.time() * 1000),
        "source": "Standardized Synchronized Network Time (UTC / Google NTP aligned)",
    }
