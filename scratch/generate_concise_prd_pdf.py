import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class ConciseNumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' 
    and running headers across all pages except the cover/first page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0F2942"))

        # Running Top Header on pages > 1
        if self._pageNumber > 1:
            self.drawString(45, 755, "NETLINK")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(90, 755, "|   Intern/Trainee Lifecycle Management Platform — Executive PRD")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(45, 747, 567, 747)

        # Running Bottom Footer on all pages
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(45, 42, 567, 42)
        
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#0284C7"))
        self.drawString(45, 30, "NETLINK SOFTWARE GROUP")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(165, 30, "— Product Requirements Document (Core Scope & Future Vision)")
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0F2942"))
        self.drawRightString(567, 30, page_str)
        self.restoreState()


def create_concise_prd_pdf(output_path: str):
    # Printable area: 612 x 792. Margins: 45pt left/right, 48pt top/bottom -> width = 522 pt.
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    # Corporate Color Palette
    c_primary = colors.HexColor("#0F2942")   # Deep Corporate Navy
    c_accent = colors.HexColor("#0284C7")    # Professional Sky Blue
    c_dark = colors.HexColor("#1E293B")      # Slate Dark Text
    c_muted = colors.HexColor("#64748B")     # Muted Gray
    c_light = colors.HexColor("#F8FAFC")     # Soft Surface Background
    c_border = colors.HexColor("#E2E8F0")    # Clean Table Border

    # Typography
    styles.add(ParagraphStyle(
        name='MainTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name='MainSubtitle',
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=c_accent,
        spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        name='SecHeading',
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=c_primary,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='SubHeading',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=c_accent,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='Body',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name='BodyBold',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name='RoleBullet',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=c_dark,
        spaceAfter=2.5,
        leftIndent=12
    ))
    styles.add(ParagraphStyle(
        name='ThStyle',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white
    ))
    styles.add(ParagraphStyle(
        name='TdStyle',
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=c_dark
    ))
    styles.add(ParagraphStyle(
        name='TdStyleBold',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=c_primary
    ))
    styles.add(ParagraphStyle(
        name='BoxText',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_dark
    ))

    story = []

    # =========================================================================
    # PAGE 1: WHAT IT IS, TECH STACK & WHAT IT SOLVES
    # =========================================================================
    # Top Header Pill
    pill_data = [[
        Paragraph("<font color='#0284C7'><b>NETLINK SOFTWARE GROUP</b></font> &nbsp;|&nbsp; <font color='#64748B'>Talent Operations & Platform Architecture</font>", styles['TdStyleBold']),
        Paragraph("<font color='#059669'><b>EXECUTIVE PRD — VERSION 2.4</b></font>", styles['TdStyleBold'])
    ]]
    t_pill = Table(pill_data, colWidths=[362, 160])
    t_pill.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_pill)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Netlink Intern & Trainee Lifecycle Management Platform", styles['MainTitle']))
    story.append(Paragraph("Product Requirements Document — User Workflows, Core Problem Solved & Future Roadmap", styles['MainSubtitle']))

    story.append(HRFlowable(width="100%", thickness=2, color=c_primary, spaceBefore=0, spaceAfter=8))

    # 1. Platform Purpose & Overview
    story.append(Paragraph("1. Platform Purpose & What the Application is Made On", styles['SecHeading']))
    story.append(Paragraph(
        "The <b>Netlink Intern/Trainee Platform</b> is an enterprise web application designed to govern, automate, "
        "and track the end-to-end journey of student interns and graduate trainees—from recruitment, biometric enrollment, "
        "and geofenced attendance, to task assignments, mentoring, fee tracking, institutional college cohorts, and graduation clearance.",
        styles['Body']
    ))

    # Tech Stack Table
    tech_data = [
        [Paragraph("Tier / Technology", styles['ThStyle']), Paragraph("Core Frameworks & Libraries", styles['ThStyle']), Paragraph("Purpose in the Application", styles['ThStyle'])],
        [
            Paragraph("<b>Frontend UI</b>", styles['TdStyleBold']),
            Paragraph("React 18 + TypeScript + Tailwind CSS + Vite", styles['TdStyle']),
            Paragraph("Fast, responsive single-page dashboards (Student, Mentor, HR, Admin), live webcam video capture for face match, GPS query.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Backend API</b>", styles['TdStyleBold']),
            Paragraph("Python 3.11/3.14 + FastAPI + Pydantic V2", styles['TdStyle']),
            Paragraph("High-speed REST API endpoints, server-side RBAC validation, Haversine geofence boundary calculations, daily attendance engine.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Database & Storage</b>", styles['TdStyleBold']),
            Paragraph("PostgreSQL via Supabase + SQLAlchemy ORM", styles['TdStyle']),
            Paragraph("Relational ACID database for 27 normalized tables, cloud object storage for deliverables and generated letters, SQLite local fallback.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Security & Auth</b>", styles['TdStyleBold']),
            Paragraph("Supabase Auth (JWT) + Biometric Vision Layer", styles['TdStyle']),
            Paragraph("Bearer token verification, 512-dimensional facial embedding vectors (no raw photos stored), hardware device fingerprint binding.", styles['TdStyle'])
        ]
    ]
    t_tech = Table(tech_data, colWidths=[100, 185, 237])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 8))

    # 2. What Our App Solves
    story.append(Paragraph("2. What Our Application Solves (Problem vs. Solution)", styles['SecHeading']))
    story.append(Paragraph(
        "Before this platform, managing dozens of training cohorts, hundreds of college trainees, and multiple corporate locations "
        "resulted in operational bottlenecks, proxy attendance, delayed grading, and compliance risks.",
        styles['Body']
    ))

    problem_solution_data = [
        [Paragraph("Key Operational Challenge", styles['ThStyle']), Paragraph("The Problem in Traditional Systems", styles['ThStyle']), Paragraph("How the Netlink Platform Solves It", styles['ThStyle'])],
        [
            Paragraph("<b>Attendance Fraud & Proxy Punches</b>", styles['TdStyleBold']),
            Paragraph("Trainees share credentials or use fake GPS apps to mark attendance while absent.", styles['TdStyle']),
            Paragraph("<b>Zero-Trust Verification:</b> Strict 100m server-side Haversine geofence + live facial matching (0.82 score) + primary device fingerprint lock.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Fragmented Trainee Management</b>", styles['TdStyleBold']),
            Paragraph("Syllabus, attendance, tasks, and grades live in scattered spreadsheets and chat groups.", styles['TdStyle']),
            Paragraph("<b>Unified Single Source of Truth:</b> Centralized portal for syllabus topics, submissions, deadlines, and skill evaluations.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Manual Exit & No-Dues Clearance</b>", styles['TdStyleBold']),
            Paragraph("Graduating trainees run between mentors, lab coordinators, and accounts to collect physical signatures.", styles['TdStyle']),
            Paragraph("<b>Automated 4-Stage Digital Clearance:</b> Sequential online sign-off (Mentor -> Assets -> Accounts -> HR) with automated certificates.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Institutional College Tracking</b>", styles['TdStyleBold']),
            Paragraph("Difficulty tracking MoU terms, college coordinators, and cohort fees across partner universities.", styles['TdStyle']),
            Paragraph("<b>Dedicated Institutional Module:</b> Tracks MoU dates, college student rosters, batch performance, and installment fee payments.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Compliance & Audit Gaps</b>", styles['TdStyleBold']),
            Paragraph("No verifiable trail for manual attendance overrides, status changes, or document issuance.", styles['TdStyle']),
            Paragraph("<b>Immutable Security Audit Logs:</b> Every administrative action, override, and role change is permanently logged with timestamps.", styles['TdStyle'])
        ]
    ]
    t_ps = Table(problem_solution_data, colWidths=[120, 180, 222])
    t_ps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_ps)

    # Force PageBreak to start Users on Page 2
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: USERS & THEIR WORKING (PART 1: STUDENTS & MENTORS)
    # =========================================================================
    story.append(Paragraph("3. Users & Their Working (Roles & Responsibilities — Part 1)", styles['SecHeading']))
    story.append(Paragraph(
        "The platform organizes all operations around four core user roles. Each role has a dedicated dashboard, "
        "strict data privacy boundaries, and specific day-to-day workflows.",
        styles['Body']
    ))
    story.append(Spacer(1, 4))

    # ROLE 1: STUDENT / TRAINEE
    story.append(Paragraph("3.1 Student / Trainee — Everyday Working & Functions", styles['SubHeading']))
    story.append(Paragraph(
        "<b>Who They Are:</b> College interns, technical trainees, and apprentices participating in Netlink training tracks (e.g. Full Stack, Cloud, QA).<br/>"
        "<b>Privacy Boundary:</b> Students can strictly only view and modify their own records. They have zero access to other students' data.",
        styles['Body']
    ))
    student_workflow = [
        ("1. Biometric Onboarding & Device Binding", "Upon first login, the trainee reads and grants explicit GDPR/DPDP biometric consent. The system captures their live facial embedding template and binds their primary laptop/mobile device fingerprint."),
        ("2. Daily Geofenced Attendance Punching", "To punch in, the trainee opens the app on-campus. The camera captures their live face and GPS coordinates. If within 100 meters of the venue and face matches (>= 0.82), the punch is recorded. Cumulative 5+ hours (300 mins) logs a 'PRESENT' status."),
        ("3. Task Submissions & Deliverables", "Students review active assignments, deadlines, and requirements. Deliverables (GitHub repository links, live demo URLs, or files) are submitted directly through the portal."),
        ("4. Curriculum & Skill Radar Monitoring", "Students mark syllabus topics as 'In Progress' or 'Completed' and view interactive Radar Charts illustrating their technical and soft skill proficiency."),
        ("5. Regularization & Leave Requests", "If a punch is missed due to official travel or technical fault, trainees submit a regularization ticket with reason and times for mentor approval."),
        ("6. No-Dues Clearance & Letters", "At program completion, trainees initiate an exit request, track departmental clearance approvals, and download their official Offer Letters and Completion Certificates.")
    ]
    for step_title, step_desc in student_workflow:
        story.append(Paragraph(f"• <b>{step_title}:</b> <font color='#1E293B'>{step_desc}</font>", styles['RoleBullet']))

    story.append(Spacer(1, 8))

    # ROLE 2: MENTOR / TRAINER
    story.append(Paragraph("3.2 Mentor / Technical Trainer — Everyday Working & Functions", styles['SubHeading']))
    story.append(Paragraph(
        "<b>Who They Are:</b> Senior engineers, instructors, and technical leads responsible for teaching and evaluating specific batches.<br/>"
        "<b>Access Scope:</b> Mentors can only view and manage students assigned to their specific cohorts (<code>batch.mentor_id == current_user.id</code>).",
        styles['Body']
    ))
    mentor_workflow = [
        ("1. Batch Overview & Roster Tracking", "Mentors view their assigned batches, student rosters, daily attendance percentages, and identify students falling behind."),
        ("2. Task Assignment & Deadlines", "Mentors publish technical assignments, assign maximum point values, map tasks to curriculum skills, and set strict submission deadlines."),
        ("3. Submission Grading & Rubric Scoring", "Mentors inspect student code repositories, review demo links, assign scores (1–5 scale), and provide detailed qualitative feedback."),
        ("4. 1-on-1 Qualitative Reviews", "Conducts periodic reviews evaluating technical aptitude, problem solving, teamwork, and punctuality with actionable improvement suggestions."),
        ("5. Attendance Regularization Approval", "Mentors review and approve/reject punch correction tickets submitted by trainees in their batch."),
        ("6. Technical Exit Sign-off", "Signs off on project code handoff and documentation during the trainee's graduation No-Dues clearance process."),
        ("7. Trainer Leave & Substitute Scheduling", "Mentors apply for personal leaves through the portal, designating substitute trainers to maintain uninterrupted batch classes.")
    ]
    for step_title, step_desc in mentor_workflow:
        story.append(Paragraph(f"• <b>{step_title}:</b> <font color='#1E293B'>{step_desc}</font>", styles['RoleBullet']))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: USERS & THEIR WORKING (PART 2: HR & SUPER ADMIN)
    # =========================================================================
    story.append(Paragraph("3. Users & Their Working (Roles & Responsibilities — Part 2)", styles['SecHeading']))
    story.append(Paragraph(
        "Administrative roles maintain program-wide oversight, institutional partnerships, governance, and tamper-proof security.",
        styles['Body']
    ))
    story.append(Spacer(1, 4))

    # ROLE 3: HR / PROGRAM MANAGER
    story.append(Paragraph("3.3 HR & Program Manager — Everyday Working & Functions", styles['SubHeading']))
    story.append(Paragraph(
        "<b>Who They Are:</b> Talent operations teams, HR managers, and training coordinators overseeing institutional cohorts.<br/>"
        "<b>Access Scope:</b> Program-wide operational authority over users, batches, geofences, finances, and official documentation.",
        styles['Body']
    ))
    hr_workflow = [
        ("1. Program & Batch Architecture", "Creates training programs (Tech Master, Short Duration, Internship) and schedules cohort batches with start/end dates, mentor assignments, and capacities."),
        ("2. Trainee Onboarding & Batch Allocation", "Enrolls students, verifies college documentation, maps trainees to designated batches, and handles cohort transfers."),
        ("3. Geofence & Campus Venue Configuration", "Defines authorized physical training locations by latitude/longitude center points and radius thresholds (default 100m)."),
        ("4. Hardware Device Swap Approvals", "Reviews student device registration requests. If a student loses or replaces their registered phone/laptop, HR approves the new device fingerprint."),
        ("5. Institutional College Partnership Management", "Manages college MoUs, university coordinator contacts, college cohort rosters, and institutional performance metrics."),
        ("6. Fee Accounting & Installment Receipts", "Records student and college fee payments, tracks paid vs. pending balances, and generates official payment receipts."),
        ("7. Official Letter Generation Engine", "Generates 1-click official documents: Offer Letters, Internship Completion Letters, Bonafide Letters, Letters of Recommendation, and Warning Letters with digital verification."),
        ("8. Final Exit Clearance & Certificate Issuance", "Executes the final HR sign-off on No-Dues clearance once mentor, lab, and accounts have approved, triggering automatic completion certificate generation."),
        ("9. Manual Attendance Overrides", "Authorized to correct attendance records for approved official duty, requiring an explicit audit explanation.")
    ]
    for step_title, step_desc in hr_workflow:
        story.append(Paragraph(f"• <b>{step_title}:</b> <font color='#1E293B'>{step_desc}</font>", styles['RoleBullet']))

    story.append(Spacer(1, 8))

    # ROLE 4: SUPER ADMINISTRATOR
    story.append(Paragraph("3.4 Super Administrator — Everyday Working & Functions", styles['SubHeading']))
    story.append(Paragraph(
        "<b>Who They Are:</b> System administrators and IT security officers possessing highest-level platform governance.<br/>"
        "<b>Access Scope:</b> Global read/write access across all system entities, security ledgers, and server configurations.",
        styles['Body']
    ))
    admin_workflow = [
        ("1. User Provisioning & RBAC Management", "Provisions staff accounts, activates/deactivates users, and modifies role claims (STUDENT, MENTOR, HR, SUPER_ADMIN)."),
        ("2. Immutable Security Audit Log Monitoring", "Inspects the permanent audit trail recording every administrative override, role promotion, device approval, and failed login."),
        ("3. Global Security & Accuracy Thresholds", "Configures system-wide parameters such as facial recognition cosine threshold (0.82) and GPS accuracy cutoffs (<= 30m)."),
        ("4. System Health & Infrastructure Supervision", "Monitors API latency, database connection pools, Supabase cloud storage, and background task health.")
    ]
    for step_title, step_desc in admin_workflow:
        story.append(Paragraph(f"• <b>{step_title}:</b> <font color='#1E293B'>{step_desc}</font>", styles['RoleBullet']))

    story.append(Spacer(1, 8))

    # RBAC Summary Table
    story.append(Paragraph("<b>Role Access & Permission Matrix at a Glance:</b>", styles['SubHeading']))
    rbac_table_data = [
        [Paragraph("System Function", styles['ThStyle']), Paragraph("Student", styles['ThStyle']), Paragraph("Mentor", styles['ThStyle']), Paragraph("HR Manager", styles['ThStyle']), Paragraph("Super Admin", styles['ThStyle'])],
        [Paragraph("Punch Attendance (GPS + Face)", styles['TdStyleBold']), Paragraph("<font color='#059669'>Own Only</font>", styles['TdStyle']), Paragraph("No", styles['TdStyle']), Paragraph("No", styles['TdStyle']), Paragraph("No", styles['TdStyle'])],
        [Paragraph("Approve Attendance Regularization", styles['TdStyleBold']), Paragraph("No", styles['TdStyle']), Paragraph("<font color='#059669'>Assigned Batch</font>", styles['TdStyle']), Paragraph("<font color='#059669'>Global</font>", styles['TdStyle']), Paragraph("<font color='#059669'>Global</font>", styles['TdStyle'])],
        [Paragraph("Create & Grade Task Assignments", styles['TdStyleBold']), Paragraph("Submit Only", styles['TdStyle']), Paragraph("<font color='#059669'>Assigned Batch</font>", styles['TdStyle']), Paragraph("<font color='#059669'>Global</font>", styles['TdStyle']), Paragraph("<font color='#059669'>Global</font>", styles['TdStyle'])],
        [Paragraph("Manage Programs, Batches & Fees", styles['TdStyleBold']), Paragraph("No", styles['TdStyle']), Paragraph("View Only", styles['TdStyle']), Paragraph("<font color='#059669'>Full Manage</font>", styles['TdStyle']), Paragraph("<font color='#059669'>Full Manage</font>", styles['TdStyle'])],
        [Paragraph("Approve Devices & Generate Letters", styles['TdStyleBold']), Paragraph("Request Only", styles['TdStyle']), Paragraph("No", styles['TdStyle']), Paragraph("<font color='#059669'>Full Access</font>", styles['TdStyle']), Paragraph("<font color='#059669'>Full Access</font>", styles['TdStyle'])],
        [Paragraph("User Provisioning & Security Audit Logs", styles['TdStyleBold']), Paragraph("No", styles['TdStyle']), Paragraph("No", styles['TdStyle']), Paragraph("View Limited", styles['TdStyle']), Paragraph("<font color='#059669'>Full Hegemony</font>", styles['TdStyle'])]
    ]
    t_rbac = Table(rbac_table_data, colWidths=[150, 80, 95, 95, 102])
    t_rbac.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_rbac)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: FUTURE ROADMAP & SIGN-OFF
    # =========================================================================
    story.append(Paragraph("4. What the Application Will Have in the Future (Roadmap)", styles['SecHeading']))
    story.append(Paragraph(
        "While Phase 1 (Core Lifecycle) and Phase 2 (Enterprise Operations Suite) are currently deployed and active, "
        "the future development roadmap focuses on AI intelligence, placement ecosystems, and cross-platform mobility.",
        styles['Body']
    ))

    future_data = [
        [Paragraph("Planned Capability / Milestone", styles['ThStyle']), Paragraph("Architecture & Integration Scope", styles['ThStyle']), Paragraph("Target Impact & Benefits", styles['ThStyle'])],
        [
            Paragraph("<b>AI Advisory Assistant<br/>(Groq + LangChain)</b>", styles['TdStyleBold']),
            Paragraph("Fast inference using Groq LPU models (Llama-3-70B). Analyzes student task submissions, identifies skill gaps, drafts personalized mentor feedback, and recommends learning resources.", styles['TdStyle']),
            Paragraph("Saves 70% of mentor feedback drafting time. <i>Strict Guardrail: AI is strictly advisory; never makes final grading, hiring, or dismissal decisions.</i>", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Corporate Placement & Job Matching Portal</b>", styles['TdStyleBold']),
            Paragraph("Internal career portal matching high-performing trainees to open client project roles at Netlink based on evaluated skill radar scores and attendance reliability.", styles['TdStyle']),
            Paragraph("Accelerates post-training talent absorption from weeks to hours, giving delivery managers direct access to verified candidate rankings.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Cross-Platform Mobile App (React Native / Flutter)</b>", styles['TdStyleBold']),
            Paragraph("Native iOS and Android mobile applications featuring background geofencing beacons, biometric Secure Enclave key storage, and offline punch caching with cryptographic sync.", styles['TdStyle']),
            Paragraph("Enables zero-friction attendance check-in on smartphones even in low-connectivity training labs, with automatic sync upon reconnect.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Enterprise HRMS & LMS Bi-Directional Connectors</b>", styles['TdStyleBold']),
            Paragraph("Pre-built REST and webhook connectors for Workday, SAP SuccessFactors, BambooHR, and GitHub Classroom.", styles['TdStyle']),
            Paragraph("Eliminates double data entry; graduated trainees automatically transition into full-time employee HRMS records.", styles['TdStyle'])
        ],
        [
            Paragraph("<b>Predictive Dropout & Early Intervention Analytics</b>", styles['TdStyleBold']),
            Paragraph("Machine learning models analyzing leading indicators (attendance drops, late task submissions, feedback scores) to flag at-risk trainees early.", styles['TdStyle']),
            Paragraph("Enables proactive HR and mentor intervention before a trainee drops out, improving program completion rates by over 25%.", styles['TdStyle'])
        ]
    ]

    t_fut = Table(future_data, colWidths=[120, 222, 180])
    t_fut.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_fut)
    story.append(Spacer(1, 10))

    # Summary Callout
    summary_box = [
        [Paragraph("<b>CORE TAKEAWAY:</b> The Netlink Platform transforms a fragmented, vulnerable trainee onboarding process "
                   "into a <b>zero-trust, transparent, and auditable talent lifecycle ecosystem</b>. By bridging biometric precision, "
                   "curriculum tracking, institutional college partnerships, and future AI advisory capabilities, the platform guarantees "
                   "operational excellence for students, trainers, and enterprise leadership alike.", styles['BoxText'])]
    ]
    t_sum = Table(summary_box, colWidths=[522])
    t_sum.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#3B82F6")),
        ('PADDING', (0,0), (-1,-1), 6.5),
    ]))
    story.append(t_sum)
    story.append(Spacer(1, 10))

    # Executive Document Sign-off & Control
    story.append(Paragraph("5. Document Governance & Stakeholder Approval", styles['SecHeading']))
    sign_data = [
        [Paragraph("Stakeholder Role", styles['ThStyle']), Paragraph("Designated Name", styles['ThStyle']), Paragraph("Approval Status", styles['ThStyle']), Paragraph("Date", styles['ThStyle'])],
        [Paragraph("<b>Lead Product Manager</b>", styles['TdStyleBold']), Paragraph("Talent Operations Lead", styles['TdStyle']), Paragraph("<font color='#059669'><b>APPROVED (Digital Sign-off)</b></font>", styles['TdStyleBold']), Paragraph("12-Oct-2026", styles['TdStyle'])],
        [Paragraph("<b>Lead Solutions Architect</b>", styles['TdStyleBold']), Paragraph("Platform Engineering Lead", styles['TdStyle']), Paragraph("<font color='#059669'><b>APPROVED (Digital Sign-off)</b></font>", styles['TdStyleBold']), Paragraph("12-Oct-2026", styles['TdStyle'])],
        [Paragraph("<b>Head of HR & Training</b>", styles['TdStyleBold']), Paragraph("VP Human Capital", styles['TdStyle']), Paragraph("<font color='#059669'><b>APPROVED (Digital Sign-off)</b></font>", styles['TdStyleBold']), Paragraph("13-Oct-2026", styles['TdStyle'])],
        [Paragraph("<b>Information Security Officer</b>", styles['TdStyleBold']), Paragraph("Chief Security Officer", styles['TdStyle']), Paragraph("<font color='#059669'><b>APPROVED (Tier-1 Biometrics)</b></font>", styles['TdStyleBold']), Paragraph("13-Oct-2026", styles['TdStyle'])]
    ]
    t_sign = Table(sign_data, colWidths=[140, 132, 150, 100])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=ConciseNumberedCanvas)
    print(f"Successfully generated concise PRD PDF at: {output_path}")

if __name__ == "__main__":
    target_pdf = sys.argv[1] if len(sys.argv) > 1 else "Netlink_Platform_Product_Requirements_Document_PRD.pdf"
    create_concise_prd_pdf(target_pdf)
