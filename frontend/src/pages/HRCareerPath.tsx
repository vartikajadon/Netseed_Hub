import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Student } from '../types';
import {
  GraduationCap, Code, Database, Server, Cpu, ShieldCheck,
  CheckCircle2, ArrowRight, Sparkles, BookOpen, Target, Award, Terminal,
  Upload, Download, Plus, FileText, AlertCircle, Layers, Check, Users
} from 'lucide-react';

interface CareerStage {
  stepNumber: number;
  title: string;
  duration: string;
  level: string;
  description: string;
  keySkills: string[];
  milestoneProject: string;
}

interface CourseCareerPath {
  id: string;
  courseName: string;
  category: string;
  totalDuration: string;
  targetRole: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  stages: CareerStage[];
  isCustom?: boolean;
}

const DEFAULT_CAREER_PATHS: CourseCareerPath[] = [
  {
    id: 'fullstack',
    courseName: 'Full-Stack Web Engineering (React + Python FastAPI)',
    category: 'Web Development',
    totalDuration: '1 Year (6m Training + 6m Internship)',
    targetRole: 'Junior / Mid-level Full-Stack Developer',
    description: 'End-to-end career progression roadmap for full-stack modern web application engineering.',
    icon: Code,
    stages: [
      {
        stepNumber: 1,
        title: 'Stage 1: Web Fundamentals & Programming Foundations',
        duration: 'Month 1',
        level: 'Scratch / Beginner',
        description: 'Master core web technologies, semantic markup, responsive UI layouts, and Git version control.',
        keySkills: ['HTML5', 'CSS3 & Flexbox/Grid', 'JavaScript ES6+', 'DOM Manipulation', 'Git & GitHub Workflow'],
        milestoneProject: 'Responsive Corporate Landing Page & Interactive JS Portfolio',
      },
      {
        stepNumber: 2,
        title: 'Stage 2: Modern Frontend Engineering with React & TypeScript',
        duration: 'Month 2 – 3',
        level: 'Intermediate',
        description: 'Build component-driven single-page applications, client-side routing, and state management.',
        keySkills: ['React 18', 'TypeScript', 'TailwindCSS', 'Context API & Redux', 'REST API Integration'],
        milestoneProject: 'E-Commerce Dashboard & SaaS Frontend Interface',
      },
      {
        stepNumber: 3,
        title: 'Stage 3: Backend API Development with Python FastAPI & Databases',
        duration: 'Month 4 – 5',
        level: 'Advanced',
        description: 'Design RESTful microservices, asynchronous request handlers, ORM models, and JWT authentication.',
        keySkills: ['FastAPI / Python', 'PostgreSQL & SQLite', 'SQLAlchemy ORM', 'JWT Security', 'Pydantic Schemas'],
        milestoneProject: 'Secure Authentication & Lifecycle Management API Engine',
      },
      {
        stepNumber: 4,
        title: 'Stage 4: System Architecture, Testing & DevOps Deployment',
        duration: 'Month 6',
        level: 'Pre-Professional',
        description: 'Containerize web applications, write unit tests with Pytest, setup CI/CD pipelines and deployment.',
        keySkills: ['Docker Containerization', 'Pytest & Vitest', 'GitHub Actions CI/CD', 'AWS / Vercel Deployments'],
        milestoneProject: 'Production-Ready Microservices Deployment Pipeline',
      },
      {
        stepNumber: 5,
        title: 'Stage 5: Netlink Corporate Traineeship & Live Client Internship',
        duration: 'Month 7 – 11',
        level: 'Industry Trainee',
        description: 'Work on live enterprise Netlink software projects, peer code reviews, and Agile sprint workflows.',
        keySkills: ['Agile Scrum & Jira', 'Code Reviews', 'Biometric & IoT API Integration', 'Production Bug Fixing'],
        milestoneProject: 'Enterprise Attendance & Lifecycle Trainee Platform',
      },
      {
        stepNumber: 6,
        title: 'Stage 6: Placement Preparation, Graduation & Full-Time Role',
        duration: 'Month 12',
        level: 'Graduate Engineer',
        description: 'Final resume polishing, mock technical interviews, system design reviews, and placement drive.',
        keySkills: ['Data Structures & Algorithms', 'System Design Basics', 'Mock Technical Interviews', 'Corporate Placement'],
        milestoneProject: 'Final Capstone Presentation & Technical Placement Clearance',
      },
    ],
  },
  {
    id: 'datascience',
    courseName: 'Data Science, AI & Machine Learning Engineering',
    category: 'Data & AI',
    totalDuration: '1 Year (6m Training + 6m Internship)',
    targetRole: 'Associate Data Scientist / ML Engineer',
    description: 'Complete scratch-to-end learning path for statistical modeling, deep learning, and AI application engineering.',
    icon: Cpu,
    stages: [
      {
        stepNumber: 1,
        title: 'Stage 1: Python Programming & Mathematics for Data Science',
        duration: 'Month 1',
        level: 'Scratch / Beginner',
        description: 'Learn Python data structures, linear algebra basics, probability, and numerical computing.',
        keySkills: ['Python 3', 'NumPy', 'Pandas', 'Descriptive Statistics', 'Linear Algebra'],
        milestoneProject: 'Exploratory Data Analysis (EDA) of Global Financial Datasets',
      },
      {
        stepNumber: 2,
        title: 'Stage 2: Data Wrangling, SQL Databases & Visual Storytelling',
        duration: 'Month 2 – 3',
        level: 'Intermediate',
        description: 'Query complex relational databases, clean messy data, and create compelling interactive dashboards.',
        keySkills: ['PostgreSQL & SQL Queries', 'Matplotlib & Seaborn', 'Power BI / Tableau', 'ETL Data Pipelines'],
        milestoneProject: 'Enterprise Sales & Student Performance Business Dashboard',
      },
      {
        stepNumber: 3,
        title: 'Stage 3: Supervised & Unsupervised Machine Learning Algorithms',
        duration: 'Month 4 – 5',
        level: 'Advanced',
        description: 'Implement classification, regression, clustering, and model evaluation metrics using Scikit-Learn.',
        keySkills: ['Scikit-Learn', 'Regression & Classification', 'Decision Trees & Random Forest', 'K-Means Clustering', 'Cross-Validation'],
        milestoneProject: 'Customer Churn Prediction & Fraud Detection Model',
      },
      {
        stepNumber: 4,
        title: 'Stage 4: Deep Learning, Computer Vision & Generative AI (LLMs)',
        duration: 'Month 6',
        level: 'Pre-Professional',
        description: 'Train neural networks, convolutional neural networks (CNNs), and fine-tune Large Language Models.',
        keySkills: ['PyTorch & TensorFlow', 'CNN & Image Classification', 'NLP & Transformers', 'OpenAI API & LangChain'],
        milestoneProject: 'Facial Liveness Verification & AI Document Summarizer',
      },
      {
        stepNumber: 5,
        title: 'Stage 5: Corporate ML Internship & Production MLOps Deployment',
        duration: 'Month 7 – 11',
        level: 'Industry Trainee',
        description: 'Deploy machine learning models as REST APIs using FastAPI, Docker, and monitor model drift.',
        keySkills: ['FastAPI ML Endpoints', 'MLflow Model Tracking', 'Docker Containers', 'Cloud Deployment (AWS SageMaker)'],
        milestoneProject: 'Live Production ML Inference Pipeline',
      },
      {
        stepNumber: 6,
        title: 'Stage 6: Final Capstone & Corporate Data Science Placement',
        duration: 'Month 12',
        level: 'Graduate Engineer',
        description: 'Portfolio review, competitive Kaggle/LeetCode problem solving, and corporate recruitment drives.',
        keySkills: ['Advanced ML Case Studies', 'Mock Data Science Interviews', 'Resume & Portfolio Review', 'Corporate Placement'],
        milestoneProject: 'End-to-End AI Product Capstone Defense',
      },
    ],
  },
  {
    id: 'clouddevops',
    courseName: 'Cloud Infrastructure, DevOps & Cybersecurity',
    category: 'Cloud & Security',
    totalDuration: '1 Year (6m Training + 6m Internship)',
    targetRole: 'Cloud Engineer / DevOps Specialist',
    description: 'Comprehensive roadmap covering Linux administration, AWS cloud, Kubernetes, CI/CD, and security controls.',
    icon: Server,
    stages: [
      {
        stepNumber: 1,
        title: 'Stage 1: Linux System Administration & Networking Basics',
        duration: 'Month 1',
        level: 'Scratch / Beginner',
        description: 'Master Linux terminal navigation, Bash shell scripting, process management, and networking protocols.',
        keySkills: ['Linux CLI (Ubuntu/RHEL)', 'Bash Scripting', 'TCP/IP, DNS & HTTP', 'SSH & File Permissions'],
        milestoneProject: 'Automated Server Maintenance & Backup Scripting Engine',
      },
      {
        stepNumber: 2,
        title: 'Stage 2: Cloud Infrastructure Foundations (Amazon Web Services)',
        duration: 'Month 2 – 3',
        level: 'Intermediate',
        description: 'Architect cloud infrastructure using EC2, VPC, S3, IAM roles, and load balancers.',
        keySkills: ['AWS EC2 & AMI', 'VPC Networking & Subnets', 'AWS S3 Storage', 'IAM Security Policies', 'Route 53 & ALB'],
        milestoneProject: 'High-Availability Multi-Tier Cloud Application Architecture',
      },
      {
        stepNumber: 3,
        title: 'Stage 3: Containerization & Orchestration with Docker & Kubernetes',
        duration: 'Month 4 – 5',
        level: 'Advanced',
        description: 'Build Docker containers, configure multi-container compositions, and manage Kubernetes clusters.',
        keySkills: ['Docker & Dockerfiles', 'Docker Compose', 'Kubernetes (K8s) Pods & Deployments', 'Helm Charts', 'Ingress Controllers'],
        milestoneProject: 'Microservices Deployment on Managed Kubernetes (EKS)',
      },
      {
        stepNumber: 4,
        title: 'Stage 4: Infrastructure as Code (IaC), CI/CD & Monitoring',
        duration: 'Month 6',
        level: 'Pre-Professional',
        description: 'Automate cloud provisioning with Terraform and configure continuous deployment with Jenkins / GitHub Actions.',
        keySkills: ['Terraform', 'GitHub Actions & Jenkins', 'Prometheus & Grafana', 'Log Analytics (ELK Stack)'],
        milestoneProject: 'Automated CI/CD Pipeline with Automated Infrastructure Provisioning',
      },
      {
        stepNumber: 5,
        title: 'Stage 5: Corporate Infrastructure Internship & Security Controls',
        duration: 'Month 7 – 11',
        level: 'Industry Trainee',
        description: 'Implement zero-trust security policies, SSL/TLS certificates, RBAC access controls, and audit logs.',
        keySkills: ['Zero-Trust Architecture', 'SSL/TLS & Secrets Management', 'Vulnerability Scanning', 'Audit Logging & Compliance'],
        milestoneProject: 'Production Infrastructure Hardening & Security Audit Compliance',
      },
      {
        stepNumber: 6,
        title: 'Stage 6: Placement Drive & DevOps Certification Placement',
        duration: 'Month 12',
        level: 'Graduate Engineer',
        description: 'Preparation for AWS Certified Solutions Architect / CKA exams and corporate hiring placement drives.',
        keySkills: ['AWS / CKA Exam Prep', 'Infrastructure System Design', 'Mock Technical Interviews', 'Corporate Placement'],
        milestoneProject: 'DevOps Architect Capstone & Corporate Job Offer',
      },
    ],
  },
];

export const HRCareerPath: React.FC = () => {
  const { user, role } = useAuth();
  const isHRorAdmin = role === 'HR' || role === 'SUPER_ADMIN';
  const isMentor = role === 'MENTOR';
  const isStudent = role === 'STUDENT';

  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [careerPaths, setCareerPaths] = useState<CourseCareerPath[]>(DEFAULT_CAREER_PATHS);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('fullstack');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Import Curriculum Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCourseId, setImportCourseId] = useState('fullstack');
  const [customCourseId, setCustomCourseId] = useState('');
  const [importCourseName, setImportCourseName] = useState('');
  const [importCategory, setImportCategory] = useState('Web Development');
  const [importTotalDuration, setImportTotalDuration] = useState('1 Year (6m Training + 6m Internship)');
  const [importTargetRole, setImportTargetRole] = useState('Full-Stack Developer');
  const [importDescription, setImportDescription] = useState('');
  const [importStages, setImportStages] = useState<CareerStage[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch student profile and curriculums
  const loadData = async () => {
    try {
      setIsLoading(true);
      let studentData: Student | null = null;
      if (isStudent) {
        try {
          studentData = await api.get<Student>('/students/me');
          setStudentInfo(studentData);
        } catch {
          // Fallback if student not linked
        }
      }

      // Fetch imported curriculums from backend
      try {
        const storedCurriculums = await api.get<Record<string, any>>('/programs/curriculums');
        if (storedCurriculums && typeof storedCurriculums === 'object') {
          const merged = [...DEFAULT_CAREER_PATHS];
          Object.entries(storedCurriculums).forEach(([cId, cData]) => {
            const existingIdx = merged.findIndex((p) => p.id === cId);
            const pathObj: CourseCareerPath = {
              id: cId,
              courseName: cData.course_name || cId,
              category: cData.category || 'Specialization',
              totalDuration: cData.total_duration || '1 Year',
              targetRole: cData.target_role || 'Specialist',
              description: cData.description || '',
              icon: cId === 'fullstack' ? Code : cId === 'datascience' ? Cpu : Server,
              stages: cData.stages || [],
              isCustom: true,
            };

            if (existingIdx !== -1) {
              merged[existingIdx] = {
                ...merged[existingIdx],
                ...pathObj,
                icon: merged[existingIdx].icon || Code,
              };
            } else {
              merged.push(pathObj);
            }
          });
          setCareerPaths(merged);
        }
      } catch {
        // Fallback to default career paths
      }

      // If student, automatically determine registered course
      if (studentData) {
        const progName = (studentData.program?.title || studentData.batch?.name || '').toLowerCase();
        if (progName.includes('data') || progName.includes('ai') || progName.includes('ml')) {
          setSelectedCourseId('datascience');
        } else if (progName.includes('cloud') || progName.includes('devops') || progName.includes('security')) {
          setSelectedCourseId('clouddevops');
        } else {
          setSelectedCourseId('fullstack');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  // Determine registered course for student
  const registeredCourseName = studentInfo?.program?.title || studentInfo?.batch?.name || null;

  // Filter paths visible to student
  const visibleCareerPaths = isStudent && registeredCourseName
    ? careerPaths.filter((p) => {
        const pName = p.courseName.toLowerCase();
        const rName = registeredCourseName.toLowerCase();
        if (rName.includes('data') || rName.includes('ai') || rName.includes('ml')) {
          return p.id === 'datascience';
        }
        if (rName.includes('cloud') || rName.includes('devops')) {
          return p.id === 'clouddevops';
        }
        if (rName.includes('web') || rName.includes('full') || rName.includes('stack')) {
          return p.id === 'fullstack';
        }
        return pName.includes(rName) || rName.includes(p.id);
      }).length > 0
      ? careerPaths.filter((p) => {
          const rName = registeredCourseName.toLowerCase();
          if (rName.includes('data') || rName.includes('ai') || rName.includes('ml')) return p.id === 'datascience';
          if (rName.includes('cloud') || rName.includes('devops')) return p.id === 'clouddevops';
          return p.id === 'fullstack';
        })
      : careerPaths
    : careerPaths;

  const activePath = visibleCareerPaths.find((p) => p.id === selectedCourseId) || visibleCareerPaths[0] || careerPaths[0];

  // Parse JSON or CSV curriculum file
  const handleCurriculumFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = (evt.target?.result as string) || '';
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (parsed.course_id) setImportCourseId(parsed.course_id);
          if (parsed.course_name) setImportCourseName(parsed.course_name);
          if (parsed.category) setImportCategory(parsed.category);
          if (parsed.total_duration) setImportTotalDuration(parsed.total_duration);
          if (parsed.target_role) setImportTargetRole(parsed.target_role);
          if (parsed.description) setImportDescription(parsed.description);
          if (Array.isArray(parsed.stages) && parsed.stages.length > 0) {
            setImportStages(parsed.stages);
          } else {
            setImportError('JSON must include a "stages" array with stage details.');
          }
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV rows into stages
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length < 2) {
            setImportError('CSV file must have at least one header and one stage row.');
            return;
          }
          const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase());
          const getIdx = (alias: string[]) => rawHeaders.findIndex((h) => alias.some((a) => h.includes(a)));

          const titleIdx = getIdx(['title', 'stage', 'name']);
          const durIdx = getIdx(['duration', 'month', 'time']);
          const levelIdx = getIdx(['level', 'difficulty']);
          const descIdx = getIdx(['desc', 'description']);
          const skillsIdx = getIdx(['skills', 'topics', 'key skills']);
          const projectIdx = getIdx(['project', 'milestone']);

          const stages: CareerStage[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
            if (cols.length === 0 || cols.every((c) => c === '')) continue;

            stages.push({
              stepNumber: i,
              title: titleIdx !== -1 && cols[titleIdx] ? cols[titleIdx] : `Stage ${i}: Module Training`,
              duration: durIdx !== -1 && cols[durIdx] ? cols[durIdx] : `Month ${i}`,
              level: levelIdx !== -1 && cols[levelIdx] ? cols[levelIdx] : (i <= 2 ? 'Beginner' : i <= 4 ? 'Intermediate' : 'Advanced'),
              description: descIdx !== -1 && cols[descIdx] ? cols[descIdx] : 'Curriculum topic description and hands-on laboratory sessions.',
              keySkills: skillsIdx !== -1 && cols[skillsIdx] ? cols[skillsIdx].split(';').map((s) => s.trim()) : ['Core Concepts', 'Hands-on Labs'],
              milestoneProject: projectIdx !== -1 && cols[projectIdx] ? cols[projectIdx] : `Capstone Project Stage ${i}`,
            });
          }

          if (stages.length === 0) {
            setImportError('No valid stage rows found in CSV.');
            return;
          }
          setImportStages(stages);
        } else {
          setImportError('Unsupported file type. Please upload a .json or .csv curriculum file.');
        }
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse file.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCurriculum = async () => {
    const finalCourseId = importCourseId === 'custom' ? customCourseId.trim().toLowerCase() : importCourseId;
    if (!finalCourseId) {
      setImportError('Course ID is required.');
      return;
    }
    if (importStages.length === 0) {
      setImportError('At least one stage or module must be imported.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      const payload = {
        course_id: finalCourseId,
        course_name: importCourseName || finalCourseId,
        category: importCategory || 'General',
        total_duration: importTotalDuration || '1 Year',
        target_role: importTargetRole || 'Developer',
        description: importDescription || '',
        stages: importStages,
      };

      await api.post('/programs/curriculums/import', payload);
      setIsImportModalOpen(false);
      setImportStages([]);
      setImportFileName('');
      await loadData();
    } catch (err: any) {
      setImportError(err.message || 'Failed to save imported curriculum.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleJson = () => {
    const sample = {
      course_id: 'fullstack',
      course_name: 'Full-Stack Web Engineering',
      category: 'Web Development',
      total_duration: '1 Year (6m Training + 6m Internship)',
      target_role: 'Full-Stack Engineer',
      description: 'Step-by-step career progression roadmap for modern web engineering.',
      stages: [
        {
          stepNumber: 1,
          title: 'Stage 1: Web Fundamentals & JavaScript',
          duration: 'Month 1',
          level: 'Beginner',
          description: 'Core web architecture, semantic HTML, modern CSS and JavaScript ES6+.',
          keySkills: ['HTML5', 'CSS3', 'JavaScript ES6+', 'Git'],
          milestoneProject: 'Interactive Web Portfolio',
        },
        {
          stepNumber: 2,
          title: 'Stage 2: Frontend Engineering with React',
          duration: 'Month 2 – 3',
          level: 'Intermediate',
          description: 'Component lifecycles, hooks, single page application routing and TailwindCSS.',
          keySkills: ['React 18', 'TypeScript', 'TailwindCSS'],
          milestoneProject: 'SaaS Frontend Portal',
        },
      ],
    };
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'course_curriculum_template.json';
    link.click();
  };

  const downloadSampleCsv = () => {
    const headers = 'title,duration,level,description,keySkills,milestoneProject\n';
    const sample = 'Stage 1: Foundations,Month 1,Beginner,Programming basics and syntax,Python;Git;CLI,Terminal Game Project\nStage 2: Web & APIs,Month 2-3,Intermediate,RESTful API development and databases,FastAPI;PostgreSQL;Docker,Inventory Management API\n';
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'course_curriculum_template.csv';
    link.click();
  };

  return (
    <Layout>
      <div className="space-y-6 font-sans">
        {/* Page Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <GraduationCap className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                Course Curriculum & Trainee Career Roadmap
              </h1>
              {isStudent && (
                <Badge variant="success">Your Registered Course</Badge>
              )}
              {isMentor && (
                <Badge variant="info">Mentor Guided View</Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium max-w-2xl">
              {isStudent
                ? `Official learning roadmap and milestone requirements for your registered course (${registeredCourseName || activePath.courseName}).`
                : isMentor
                ? 'Curriculum syllabus, stage-by-stage learning milestones, and technical competencies for student mentorship.'
                : 'Detailed scratch-to-end career progression roadmaps, milestone projects, and curriculum import management.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isHRorAdmin && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setImportStages([]);
                  setImportFileName('');
                  setImportError(null);
                  setIsImportModalOpen(true);
                }}
                className="font-bold text-xs shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4 mr-1" />
                Import Curriculum
              </Button>
            )}
          </div>
        </div>

        {/* Course Selection Tabs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              {isStudent ? 'Enrolled Program Course' : 'Available Course Curriculums'}
            </h2>
            <span className="text-xs text-slate-500">
              Showing {visibleCareerPaths.length} {visibleCareerPaths.length === 1 ? 'course' : 'courses'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleCareerPaths.map((path) => {
              const PathIcon = path.icon || Code;
              const isSelected = path.id === activePath.id;
              const isStudentCourse = isStudent && registeredCourseName && path.id === activePath.id;

              return (
                <div
                  key={path.id}
                  onClick={() => setSelectedCourseId(path.id)}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all shadow-sm flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-500 ring-2 ring-indigo-500/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <PathIcon className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {path.isCustom && <Badge variant="warning">Imported</Badge>}
                        {isStudentCourse && <Badge variant="success">Enrolled</Badge>}
                        <Badge variant={isSelected ? 'info' : 'neutral'}>{path.category}</Badge>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3">{path.courseName}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">{path.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>{path.totalDuration}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Course Stage Timeline Card */}
        <Card
          title={`${activePath.courseName} — Detailed Scratch to End Curriculum`}
          subtitle={`Target Job Role: ${activePath.targetRole} | Total Duration: ${activePath.totalDuration}`}
        >
          <div className="space-y-6 pt-2">
            {activePath.stages.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No syllabus stages imported yet for this course.
                </p>
                {isHRorAdmin && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setImportCourseId(activePath.id);
                      setImportCourseName(activePath.courseName);
                      setIsImportModalOpen(true);
                    }}
                    className="mt-3 text-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Import Stages for {activePath.courseName}
                  </Button>
                )}
              </div>
            ) : (
              activePath.stages.map((stage) => (
                <div
                  key={stage.stepNumber}
                  className="relative pl-8 md:pl-10 pb-6 border-l-2 border-indigo-200 dark:border-indigo-900/60 last:border-l-0 last:pb-0"
                >
                  {/* Stage Circle Number Icon */}
                  <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-md ring-4 ring-white dark:ring-slate-900">
                    {stage.stepNumber}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {stage.title}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Duration: <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{stage.duration}</strong>
                        </div>
                      </div>
                      <Badge variant={stage.stepNumber === 6 ? 'success' : stage.stepNumber >= 4 ? 'info' : 'warning'}>
                        {stage.level}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {stage.description}
                    </p>

                    {/* Skills Acquired Chips */}
                    {stage.keySkills && stage.keySkills.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                          Key Skills & Modules Acquired:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {stage.keySkills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Milestone Project */}
                    {stage.milestoneProject && (
                      <div className="p-3 bg-white dark:bg-slate-950 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center gap-2.5 text-xs">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Stage Milestone Project: </span>
                          <strong className="text-slate-900 dark:text-slate-100 font-bold">{stage.milestoneProject}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Modal: Import Course Curriculum (HR / Admin) */}
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setImportStages([]);
            setImportFileName('');
            setImportError(null);
          }}
          title="Import Course Curriculum & Roadmap"
        >
          <div className="space-y-4 text-xs font-sans">
            {importError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {importError}
              </div>
            )}

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Curriculum Visibility
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Imported curriculums are synchronized with the backend database. They will be visible to mentors for trainee guidance and to all students registered in that specific course.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Target Course *
                </label>
                <select
                  value={importCourseId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setImportCourseId(id);
                    const match = careerPaths.find((p) => p.id === id);
                    if (match) {
                      setImportCourseName(match.courseName);
                      setImportCategory(match.category);
                      setImportTotalDuration(match.totalDuration);
                      setImportTargetRole(match.targetRole);
                      setImportDescription(match.description);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="fullstack">Full-Stack Web Engineering</option>
                  <option value="datascience">Data Science, AI & ML</option>
                  <option value="clouddevops">Cloud Infrastructure & DevOps</option>
                  <option value="custom">+ Create New Course Curriculum</option>
                </select>
              </div>

              {importCourseId === 'custom' && (
                <Input
                  label="Custom Course ID *"
                  placeholder="e.g. mobiledev or cybersec"
                  value={customCourseId}
                  onChange={(e) => setCustomCourseId(e.target.value)}
                  required
                />
              )}

              <Input
                label="Course Name / Title"
                placeholder="e.g. Full-Stack Web Engineering"
                value={importCourseName}
                onChange={(e) => setImportCourseName(e.target.value)}
              />

              <Input
                label="Category"
                placeholder="e.g. Web Development"
                value={importCategory}
                onChange={(e) => setImportCategory(e.target.value)}
              />

              <Input
                label="Total Program Duration"
                placeholder="e.g. 1 Year (6m Training + 6m Internship)"
                value={importTotalDuration}
                onChange={(e) => setImportTotalDuration(e.target.value)}
              />

              <Input
                label="Target Job Role"
                placeholder="e.g. Full-Stack Engineer"
                value={importTargetRole}
                onChange={(e) => setImportTargetRole(e.target.value)}
              />
            </div>

            {/* Template Download Buttons */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white">Sample Curriculum Templates</div>
                <div className="text-[11px] text-slate-500">Download formatted JSON or CSV template.</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleJson}
                  className="text-xs bg-white dark:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  JSON Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleCsv}
                  className="text-xs bg-white dark:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  CSV Template
                </Button>
              </div>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/50 transition-colors">
              <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {importFileName ? importFileName : 'Choose Curriculum File (.json or .csv)'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Accepts standard JSON or CSV curriculum definitions</p>
              <label className="mt-3 inline-block">
                <span className="cursor-pointer px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors">
                  Browse File
                </span>
                <input
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  className="hidden"
                  onChange={handleCurriculumFile}
                />
              </label>
            </div>

            {/* Stages Preview */}
            {importStages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>Parsed Stages Preview ({importStages.length} stages)</span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Save
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                  {importStages.map((st, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{st.title}</div>
                        <div className="text-[11px] text-slate-500">{st.duration} • {st.level}</div>
                      </div>
                      <Badge variant="info">{st.keySkills?.length || 0} skills</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportStages([]);
                  setImportFileName('');
                  setImportError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveCurriculum}
                isLoading={isImporting}
                disabled={importStages.length === 0}
                className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Import Curriculum ({importStages.length} Stages)
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};
