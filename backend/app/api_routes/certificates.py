import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, Student, IssuedCertificate
from app.schemas.lifecycle_extensions_schemas import CertificateCreate, CertificateResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/certificates", tags=["Certificates & Credentials"])

def serialize_certificate(cert: IssuedCertificate) -> CertificateResponse:
    issuer_name = cert.issuer.full_name if cert.issuer else None
    return CertificateResponse(
        id=cert.id,
        title=cert.title,
        certificate_type=cert.certificate_type,
        recipient_student_id=cert.recipient_student_id,
        recipient_name=cert.recipient_name,
        recipient_roll_no=cert.recipient_roll_no,
        issue_date=cert.issue_date,
        credential_id=cert.credential_id,
        issued_by_name=issuer_name,
        description=cert.description,
        file_url=cert.file_url,
        file_name=cert.file_name,
        status=cert.status,
        created_at=cert.created_at
    )

@router.get("", response_model=List[CertificateResponse])
def list_certificates(
    recipient_student_id: Optional[str] = None,
    certificate_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(IssuedCertificate)

    if current_user.role == "STUDENT":
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile:
            return []
        query = query.filter(IssuedCertificate.recipient_student_id == student_profile.id)
    elif recipient_student_id:
        query = query.filter(IssuedCertificate.recipient_student_id == recipient_student_id)

    if certificate_type:
        query = query.filter(IssuedCertificate.certificate_type == certificate_type)

    if search:
        q = f"%{search.lower()}%"
        query = query.filter(
            (IssuedCertificate.title.ilike(q)) |
            (IssuedCertificate.recipient_name.ilike(q)) |
            (IssuedCertificate.credential_id.ilike(q))
        )

    certs = query.order_by(IssuedCertificate.issue_date.desc()).all()
    return [serialize_certificate(c) for c in certs]


@router.get("/my-certificates", response_model=List[CertificateResponse])
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "STUDENT":
        return []

    student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student_profile:
        return []

    certs = db.query(IssuedCertificate).filter(
        IssuedCertificate.recipient_student_id == student_profile.id
    ).order_by(IssuedCertificate.issue_date.desc()).all()

    return [serialize_certificate(c) for c in certs]


@router.post("", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
def issue_certificate(
    payload: CertificateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Creates/imports a certificate and issues it to a recipient with name/roll number.
    Generates a unique verifiable credential ID.
    """
    recipient_student = None
    recipient_name = payload.recipient_name.strip()
    recipient_roll_no = payload.recipient_roll_no

    if payload.recipient_student_id:
        recipient_student = db.query(Student).filter(Student.id == payload.recipient_student_id).first()
        if not recipient_student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student ID '{payload.recipient_student_id}' not found."
            )
        
        # Enforce Mentor Certificate Approval Lock
        if not recipient_student.certificate_approved_by_mentor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Certificate issuance is locked for {recipient_student.roll_number}. "
                    "The assigned mentor must first click 'Release Certificate' before HR can generate and issue credentials."
                )
            )

        if recipient_student.user:
            recipient_name = recipient_student.user.full_name
        recipient_roll_no = recipient_student.roll_number

    # Generate Credential ID if not provided
    credential_id = payload.credential_id
    if not credential_id or not credential_id.strip():
        date_str = datetime.utcnow().strftime("%Y")
        unique_suffix = uuid.uuid4().hex[:6].upper()
        credential_id = f"NETLINK-CERT-{date_str}-{unique_suffix}"

    cert = IssuedCertificate(
        id=str(uuid.uuid4()),
        title=payload.title.strip(),
        certificate_type=payload.certificate_type,
        recipient_student_id=payload.recipient_student_id,
        recipient_name=recipient_name,
        recipient_roll_no=recipient_roll_no,
        issue_date=payload.issue_date,
        credential_id=credential_id,
        issued_by=current_user.id,
        description=payload.description,
        file_url=payload.file_url,
        file_name=payload.file_name,
        status="ISSUED",
        created_at=datetime.utcnow()
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)

    # Notify student
    if recipient_student:
        create_notification(
            db=db,
            title=f"Certificate Awarded: {cert.title}",
            message=f"Congratulations! You have been awarded the '{cert.title}' (Credential ID: {cert.credential_id}). Check your dashboard to view/download.",
            notification_type="CERTIFICATE_ISSUED",
            user_id=recipient_student.user_id,
            link_url="/student"
        )

    return serialize_certificate(cert)


@router.delete("/{certificate_id}")
def delete_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    cert = db.query(IssuedCertificate).filter(IssuedCertificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    db.delete(cert)
    db.commit()
    return {"message": "Certificate record deleted."}
