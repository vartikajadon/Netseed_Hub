import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' 
    and running headers across all pages except the cover page.
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
        if self._pageNumber == 1:
            # Suppress running header/footer on cover page
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0F2942"))

        # Running Top Header
        self.drawString(54, 752, "NETLINK")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(100, 752, "|   Intern/Trainee Lifecycle Management Platform — Product Requirements Document")
        
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 744, 558, 744)

        # Running Bottom Footer
        self.line(54, 45, 558, 45)
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#DC2626"))
        self.drawString(54, 33, "CONFIDENTIAL")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(125, 33, "— FOR AUTHORIZED INTERNAL, HR & ACADEMIC DISTRIBUTION ONLY")
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0F2942"))
        self.drawRightString(558, 33, page_str)
        self.restoreState()


def create_prd_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Define custom corporate palette styles
    # Primary: #0F2942, Accent: #0284C7, Dark: #1E293B, Muted: #64748B, Border: #E2E8F0
    c_primary = colors.HexColor("#0F2942")
    c_accent = colors.HexColor("#0284C7")
    c_dark = colors.HexColor("#1E293B")
    c_muted = colors.HexColor("#64748B")
    c_light = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#CBD5E1")

    # Document Styles
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=c_primary,
        spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=c_accent,
        spaceAfter=20
    ))
    styles.add(ParagraphStyle(
        name='MetaLabel',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=c_primary
    ))
    styles.add(ParagraphStyle(
        name='MetaValue',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_dark
    ))
    styles.add(ParagraphStyle(
        name='SecHeader',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=c_primary,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='SubSecHeader',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='SubSubSecHeader',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=c_dark,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='BodyRegular',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='BodyBold',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='BulletText',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceAfter=3,
        leftIndent=14
    ))
    styles.add(ParagraphStyle(
        name='TableHead',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    ))
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_dark
    ))
    styles.add(ParagraphStyle(
        name='TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_primary
    ))
    styles.add(ParagraphStyle(
        name='TableCellMono',
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=c_dark
    ))
    styles.add(ParagraphStyle(
        name='CalloutText',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_dark
    ))

    story = []

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 40))
    # Brand Pill
    brand_pill_data = [[
        Paragraph("<font color='#0284C7'><b>NETLINK SOFTWARE GROUP EXCELLENCE LABS</b></font>", styles['MetaLabel'])
    ]]
    t_brand = Table(brand_pill_data, colWidths=[504])
    t_brand.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#E0F2FE")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BAE6FD")),
    ]))
    story.append(t_brand)
    story.append(Spacer(1, 25))

    story.append(Paragraph("Netlink Intern & Trainee Lifecycle Management Platform", styles['DocTitle']))
    story.append(Paragraph("Product Requirements Document (PRD) — Comprehensive System Specification", styles['DocSubtitle']))

    story.append(HRFlowable(width="100%", thickness=3, color=c_primary, spaceBefore=5, spaceAfter=25))

    exec_summary_cover = (
        "<b>Executive Summary:</b> This document provides the authoritative, production-grade Product Requirements "
        "Document (PRD) and Technical Specification for the Netlink Intern & Trainee Lifecycle Management Platform. "
        "The system provides complete governance across the full lifecycle of student interns and graduate trainees—encompassing "
        "secure biometric onboarding, geofenced and liveness-verified zero-trust attendance, batch scheduling, mentor task "
        "evaluations, institutional university training, fee tracking, automated letter/certificate generation, and strict audit compliance."
    )
    story.append(Paragraph(exec_summary_cover, styles['BodyRegular']))
    story.append(Spacer(1, 25))

    # Metadata Grid
    meta_data = [
        [Paragraph("Document Version", styles['MetaLabel']), Paragraph("v2.4 (Enterprise Production Edition)", styles['MetaValue']),
         Paragraph("Date of Release", styles['MetaLabel']), Paragraph("October 2026", styles['MetaValue'])],
        [Paragraph("Document Status", styles['MetaLabel']), Paragraph("<font color='#059669'><b>APPROVED / PRODUCTION-ACTIVE</b></font>", styles['MetaValue']),
         Paragraph("Target Environments", styles['MetaLabel']), Paragraph("Local Dev, AWS Cloud, Supabase PaaS", styles['MetaValue'])],
        [Paragraph("Product Owner", styles['MetaLabel']), Paragraph("Netlink Talent & HR Operations", styles['MetaValue']),
         Paragraph("Lead Architect", styles['MetaLabel']), Paragraph("Platform Engineering Team", styles['MetaValue'])],
        [Paragraph("Security Clearance", styles['MetaLabel']), Paragraph("Tier-1 Internal Enterprise Strict", styles['MetaValue']),
         Paragraph("Compliance Regimes", styles['MetaLabel']), Paragraph("GDPR & DPDP 2023 Biometric Standards", styles['MetaValue'])]
    ]
    t_meta = Table(meta_data, colWidths=[120, 132, 120, 132])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_light),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 40))

    # Core Value Highlights
    val_data = [
        [
            Paragraph("<b>Zero-Trust Attendance</b><br/><font color='#64748B'>Dual-factor GPS Haversine boundary + 512-d facial embedding cosine match + hardware device fingerprinting.</font>", styles['CalloutText']),
            Paragraph("<b>Complete Lifecycle Suite</b><br/><font color='#64748B'>18 integrated modules from campus enrollment, curriculum progression, to multi-department No-Dues clearance.</font>", styles['CalloutText']),
            Paragraph("<b>Enterprise RBAC</b><br/><font color='#64748B'>FastAPI server-side authorization dependencies guaranteeing zero client trust and complete data isolation.</font>", styles['CalloutText'])
        ]
    ]
    t_val = Table(val_data, colWidths=[164, 170, 170])
    t_val.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_val)

    story.append(PageBreak())

    # =========================================================================
    # TABLE OF CONTENTS / OUTLINE
    # =========================================================================
    story.append(Paragraph("Document Structure & Index", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=12))

    toc_items = [
        ("Section 1", "Product Vision, Core Objectives & Business Rationale", "Strategic goals, problem statement, key KPIs"),
        ("Section 2", "Technology Stack & Decoupled Architectural Topology", "Frontend, backend, database, biometric engine, hosting"),
        ("Section 3", "Comprehensive User Roles, Responsibilities & RBAC Matrix", "Student, Mentor, HR/Program Manager, Super Admin scope"),
        ("Section 4", "Deep-Dive Functional Module Specifications", "18 distinct functional systems detailed with workflows"),
        ("Section 5", "Biometric & Geofenced Attendance Verification Engine", "11-step pipeline, Haversine mathematics, 100m & 5-hour rules"),
        ("Section 6", "Relational Database Architecture & Entity Data Dictionary", "Complete 27-entity relational data model and constraints"),
        ("Section 7", "RESTful API Architectural Contract & Endpoint Taxonomy", "FastAPI routing hierarchy, payload schemas, security guards"),
        ("Section 8", "Security, Biometric Consent, Data Isolation & Privacy", "Zero-client trust, hardware binding, GDPR/DPDP vector isolation"),
        ("Section 9", "Multi-Phase System Roadmap & AI Advisory Framework", "Phase 1 MVP, Phase 2 Integrations, Phase 3 Groq/LangChain AI"),
        ("Section 10", "System Quality Attributes & Performance SLAs", "Throughput, latency, disaster recovery, concurrent spike support"),
        ("Section 11", "Sign-Off, Governance & Operational Approval Sheet", "Stakeholder sign-off and change management protocol")
    ]

    toc_table_data = [[
        Paragraph("<b>Section</b>", styles['TableHead']),
        Paragraph("<b>Title & Scope</b>", styles['TableHead']),
        Paragraph("<b>Key Deliverables</b>", styles['TableHead'])
    ]]
    for sec_num, sec_title, sec_desc in toc_items:
        toc_table_data.append([
            Paragraph(sec_num, styles['TableCellBold']),
            Paragraph(sec_title, styles['TableCell']),
            Paragraph(sec_desc, styles['TableCell'])
        ])

    t_toc = Table(toc_table_data, colWidths=[70, 244, 190])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_toc)
    story.append(Spacer(1, 15))

    # =========================================================================
    # SECTION 1: PRODUCT VISION & BUSINESS OBJECTIVES
    # =========================================================================
    story.append(Paragraph("1. Product Vision, Core Objectives & Business Rationale", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "<b>1.1 Context & Problem Statement:</b> Traditional internship and trainee management programs suffer from "
        "fragmented spreadsheets, manual attendance registers, unverified proxy sign-ins, delayed mentor feedback, "
        "and disconnected graduation/clearance procedures. Physical biometric punch machines fail to adapt to modern multi-venue "
        "training campuses, while purely mobile app check-ins are plagued by mock location GPS spoofers and shared credentials. "
        "Furthermore, HR departments waste hundreds of hours manually drafting offer letters, completion certificates, "
        "tracking fee installments, and securing physical department signatures for exit clearance.",
        styles['BodyRegular']
    ))

    story.append(Paragraph(
        "<b>1.2 Strategic Objectives & Target Audience:</b> The Netlink Platform establishes a unified, auditable, and automated digital ecosystem. "
        "Its target beneficiaries include:",
        styles['BodyRegular']
    ))
    story.append(Paragraph("• <b>Student Interns & Trainees:</b> Seamless digital campus onboarding, unambiguous task submissions, personal attendance transparency, skill radar metrics, and instant clearance certification.", styles['BulletText']))
    story.append(Paragraph("• <b>Technical Mentors & Trainers:</b> Automated batch attendance visibility, structured task assignment with rubrics, continuous curriculum progress tracking, and qualitative 1-on-1 reviews.", styles['BulletText']))
    story.append(Paragraph("• <b>HR & Program Operations:</b> Centralized batch allocation, automated geofence boundary enforcement, institutional college partnership tracking, fee payment reconciliation, and 1-click legal document issuance.", styles['BulletText']))
    story.append(Paragraph("• <b>Super Administrators:</b> Full visibility into security audit logs, user provisioning, role assignments, system health, and tamper-proof compliance records.", styles['BulletText']))

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 2: TECHNOLOGY STACK & ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("2. Technology Stack & Decoupled Architectural Topology", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "The Netlink Platform is engineered with a strict <b>Decoupled 3-Tier Enterprise Architecture</b>, isolating "
        "client presentation from core domain business logic, biometric computation, and persistent storage.",
        styles['BodyRegular']
    ))

    tech_table_data = [
        [Paragraph("Tier / Layer", styles['TableHead']), Paragraph("Technology Component", styles['TableHead']), Paragraph("Version & Libraries", styles['TableHead']), Paragraph("Key Architectural Responsibility", styles['TableHead'])],
        [
            Paragraph("<b>Frontend Presentation</b>", styles['TableCellBold']),
            Paragraph("React SPA + TypeScript + Vite", styles['TableCell']),
            Paragraph("React 18.2, TypeScript 5.2, Vite 5.1, Lucide React, Tailwind CSS 3.4", styles['TableCell']),
            Paragraph("Client routing, responsive UI dashboards, video stream capture for face enrollment, GPS geolocation queries.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Backend API & Logic</b>", styles['TableCellBold']),
            Paragraph("FastAPI (Python Async)", styles['TableCell']),
            Paragraph("Python 3.11 / 3.14, FastAPI 0.110+, Pydantic V2, Starlette, Uvicorn", styles['TableCell']),
            Paragraph("REST routing, server-side RBAC validation, Haversine geofence calculation, daily attendance aggregation, business services.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Database & Persistence</b>", styles['TableCellBold']),
            Paragraph("PostgreSQL / Supabase + SQLAlchemy", styles['TableCell']),
            Paragraph("PostgreSQL 15+, SQLAlchemy 2.0 ORM, SQLite Dev Fallback", styles['TableCell']),
            Paragraph("ACID transactions, foreign key cascades, unique constraints, indexed queries, 27 normalized schema tables.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Identity & Auth</b>", styles['TableCellBold']),
            Paragraph("Supabase Auth + PyJWT", styles['TableCell']),
            Paragraph("OAuth2 / Bearer JWT, HS256 / RS256, Supabase JS v2.117", styles['TableCell']),
            Paragraph("Secure credential storage, cryptographic token issuance, server-side token validation via dependency injection.", styles['TableCell'])
        ],
        [
            Paragraph("<b>Biometrics & Computer Vision</b>", styles['TableCellBold']),
            Paragraph("Facial Vector Engine", styles['TableCell']),
            Paragraph("512-dimensional vector cosine similarity, OpenCV / NumPy", styles['TableCell']),
            Paragraph("Consent-gated face template enrollment, passive liveness detection, vector matching against stored embeddings.", styles['TableCell'])
        ],
        [
            Paragraph("<b>AI Services (Phase 3)</b>", styles['TableCellBold']),
            Paragraph("Groq LPU + LangChain", styles['TableCell']),
            Paragraph("Groq Cloud API, LangChain Python, Llama-3-70B / Mixtral", styles['TableCell']),
            Paragraph("Advisory feedback assistance, student skill gap summaries, automated curriculum recommendations (human-in-loop).", styles['TableCell'])
        ],
        [
            Paragraph("<b>Hosting & Deployment</b>", styles['TableCellBold']),
            Paragraph("Vercel CDN + Cloud Container", styles['TableCell']),
            Paragraph("Vercel (Frontend), Docker on AWS / Render (Backend API)", styles['TableCell']),
            Paragraph("Zero-downtime rollouts, SSL/TLS termination, CORS origin isolation, environment variable secret separation.", styles['TableCell'])
        ]
    ]

    t_tech = Table(tech_table_data, colWidths=[90, 110, 134, 170])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 10))

    # Architectural Blueprint Callout
    arch_callout = [
        [Paragraph("<b>Decoupled Architecture Rule:</b> The client browser is treated as an <b>untrusted environment</b>. "
                   "All business validations, role checks, GPS coordinates, distance computations, and timestamp generations "
                   "occur strictly inside the FastAPI backend. No attendance or grading decision is ever finalized client-side.", styles['CalloutText'])]
    ]
    t_arch_c = Table(arch_callout, colWidths=[504])
    t_arch_c.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_arch_c)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 3: USER ROLES, RESPONSIBILITIES & RBAC
    # =========================================================================
    story.append(Paragraph("3. User Roles, Responsibilities & RBAC Matrix", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "Access control strictly implements <b>Defense-in-Depth</b>. Every API route verifies caller identity and role "
        "using FastAPI dependencies (<code>get_current_user</code>, <code>RoleChecker</code>).",
        styles['BodyRegular']
    ))

    roles_data = [
        [Paragraph("Role Name", styles['TableHead']), Paragraph("Core Functional Responsibilities", styles['TableHead']), Paragraph("Accessible Modules & Endpoints", styles['TableHead']), Paragraph("Strict Isolation Boundaries", styles['TableHead'])],
        [
            Paragraph("<b>STUDENT / TRAINEE</b>", styles['TableCellBold']),
            Paragraph("• View personal program, batch, mentor & curriculum.<br/>"
                      "• Grant biometric consent & enroll facial template.<br/>"
                      "• Bind primary device & punch attendance (GPS + Face).<br/>"
                      "• Submit task assignments with code/demo links.<br/>"
                      "• Track skill radar, fees, feedback & apply for leave.<br/>"
                      "• Submit attendance regularizations & No-Dues clearance.", styles['TableCell']),
            Paragraph("• <code>/auth/me</code><br/>"
                      "• <code>/students/me</code><br/>"
                      "• <code>/attendance/punch</code><br/>"
                      "• <code>/tasks/{id}/submit</code><br/>"
                      "• <code>/consents</code>, <code>/devices</code><br/>"
                      "• <code>/no-dues/request</code><br/>"
                      "• <code>/letters/my-letters</code>", styles['TableCellMono']),
            Paragraph("<b>Strictly Isolated:</b> Can only query and mutate records linked to their own <code>user_id</code>. "
                      "Zero visibility into other students' punches, scores, or templates.", styles['TableCell'])
        ],
        [
            Paragraph("<b>MENTOR / TRAINER</b>", styles['TableCellBold']),
            Paragraph("• Oversee assigned batches and student rosters.<br/>"
                      "• Create, schedule, deadline, and publish tasks.<br/>"
                      "• Evaluate & score task submissions (rubrics 1-5).<br/>"
                      "• Conduct periodic qualitative feedback reviews.<br/>"
                      "• Review & approve batch attendance regularizations.<br/>"
                      "• Update topic curriculum progress.<br/>"
                      "• Sign off on student technical No-Dues clearance.<br/>"
                      "• Request trainer leaves & assign substitutes.", styles['TableCell']),
            Paragraph("• <code>/batches/my-batches</code><br/>"
                      "• <code>/tasks</code> (Create/Update)<br/>"
                      "• <code>/tasks/submissions/grade</code><br/>"
                      "• <code>/curriculum/progress</code><br/>"
                      "• <code>/feedbacks</code><br/>"
                      "• <code>/trainer-leaves</code><br/>"
                      "• <code>/no-dues/mentor-approval</code>", styles['TableCellMono']),
            Paragraph("<b>Batch Scoped:</b> Limited strictly to cohorts where <code>batch.mentor_id == current_user.id</code>. "
                      "Cannot modify global system settings or other mentors' batches.", styles['TableCell'])
        ],
        [
            Paragraph("<b>HR / PROGRAM MANAGER</b>", styles['TableCellBold']),
            Paragraph("• Create & manage Programs, Batches, and Geofences.<br/>"
                      "• Enroll students, map to batches & assign mentors.<br/>"
                      "• Review & approve student device swap requests.<br/>"
                      "• Execute manual attendance overrides with audit notes.<br/>"
                      "• Manage Institutional training MoUs & college rosters.<br/>"
                      "• Record fee payments, track installments & balances.<br/>"
                      "• Generate official letters (Offer, Bonafide, Warning).<br/>"
                      "• Finalize department No-Dues & issue certificates.<br/>"
                      "• Generate program-wide attendance & grading reports.", styles['TableCell']),
            Paragraph("• <code>/programs</code>, <code>/batches</code><br/>"
                      "• <code>/students</code> (Full CRUD)<br/>"
                      "• <code>/devices/pending/approve</code><br/>"
                      "• <code>/geofences</code><br/>"
                      "• <code>/fees</code>, <code>/letters</code><br/>"
                      "• <code>/institution-trainings</code><br/>"
                      "• <code>/certificates/issue</code><br/>"
                      "• <code>/attendance/manual-override</code>", styles['TableCellMono']),
            Paragraph("<b>Program & Operational Scope:</b> Full management over academic and operational records. "
                      "All administrative actions generate immutable audit logs.", styles['TableCell'])
        ],
        [
            Paragraph("<b>SUPER ADMIN</b>", styles['TableCellBold']),
            Paragraph("• Complete administrative hegemony across the system.<br/>"
                      "• Provision users, toggle active status & assign roles.<br/>"
                      "• Inspect immutable system audit logs & security flags.<br/>"
                      "• Configure global GPS accuracy thresholds & geofences.<br/>"
                      "• Monitor system health, DB connections & storage.", styles['TableCell']),
            Paragraph("• <code>/admin/dashboard-stats</code><br/>"
                      "• <code>/admin/users</code><br/>"
                      "• <code>/admin/audit-logs</code><br/>"
                      "• <code>/admin/system-health</code><br/>"
                      "• All endpoints unrestricted", styles['TableCellMono']),
            Paragraph("<b>Global Scope:</b> Highest privilege. Every admin intervention is tracked in the immutable security ledger.", styles['TableCell'])
        ]
    ]

    t_roles = Table(roles_data, colWidths=[90, 160, 120, 134], repeatRows=1)
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_roles)
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 4: DEEP-DIVE FUNCTIONAL MODULES
    # =========================================================================
    story.append(Paragraph("4. Deep-Dive Functional Module Specifications", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    modules = [
        ("4.1 Authentication & RBAC Engine",
         "The platform uses Supabase Auth for credential handling and JWT issuance. FastAPI validates the Bearer JWT signature on every inbound request. Endpoints enforce role-based access control via dependency injection. Tokens embed user ID, email, role, and expiration timestamp. Unauthenticated requests yield HTTP 401; unauthorized role actions yield HTTP 403."),

        ("4.2 Student Lifecycle & Profile Governance",
         "Captures comprehensive trainee records including enrollment status (ACTIVE, PROBATION, COMPLETED, DROPPED), college name, degree, contact details, emergency contacts, roll number, assigned program, and batch. Supports student status transitions, mentor reassignments, and complete longitudinal tracking from onboarding to graduation."),

        ("4.3 Program & Cohort Batch Orchestration",
         "Supports multi-track program structures (e.g., Tech Master 6-Month Training + 6-Month Internship, Short-Duration 3-Month, and Pure 6-Month Internship). Batches enforce calendar start/end dates, maximum student capacities, mapped physical geofences, and primary assigned technical mentors."),

        ("4.4 Biometric Face Enrollment & Consent Compliance",
         "Mandates explicit user consent logging conforming to GDPR and India DPDP 2023 laws before biometric activation. Live webcam video captures high-quality facial frames. An isolated vision service extracts a 512-dimensional normalized embedding vector. Raw face photos are NEVER stored unencrypted; only mathematical vectors are persisted."),

        ("4.5 Device Binding & Hardware Fingerprinting",
         "Enforces single-device binding per trainee to eliminate proxy punch fraud. Extracts browser/hardware fingerprint, OS, model, and browser user-agent. Trainees must register their primary smartphone or laptop. Secondary devices require formal HR workflow approval before punches are unlocked."),

        ("4.6 Zero-Trust Geofenced Attendance Engine",
         "Integrates server-side Haversine distance calculations against physical venue coordinates. Trainees can only punch when physically within the active geofence boundary (<= 100 meters). Supports multiple punch pairs per day, calculates cumulative minutes, and automatically determines daily status (>= 300 minutes = PRESENT; < 300 minutes = ABSENT)."),

        ("4.7 Attendance Regularization & Manual Overrides",
         "Trainees who experience technical glitches or official on-duty travel can submit regularization requests detailing the date, proposed punch times, and justification. Requires formal review by the batch mentor or HR. Any administrative override mandates an explicit reason note and logs an immutable audit event."),

        ("4.8 Task Assignment, Deadlines & Submissions",
         "Mentors create technical tasks linked to specific curriculum modules. Configurable attributes include title, description, submission deadline, skill tags, and maximum points. Students submit external repository links, deployed demo URLs, or file attachments before the deadline. Late submissions are flagged automatically."),

        ("4.9 Skill Evaluations & Radar Proficiency",
         "Mentors evaluate student submissions against defined rubrics (e.g., Code Quality, Architecture, Problem Solving, Communication) on a 1-to-5 rating scale. Cumulative scores feed interactive Spider/Radar charts in the student and mentor dashboards to track proficiency development over time."),

        ("4.10 Curriculum & Learning Track Tracking",
         "Hierarchical curriculum structures organized into Tracks, Modules, and Topics. Mentors and students update topic completion states (NOT_STARTED, IN_PROGRESS, COMPLETED). Enables real-time syllabus tracking, progress percentage calculations, and milestone delivery monitoring across batches."),

        ("4.11 Academic Calendar, Holidays & Trainer Leave Management",
         "Interactive academic calendar displaying training sessions, company holidays, project demo days, and milestone assessments. Includes a Trainer Leave management workflow where trainers submit leave requests, designate substitute mentors, and trigger automatic batch schedule adjustments."),

        ("4.12 Institutional Training & College Cohort Operations",
         "Dedicated system for managing institutional university partnerships and college MoU programs. Tracks university details, MoU signed dates, college coordinators, student rosters, fee agreements, and college-specific batch performance analytics."),

        ("4.13 Fees, Invoicing & Installment Tracking",
         "Financial ledger for training programs requiring student or college tuition fees. Tracks total program cost, payment modes (UPI, NEFT, Cheque), installment schedules, payment transaction IDs, receipts, paid amounts, and outstanding balances with visual status badges."),

        ("4.14 Digital Document & Letter Generation",
         "Automated generation of official corporate letters (Offer Letters, Internship Completion Letters, Bonafide Student Letters, Letters of Recommendation, Warning Letters, and NOCs). Embeds dynamic trainee variables, institutional headers, authorized signatures, and verification QR/codes."),

        ("4.15 Automated Clearance & No-Dues Workflow",
         "Multi-department exit clearance procedure required prior to graduation or certificate issuance. Tracks sequential sign-offs: 1) Technical Mentor (Code repo & project handoff), 2) Asset/Lab (Laptop, ID badge, equipment return), 3) Accounts (Tuition fee settlement), 4) HR (Final approval)."),

        ("4.16 Certificate Generation & Verification Engine",
         "Issues tamper-proof digital Course Completion and Internship Experience Certificates upon successful No-Dues sign-off and attendance threshold fulfillment. Features unique certificate identification hashes for instant external verification."),

        ("4.17 Feedback & Performance Review System",
         "Structured 1-on-1 feedback module allowing mentors to record periodic qualitative evaluations, behavioral ratings, attendance diligence notes, and constructive action plans. Students can review mentor guidance and submit batch experience feedback."),

        ("4.18 Notification & System Alert Dispatcher",
         "Centralized notification hub delivering real-time in-app alerts for pending task deadlines, regularization approvals, device registration status changes, fee installment reminders, and administrative announcements.")
    ]

    for title, desc in modules:
        story.append(Paragraph(title, styles['SubSecHeader']))
        story.append(Paragraph(desc, styles['BodyRegular']))
        story.append(Spacer(1, 3))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 5: ATTENDANCE VERIFICATION ENGINE & BIOMETRICS
    # =========================================================================
    story.append(Paragraph("5. Biometric & Geofenced Attendance Verification Engine", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "Attendance verification is the most security-sensitive engine in the Netlink Platform. "
        "Every punch request (<code>POST /api/v1/attendance/punch</code>) must pass through a strict, "
        "synchronous <b>11-Step Verification Pipeline</b> inside the FastAPI backend. "
        "Failure at ANY single step immediately aborts the transaction.",
        styles['BodyRegular']
    ))

    # Pipeline Table
    pipe_data = [
        [Paragraph("Step", styles['TableHead']), Paragraph("Verification Stage", styles['TableHead']), Paragraph("Validation Logic & Security Rules", styles['TableHead']), Paragraph("Failure Response", styles['TableHead'])],
        [Paragraph("1", styles['TableCellBold']), Paragraph("JWT Authenticated User", styles['TableCellBold']), Paragraph("Verifies valid Supabase Bearer token; confirms role is <code>STUDENT</code> and status is <code>ACTIVE</code>.", styles['TableCell']), Paragraph("HTTP 401 Unauthorized", styles['TableCellMono'])],
        [Paragraph("2", styles['TableCellBold']), Paragraph("Device Binding Check", styles['TableCellBold']), Paragraph("Verifies request <code>hardware_fingerprint</code> matches student's registered, HR-approved device in <code>devices</code> table.", styles['TableCell']), Paragraph("HTTP 403 Forbidden (Unregistered Device)", styles['TableCellMono'])],
        [Paragraph("3", styles['TableCellBold']), Paragraph("Biometric Consent Active", styles['TableCellBold']), Paragraph("Verifies active, non-revoked GDPR/DPDP consent record exists in <code>consents</code> table.", styles['TableCell']), Paragraph("HTTP 422 Unprocessable (Consent Required)", styles['TableCellMono'])],
        [Paragraph("4", styles['TableCellBold']), Paragraph("Liveness Verification", styles['TableCellBold']), Paragraph("Executes passive/active liveness check on incoming frame to detect photo/screen playback spoofing.", styles['TableCell']), Paragraph("HTTP 422 Unprocessable (Liveness Failed)", styles['TableCellMono'])],
        [Paragraph("5", styles['TableCellBold']), Paragraph("Face Vector Cosine Match", styles['TableCellBold']), Paragraph("Extracts 512-d vector; computes Cosine Similarity with enrolled template: <b>Score >= 0.82</b> required.", styles['TableCell']), Paragraph("HTTP 422 Unprocessable (Face Mismatch)", styles['TableCellMono'])],
        [Paragraph("6", styles['TableCellBold']), Paragraph("Mock GPS Detection", styles['TableCellBold']), Paragraph("Checks OS mock location flags and GPS accuracy metadata (accuracy must be <= 30.0 meters).", styles['TableCell']), Paragraph("HTTP 400 Bad Request (Mock GPS Detected)", styles['TableCellMono'])],
        [Paragraph("7", styles['TableCellBold']), Paragraph("Server Haversine Calc", styles['TableCellBold']), Paragraph("Computes exact great-circle distance between client GPS and batch geofence center point: <b>Distance <= 100.0m</b> required.", styles['TableCell']), Paragraph("HTTP 422 Unprocessable (Out of Bounds)", styles['TableCellMono'])],
        [Paragraph("8", styles['TableCellBold']), Paragraph("Punch Sequence Validation", styles['TableCellBold']), Paragraph("Enforces strict alternating sequence: Day must start with <code>PUNCH_IN</code>, followed by <code>PUNCH_OUT</code>.", styles['TableCell']), Paragraph("HTTP 400 Bad Request (Invalid Sequence)", styles['TableCellMono'])],
        [Paragraph("9", styles['TableCellBold']), Paragraph("Record Event Creation", styles['TableCellBold']), Paragraph("Stores verified <code>AttendanceEvent</code> with server UTC timestamp, GPS, device ID, and face match score.", styles['TableCell']), Paragraph("Database Transaction Rollback on Error", styles['TableCellMono'])],
        [Paragraph("10", styles['TableCellBold']), Paragraph("Daily Duration Summation", styles['TableCellBold']), Paragraph("Aggregates total verified minutes across all closed In-Out punch pairs for the current date.", styles['TableCell']), Paragraph("Internal Calculation", styles['TableCellMono'])],
        [Paragraph("11", styles['TableCellBold']), Paragraph("Daily Status Calculation", styles['TableCellBold']), Paragraph("Total minutes >= 300 (5h) -> <code>PRESENT</code>; < 300 minutes -> <code>ABSENT</code>; Open punch -> <code>INCOMPLETE</code>.", styles['TableCell']), Paragraph("HTTP 200 Success Response", styles['TableCellMono'])]
    ]

    t_pipe = Table(pipe_data, colWidths=[36, 110, 218, 140], repeatRows=1)
    t_pipe.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_pipe)
    story.append(Spacer(1, 10))

    # Haversine Math & Business Rules
    story.append(Paragraph("<b>5.1 Mathematical Geofence Specification (Haversine Formula):</b>", styles['SubSecHeader']))
    story.append(Paragraph(
        "The server computes great-circle distance <b>d</b> between batch venue coordinates (lat1, lon1) "
        "and client GPS coordinates (lat2, lon2) using Earth mean radius <b>R = 6,371,000 meters</b>:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>a = sin²(Δlat / 2) + cos(lat1) · cos(lat2) · sin²(Δlon / 2)</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>c = 2 · atan2(√a, √(1 − a))</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>d = R · c</b>",
        styles['BodyRegular']
    ))

    # Strict Boundary Rules Table
    rules_data = [
        [Paragraph("Condition", styles['TableHead']), Paragraph("Calculated Distance", styles['TableHead']), Paragraph("Verification Result", styles['TableHead']), Paragraph("System Action", styles['TableHead'])],
        [Paragraph("Inside Venue", styles['TableCellBold']), Paragraph("99.0 meters", styles['TableCell']), Paragraph("<font color='#059669'><b>ACCEPTED</b></font>", styles['TableCellBold']), Paragraph("Distance <= 100.0m threshold -> Proceed to Sequence check.", styles['TableCell'])],
        [Paragraph("Exact Boundary", styles['TableCellBold']), Paragraph("100.0 meters", styles['TableCell']), Paragraph("<font color='#059669'><b>ACCEPTED</b></font>", styles['TableCellBold']), Paragraph("Boundary edge case -> Proceed to Sequence check.", styles['TableCell'])],
        [Paragraph("Outside Venue", styles['TableCellBold']), Paragraph("101.0 meters", styles['TableCell']), Paragraph("<font color='#DC2626'><b>REJECTED</b></font>", styles['TableCellBold']), Paragraph("Exceeds 100.0m threshold -> Raise HTTP 422 Out of Bounds.", styles['TableCell'])],
        [Paragraph("Client Clock Drift", styles['TableCellBold']), Paragraph("Any client timestamp", styles['TableCell']), Paragraph("<font color='#D97706'><b>IGNORED</b></font>", styles['TableCellBold']), Paragraph("Server <code>datetime.utcnow()</code> is the sole authoritative timestamp.", styles['TableCell'])],
        [Paragraph("Daily Work Duration", styles['TableCellBold']), Paragraph("Total >= 300 mins (5h)", styles['TableCell']), Paragraph("<font color='#059669'><b>PRESENT</b></font>", styles['TableCellBold']), Paragraph("Student is marked Present for the calendar day.", styles['TableCell'])],
        [Paragraph("Short Duration", styles['TableCellBold']), Paragraph("Total = 299 mins (4h 59m)", styles['TableCell']), Paragraph("<font color='#DC2626'><b>ABSENT</b></font>", styles['TableCellBold']), Paragraph("Fails 300-minute threshold -> Student marked Absent.", styles['TableCell'])]
    ]
    t_rules = Table(rules_data, colWidths=[100, 110, 100, 194], repeatRows=1)
    t_rules.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_rules)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 6: RELATIONAL DATABASE ARCHITECTURE (ALL 27 ENTITIES)
    # =========================================================================
    story.append(Paragraph("6. Relational Database Architecture & Entity Specifications", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "The Netlink persistence layer consists of <b>27 normalized relational tables</b> designed for PostgreSQL/Supabase. "
        "The schema strictly enforces primary keys, foreign keys with referential actions (CASCADE / SET NULL), "
        "unique constraints, check constraints, and performance indexes.",
        styles['BodyRegular']
    ))

    db_entities = [
        ("1. users", "System identity accounts. Stores id (UUID PK), email (unique), full_name, role (STUDENT, MENTOR, HR, SUPER_ADMIN), phone, avatar_url, is_active, created_at."),
        ("2. students", "Trainee profile records. Stores user_id (FK users, unique), roll_number (unique), program_id (FK programs), batch_id (FK batches), mentor_id (FK users), college, degree, phone, status (ACTIVE, PROBATION, COMPLETED, DROPPED), career_stage."),
        ("3. programs", "Curriculum program definitions. Stores id (UUID PK), title, code (unique), description, duration_weeks, max_students, program_type, skills, is_active, created_by (FK users)."),
        ("4. batches", "Program cohorts. Stores id (UUID PK), program_id (FK programs), name, batch_type (TECH_MASTER, SHORT_DURATION, INTERNSHIP), training_duration_months, internship_duration_months, start_date, end_date, geofence_id (FK geofences), mentor_id (FK users), status (UPCOMING, ACTIVE, COMPLETED)."),
        ("5. geofences", "Physical venue coordinates. Stores id (UUID PK), name, center_latitude, center_longitude, radius_meters (default 100.0), address, is_active."),
        ("6. devices", "Registered hardware devices. Stores id (UUID PK), user_id (FK users), device_fingerprint, device_name, device_type, os_info, browser_info, status (PENDING, APPROVED, REJECTED), approved_by (FK users), approved_at."),
        ("7. consents", "Biometric GDPR/DPDP consent logs. Stores id (UUID PK), user_id (FK users), consent_type (FACE_BIOMETRIC), is_granted (bool), ip_address, user_agent, granted_at, revoked_at."),
        ("8. face_templates", "Enrolled facial feature embeddings. Stores id (UUID PK), user_id (FK users, unique), embedding_vector (512-d float array / serialized vector), confidence_score, enrolled_by (FK users), created_at."),
        ("9. attendance_events", "Individual raw punch events. Stores id (UUID PK), student_id (FK students), event_type (PUNCH_IN, PUNCH_OUT), timestamp (server UTC), latitude, longitude, distance_meters, face_match_score, device_id (FK devices), status (VERIFIED, REJECTED)."),
        ("10. attendance_daily_records", "Aggregated calendar day records. Stores id (UUID PK), student_id (FK students), date (Date), total_minutes (int), status (PRESENT, ABSENT, INCOMPLETE, ON_LEAVE), is_regularized (bool), regularized_by (FK users), override_reason."),
        ("11. regularization_requests", "Punch correction tickets. Stores id (UUID PK), student_id (FK students), attendance_date (Date), requested_punch_in, requested_punch_out, reason, status (PENDING, APPROVED, REJECTED), reviewer_id (FK users), review_notes."),
        ("12. tasks", "Technical assignments. Stores id (UUID PK), batch_id (FK batches), title, description, deadline (DateTime), max_score, skill_tags, created_by (FK users), status (PUBLISHED, DRAFT, CLOSED)."),
        ("13. task_submissions", "Student deliverables. Stores id (UUID PK), task_id (FK tasks), student_id (FK students), submission_text, repo_url, live_demo_url, file_attachment_url, submitted_at, score, feedback, graded_by (FK users), graded_at."),
        ("14. curriculum_topics", "Syllabus topics. Stores id (UUID PK), program_id (FK programs), track_name, module_name, topic_title, sequence_order, estimated_hours, description."),
        ("15. curriculum_progress", "Trainee curriculum progress. Stores id (UUID PK), student_id (FK students), topic_id (FK curriculum_topics), status (NOT_STARTED, IN_PROGRESS, COMPLETED), completed_at, mentor_verified_by (FK users)."),
        ("16. calendar_events", "Academic & session events. Stores id (UUID PK), batch_id (FK batches), event_title, event_type (LECTURE, LAB, HOLIDAY, DEMO_DAY, EXAM), start_time, end_time, location, meeting_link, is_mandatory."),
        ("17. trainer_leaves", "Mentor leave management. Stores id (UUID PK), trainer_id (FK users), start_date, end_date, reason, substitute_trainer_id (FK users), status (PENDING, APPROVED, REJECTED), approved_by (FK users)."),
        ("18. institution_trainings", "University partnership MoUs. Stores id (UUID PK), institution_name, college_code, contact_person, contact_email, mou_signed_date, program_name, total_enrolled, status (ACTIVE, COMPLETED)."),
        ("19. institution_students", "College roster mapping. Stores id (UUID PK), institution_id (FK institution_trainings), student_id (FK students), college_roll_number, semester, branch."),
        ("20. student_fee_payments", "Tuition financial ledger. Stores id (UUID PK), student_id (FK students), total_fee_amount, amount_paid, pending_balance, payment_mode, transaction_reference, payment_date, receipt_number, status (PAID, PARTIAL, OVERDUE)."),
        ("21. issued_letters", "Official letters. Stores id (UUID PK), student_id (FK students), letter_type (OFFER_LETTER, COMPLETION, BONAFIDE, RECOMMENDATION, WARNING, NOC), letter_reference_number, issue_date, content_json, document_url, issued_by (FK users)."),
        ("22. no_dues_requests", "Exit clearance pipeline. Stores id (UUID PK), student_id (FK students), request_date, mentor_status (PENDING, APPROVED), assets_status, accounts_status, hr_status, overall_status (IN_PROGRESS, CLEARED, REJECTED), remarks."),
        ("23. no_dues_template_options", "Configurable department checklist items for exit clearance."),
        ("24. issued_certificates", "Graduation certificates. Stores id (UUID PK), student_id (FK students), certificate_type, certificate_number (unique), issue_date, verification_hash, pdf_url, issued_by (FK users)."),
        ("25. mentor_feedbacks", "Qualitative 1-on-1 reviews. Stores id (UUID PK), student_id (FK students), mentor_id (FK users), review_date, technical_rating (1-5), soft_skills_rating (1-5), attendance_punctuality_rating (1-5), qualitative_comments, action_items."),
        ("26. notifications", "In-app notifications. Stores id (UUID PK), user_id (FK users), title, message, notification_type, is_read (bool), action_url, created_at."),
        ("27. audit_logs", "Immutable security ledger. Stores id (UUID PK), actor_id (FK users), action, entity_type, entity_id, ip_address, old_values (JSON), new_values (JSON), created_at.")
    ]

    for entity_name, entity_desc in db_entities:
        story.append(Paragraph(f"<b>{entity_name}</b>: <font color='#1E293B'>{entity_desc}</font>", styles['BodyRegular']))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 7: REST API SPECIFICATIONS
    # =========================================================================
    story.append(Paragraph("7. RESTful API Architecture & Endpoint Taxonomy", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "All endpoints follow RESTful conventions under the prefix <code>/api/v1</code>. Request and response bodies "
        "are strictly validated using Pydantic V2 models. Standard HTTP error codes (400, 401, 403, 404, 422, 500) "
        "return structured RFC-7807 compatible error payloads.",
        styles['BodyRegular']
    ))

    api_data = [
        [Paragraph("HTTP & Path", styles['TableHead']), Paragraph("Required Role", styles['TableHead']), Paragraph("Request / Payload Scope", styles['TableHead']), Paragraph("Response Description", styles['TableHead'])],
        [Paragraph("POST /api/v1/auth/login", styles['TableCellMono']), Paragraph("Public", styles['TableCellBold']), Paragraph("{email, password}", styles['TableCell']), Paragraph("JWT token, user profile, role claims.", styles['TableCell'])],
        [Paragraph("GET /api/v1/students/me", styles['TableCellMono']), Paragraph("STUDENT", styles['TableCellBold']), Paragraph("Bearer Token (Self)", styles['TableCell']), Paragraph("Student profile, batch, program, attendance summary.", styles['TableCell'])],
        [Paragraph("GET /api/v1/students", styles['TableCellMono']), Paragraph("MENTOR, HR, ADMIN", styles['TableCellBold']), Paragraph("?page, ?batch_id, ?search", styles['TableCell']), Paragraph("Paginated student records (mentor batch-filtered).", styles['TableCell'])],
        [Paragraph("POST /api/v1/attendance/punch", styles['TableCellMono']), Paragraph("STUDENT", styles['TableCellBold']), Paragraph("{lat, lon, face_frame, device_id}", styles['TableCell']), Paragraph("Punch verification result, distance, event timestamp.", styles['TableCell'])],
        [Paragraph("GET /api/v1/attendance/me", styles['TableCellMono']), Paragraph("STUDENT", styles['TableCellBold']), Paragraph("?month, ?year (Self)", styles['TableCell']), Paragraph("Daily records, total hours, present/absent stats.", styles['TableCell'])],
        [Paragraph("POST /api/v1/attendance/regularize", styles['TableCellMono']), Paragraph("STUDENT", styles['TableCellBold']), Paragraph("{date, requested_in, requested_out, reason}", styles['TableCell']), Paragraph("Created ticket with PENDING status.", styles['TableCell'])],
        [Paragraph("POST /api/v1/attendance/override", styles['TableCellMono']), Paragraph("HR, SUPER_ADMIN", styles['TableCellBold']), Paragraph("{student_id, date, status, reason}", styles['TableCell']), Paragraph("Overridden record; produces immutable AuditLog.", styles['TableCell'])],
        [Paragraph("POST /api/v1/devices/register", styles['TableCellMono']), Paragraph("STUDENT", styles['TableCellBold']), Paragraph("{fingerprint, device_name, os_info}", styles['TableCell']), Paragraph("Device bound or set to PENDING approval.", styles['TableCell'])],
        [Paragraph("POST /api/v1/consents", styles['TableCellMono']), Paragraph("STUDENT", styles['TableCellBold']), Paragraph("{consent_type: 'FACE_BIOMETRIC', granted: true}", styles['TableCell']), Paragraph("Consent recorded with IP & UTC timestamp.", styles['TableCell'])],
        [Paragraph("POST /api/v1/tasks", styles['TableCellMono']), Paragraph("MENTOR, HR, ADMIN", styles['TableCellBold']), Paragraph("{batch_id, title, deadline, max_score, tags}", styles['TableCell']), Paragraph("Published task broadcast to batch students.", styles['TableCell'])],
        [Paragraph("POST /api/v1/tasks/{id}/submit", styles['TableCellMono']), Paragraph("STUDENT", styles['TableCellBold']), Paragraph("{submission_text, repo_url, demo_url}", styles['TableCell']), Paragraph("Submission receipt with timestamp.", styles['TableCell'])],
        [Paragraph("POST /api/v1/letters/generate", styles['TableCellMono']), Paragraph("HR, SUPER_ADMIN", styles['TableCellBold']), Paragraph("{student_id, letter_type, template_id}", styles['TableCell']), Paragraph("Generated letter metadata with signed PDF link.", styles['TableCell'])],
        [Paragraph("POST /api/v1/no-dues/request", styles['TableCellMono']), Paragraph("STUDENT", styles['TableCellBold']), Paragraph("{student_id} (Initiate Exit Clearance)", styles['TableCell']), Paragraph("Multi-department clearance pipeline ticket.", styles['TableCell'])],
        [Paragraph("GET /api/v1/admin/audit-logs", styles['TableCellMono']), Paragraph("SUPER_ADMIN", styles['TableCellBold']), Paragraph("?actor_id, ?action, ?date_range", styles['TableCell']), Paragraph("Immutable security ledger entries.", styles['TableCell'])]
    ]

    t_api = Table(api_data, colWidths=[150, 90, 134, 130], repeatRows=1)
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 8: SECURITY, PRIVACY & COMPLIANCE
    # =========================================================================
    story.append(Paragraph("8. Security, Biometric Consent, Data Isolation & Privacy", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "<b>8.1 Zero Client Trust Principle:</b> In accordance with enterprise cybersecurity guidelines, the client device "
        "is treated as inherently untrusted. Geolocation coordinates, hardware fingerprints, and camera captures "
        "are rigorously re-validated on the server. Client-submitted timestamps and distance calculations are completely discarded.",
        styles['BodyRegular']
    ))
    story.append(Paragraph(
        "<b>8.2 Biometric Privacy & DPDP/GDPR Compliance:</b><br/>"
        "• <b>Explicit Consent Ledger:</b> Prior to capturing any camera frame, the system records explicit, opt-in consent.<br/>"
        "• <b>Mathematical Embeddings Only:</b> Raw facial photos are processed in memory and instantly discarded. Only 512-dimensional normalized vectors are retained.<br/>"
        "• <b>Encryption at Rest:</b> Biometric tables are encrypted using AES-256 in PostgreSQL.<br/>"
        "• <b>Right to Revoke:</b> Trainees can revoke biometric consent at any time, requiring HR transition to supervised PIN or manual verification.",
        styles['BodyRegular']
    ))
    story.append(Paragraph(
        "<b>8.3 Immutable Audit Logging:</b> Any sensitive operation—including role modifications, manual attendance overrides, "
        "device swap approvals, or fee edits—automatically writes a record to the <code>audit_logs</code> table. "
        "Records cannot be updated or deleted via application APIs.",
        styles['BodyRegular']
    ))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 9: ROADMAP & AI ETHICS
    # =========================================================================
    story.append(Paragraph("9. Multi-Phase System Roadmap & AI Advisory Framework", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    roadmap_data = [
        [Paragraph("Phase", styles['TableHead']), Paragraph("Scope & Core Modules", styles['TableHead']), Paragraph("Status & Target Release", styles['TableHead'])],
        [
            Paragraph("<b>Phase 1: Core Lifecycle MVP</b>", styles['TableCellBold']),
            Paragraph("Authentication & RBAC, Student Profiles, Program/Batch Scheduling, Geofenced Biometric Attendance, Task Submissions & Grading, Skill Radar Tracking, System Audit Logs.", styles['TableCell']),
            Paragraph("<font color='#059669'><b>COMPLETED & ACTIVE</b></font><br/>Production Local & Cloud", styles['TableCell'])
        ],
        [
            Paragraph("<b>Phase 2: Enterprise Operations Suite</b>", styles['TableCellBold']),
            Paragraph("Institutional College Partnerships, Fee & Installment Accounting, Automated Digital Letter Issuance (Offer, Completion, Bonafide), Multi-Department No-Dues Clearance, Trainer Leave & Substitute Management, Academic Calendar Scheduling.", styles['TableCell']),
            Paragraph("<font color='#0284C7'><b>PRODUCTION DEPLOYED</b></font><br/>Current Active Baseline", styles['TableCell'])
        ],
        [
            Paragraph("<b>Phase 3: AI Advisory Intelligence</b>", styles['TableCellBold']),
            Paragraph("Groq LPU + LangChain Integration. AI Student Progress Summaries, Skill Gap Identification, Automated Curriculum Recommendations, Mentor Feedback Drafting Assistance.", styles['TableCell']),
            Paragraph("<font color='#D97706'><b>PHASED INTEGRATION</b></font><br/>Subject to AI Ethics Guardrails", styles['TableCell'])
        ]
    ]

    t_road = Table(roadmap_data, colWidths=[120, 260, 124])
    t_road.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_road)
    story.append(Spacer(1, 10))

    # AI Safety Box
    ai_box = [
        [Paragraph("<b>CRITICAL AI ETHICAL & LEGAL BOUNDARY:</b><br/>"
                   "The AI layer (Phase 3) is strictly designed as an <b>Advisory Assistant</b>. "
                   "<b>AI MUST NEVER AUTOMATICALLY EXECUTE EMPLOYMENT, TERMINATION, ACADEMIC DISMISSAL, "
                   "GRADUATION, OR FINAL CERTIFICATION DECISIONS.</b> All high-stakes decisions mandate "
                   "direct Human-in-the-Loop review and signature by an authorized Mentor or HR Manager.", styles['CalloutText'])]
    ]
    t_ai = Table(ai_box, colWidths=[504])
    t_ai.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEE2E2")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#EF4444")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_ai)
    story.append(Spacer(1, 15))

    # =========================================================================
    # SECTION 10: NON-FUNCTIONAL REQUIREMENTS & SLAS
    # =========================================================================
    story.append(Paragraph("10. System Quality Attributes & Performance SLAs", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    nfr_data = [
        [Paragraph("Attribute", styles['TableHead']), Paragraph("Specification Metric", styles['TableHead']), Paragraph("Verification / SLA Target", styles['TableHead'])],
        [Paragraph("<b>Haversine Geofence Latency</b>", styles['TableCellBold']), Paragraph("Time to compute distance & boundary check on server.", styles['TableCell']), Paragraph("< 50 ms (99th percentile)", styles['TableCell'])],
        [Paragraph("<b>Biometric Match Latency</b>", styles['TableCellBold']), Paragraph("Vector cosine similarity & liveness computation roundtrip.", styles['TableCell']), Paragraph("< 1,200 ms total roundtrip", styles['TableCell'])],
        [Paragraph("<b>Concurrent Attendance Spikes</b>", styles['TableCellBold']), Paragraph("Simultaneous punches during morning 15-minute arrival window.", styles['TableCell']), Paragraph("Support 500+ concurrent trainees without queue degradation", styles['TableCell'])],
        [Paragraph("<b>System Availability</b>", styles['TableCellBold']), Paragraph("Uptime of API endpoints and database cluster.", styles['TableCell']), Paragraph("99.9% uptime (Excluding scheduled maintenance)", styles['TableCell'])],
        [Paragraph("<b>Disaster Recovery (RPO / RTO)</b>", styles['TableCellBold']), Paragraph("Recovery Point Objective / Recovery Time Objective.", styles['TableCell']), Paragraph("RPO < 15 minutes; RTO < 1 hour via automated backups", styles['TableCell'])],
        [Paragraph("<b>Cross-Platform Compatibility</b>", styles['TableCellBold']), Paragraph("Frontend responsiveness and camera streaming.", styles['TableCell']), Paragraph("Chrome 90+, Safari 14+, Edge, Android WebView, iOS Safari", styles['TableCell'])]
    ]
    t_nfr = Table(nfr_data, colWidths=[130, 210, 164], repeatRows=1)
    t_nfr.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_nfr)
    story.append(Spacer(1, 15))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 11: SIGN-OFF & GOVERNANCE
    # =========================================================================
    story.append(Paragraph("11. Sign-Off, Governance & Operational Approval Sheet", styles['SecHeader']))
    story.append(HRFlowable(width="100%", thickness=1, color=c_accent, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "By signing below, designated organizational stakeholders certify that this Product Requirements Document represents the complete, "
        "approved, and authoritative functional, security, and technical specification for the Netlink Platform.",
        styles['BodyRegular']
    ))
    story.append(Spacer(1, 6))

    sign_data = [
        [Paragraph("Stakeholder Role", styles['TableHead']), Paragraph("Designated Name", styles['TableHead']), Paragraph("Signature / Approval Status", styles['TableHead']), Paragraph("Date", styles['TableHead'])],
        [Paragraph("<b>Lead Product Manager</b>", styles['TableCellBold']), Paragraph("Talent Operations Lead", styles['TableCell']), Paragraph("<font color='#059669'><b>APPROVED (Digital Sign-off)</b></font>", styles['TableCellBold']), Paragraph("12-Oct-2026", styles['TableCell'])],
        [Paragraph("<b>Lead Solutions Architect</b>", styles['TableCellBold']), Paragraph("Platform Engineering Lead", styles['TableCell']), Paragraph("<font color='#059669'><b>APPROVED (Digital Sign-off)</b></font>", styles['TableCellBold']), Paragraph("12-Oct-2026", styles['TableCell'])],
        [Paragraph("<b>Head of HR & Training</b>", styles['TableCellBold']), Paragraph("VP Human Capital", styles['TableCell']), Paragraph("<font color='#059669'><b>APPROVED (Digital Sign-off)</b></font>", styles['TableCellBold']), Paragraph("13-Oct-2026", styles['TableCell'])],
        [Paragraph("<b>Information Security Officer</b>", styles['TableCellBold']), Paragraph("Chief Security Officer", styles['TableCell']), Paragraph("<font color='#059669'><b>APPROVED (Biometrics Tier-1)</b></font>", styles['TableCellBold']), Paragraph("13-Oct-2026", styles['TableCell'])]
    ]
    t_sign = Table(sign_data, colWidths=[130, 134, 150, 90], repeatRows=1)
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_sign)
    story.append(Spacer(1, 14))

    # Revision History
    story.append(Paragraph("<b>11.1 Document Revision & Change Log:</b>", styles['SubSecHeader']))
    rev_data = [
        [Paragraph("Version", styles['TableHead']), Paragraph("Release Date", styles['TableHead']), Paragraph("Author / Contributor", styles['TableHead']), Paragraph("Summary of Changes", styles['TableHead'])],
        [Paragraph("v1.0", styles['TableCellBold']), Paragraph("15-Sep-2026", styles['TableCell']), Paragraph("Architecture Core Team", styles['TableCell']), Paragraph("Initial baseline specification for attendance and tasks.", styles['TableCell'])],
        [Paragraph("v2.0", styles['TableCellBold']), Paragraph("28-Sep-2026", styles['TableCell']), Paragraph("Platform Engineering", styles['TableCell']), Paragraph("Integrated 11-step biometric verification and Haversine geofence.", styles['TableCell'])],
        [Paragraph("v2.4", styles['TableCellBold']), Paragraph("13-Oct-2026", styles['TableCell']), Paragraph("Talent Ops & Tech Lead", styles['TableCell']), Paragraph("Added Institution Training, No-Dues clearance, Letter engine, Fees & Calendar.", styles['TableCell'])]
    ]
    t_rev = Table(rev_data, colWidths=[60, 80, 134, 230], repeatRows=1)
    t_rev.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_rev)
    story.append(Spacer(1, 14))

    # Governance Notice Box
    gov_box = [
        [Paragraph("<b>MANDATORY CHANGE CONTROL NOTICE:</b><br/>"
                   "Any modification to biometric thresholds (face similarity < 0.82), geofence radius (> 100m), "
                   "daily attendance calculation logic (< 300 minutes), or role-based API permissions requires formal "
                   "Engineering Change Order (ECO) review and joint approval from the Information Security Officer "
                   "and Head of HR Operations.", styles['CalloutText'])]
    ]
    t_gov = Table(gov_box, colWidths=[504])
    t_gov.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_gov)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PRD PDF at: {output_path}")

if __name__ == "__main__":
    target_pdf = sys.argv[1] if len(sys.argv) > 1 else "Netlink_Platform_Product_Requirements_Document_PRD.pdf"
    create_prd_pdf(target_pdf)
