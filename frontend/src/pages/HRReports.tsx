import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { Student, PaginatedStudentList, formatBatchType } from '../types';
import {
  BarChart3, FileText, Download, Eye, RefreshCw, Search,
  CheckCircle2, Clock, Award, ShieldCheck, UserCheck
} from 'lucide-react';

interface StudentReportSummary {
  student: Student;
  attendancePercentage: number;
  totalWorkingHours: number;
  faceEnrollmentStatus: string;
  feesStatus: string;
  performanceGrade: string;
  generatedAt: string;
}

export const HRReports: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generated reports cache & active view modal
  const [generatedReports, setGeneratedReports] = useState<Record<string, StudentReportSummary>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<StudentReportSummary | null>(null);

  const fetchStudents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedStudentList>('/students?limit=200');
      setStudents(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student roster for report generation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const generateReportForStudent = (student: Student): StudentReportSummary => {
    setGeneratingId(student.id);

    // Mock calculated performance metrics for demonstration
    const attendancePct = student.enrollment_status === 'ACTIVE' ? 94.5 : 82.0;
    const workingHrs = student.enrollment_status === 'ACTIVE' ? 142.5 : 98.0;
    const grade = attendancePct >= 90 ? 'A+ (Excellent)' : attendancePct >= 80 ? 'B+ (Good)' : 'C (Needs Improvement)';

    const report: StudentReportSummary = {
      student,
      attendancePercentage: attendancePct,
      totalWorkingHours: workingHrs,
      faceEnrollmentStatus: student.face_enrollment_status,
      feesStatus: student.installment_type === 'TWO_INSTALLMENTS' ? '2 Installments (Active)' : 'Full Payment Verified',
      performanceGrade: grade,
      generatedAt: new Date().toLocaleString(),
    };

    setGeneratedReports((prev) => ({ ...prev, [student.id]: report }));
    setTimeout(() => setGeneratingId(null), 300);
    return report;
  };

  const handleDownloadSingleReport = (student: Student) => {
    const report = generatedReports[student.id] || generateReportForStudent(student);

    const csvContent = [
      ['FIELD', 'VALUE'],
      ['Student Roll Number', student.roll_number],
      ['Student Name', student.user?.full_name || 'N/A'],
      ['Email Address', student.user?.email || 'N/A'],
      ['Phone', student.contact_number || student.user?.phone || 'N/A'],
      ['Program Name', student.program?.title || 'Unassigned'],
      ['Batch Type', formatBatchType(student.batch_type)],
      ['Enrollment Status', student.enrollment_status],
      ['Attendance Rate', `${report.attendancePercentage}%`],
      ['Total Logged Hours', `${report.totalWorkingHours} Hours`],
      ['Face Biometric Status', report.faceEnrollmentStatus],
      ['Fees Structure', report.feesStatus],
      ['Performance Grade', report.performanceGrade],
      ['Report Generated At', report.generatedAt],
    ]
      .map((row) => row.map((val) => `"${val}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Student_Report_${student.roll_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllReports = () => {
    if (students.length === 0) return;

    const headers = [
      'Roll Number', 'Full Name', 'Email', 'Phone', 'Program', 'Batch Type',
      'Status', 'Attendance Rate', 'Total Hours', 'Biometrics', 'Report Date'
    ];

    const rows = students.map((s) => {
      const rep = generatedReports[s.id] || generateReportForStudent(s);
      return [
        s.roll_number,
        s.user?.full_name || 'N/A',
        s.user?.email || 'N/A',
        s.contact_number || s.user?.phone || 'N/A',
        s.program?.title || 'Unassigned',
        formatBatchType(s.batch_type),
        s.enrollment_status,
        `${rep.attendancePercentage}%`,
        `${rep.totalWorkingHours} hrs`,
        rep.faceEnrollmentStatus,
        rep.generatedAt,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${val}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `All_Registered_Students_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.user?.full_name || '').toLowerCase().includes(q) ||
      (s.roll_number || '').toLowerCase().includes(q) ||
      (s.user?.email || '').toLowerCase().includes(q)
    );
  });

  const columns: Column<Student>[] = [
    {
      header: 'Roll Number & ID',
      accessor: (s) => (
        <div>
          <span className="font-bold text-indigo-600 dark:text-indigo-300 font-mono text-xs">{s.roll_number}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">ID: {s.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      header: 'Student Name & Email',
      accessor: (s) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{s.user?.full_name || 'N/A'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{s.user?.email || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Program & Batch Type',
      accessor: (s) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{s.program?.title || 'Unassigned'}</div>
          <Badge
            variant={
              (s.batch_type || '').toUpperCase() === 'TECH_MASTER'
                ? 'info'
                : (s.batch_type || '').toUpperCase() === 'INTERNSHIP'
                ? 'neutral'
                : 'success'
            }
            className="mt-0.5"
          >
            {formatBatchType(s.batch_type)}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (s) => (
        <Badge variant={s.enrollment_status === 'ACTIVE' ? 'success' : 'info'}>
          {s.enrollment_status}
        </Badge>
      ),
    },
    {
      header: 'Report Actions',
      accessor: (s) => {
        const isGenerated = !!generatedReports[s.id];
        return (
          <div className="flex items-center gap-2">
            {/* Generate Report Button */}
            <Button
              size="sm"
              variant={isGenerated ? 'secondary' : 'primary'}
              onClick={() => generateReportForStudent(s)}
              disabled={generatingId === s.id}
            >
              {generatingId === s.id ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <FileText className="w-3.5 h-3.5 mr-1" />
              )}
              {isGenerated ? 'Re-Generate' : 'Generate Report'}
            </Button>

            {/* View Report Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const rep = generatedReports[s.id] || generateReportForStudent(s);
                setViewingReport(rep);
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
              View Report
            </Button>

            {/* Download Report Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownloadSingleReport(s)}
              title="Download CSV Report"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Download
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Student Performance & Lifecycle Reports
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Generate, view detailed analytics, and download individual or global CSV reports for all registered trainees.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleDownloadAllReports}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/20 px-5 py-3 rounded-xl transition-all"
          >
            <Download className="w-4 h-4" /> Download All Student Reports (CSV)
          </Button>
        </div>

        {/* Search & Roster Card */}
        <Card title="Registered Trainees Roster" subtitle={`Total Registered Students: ${students.length}`}>
          <div className="space-y-4">
            <div className="max-w-md">
              <Input
                placeholder="Search by student name, roll number, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {isLoading ? (
              <Loading message="Loading registered students list..." />
            ) : error ? (
              <ErrorMessage message={error} />
            ) : (
              <Table columns={columns} data={filteredStudents} keyExtractor={(s) => s.id} />
            )}
          </div>
        </Card>
      </div>

      {/* View Detailed Student Report Modal */}
      {viewingReport && (
        <Modal
          isOpen={!!viewingReport}
          onClose={() => setViewingReport(null)}
          title={`Detailed Trainee Lifecycle Report: ${viewingReport.student.user?.full_name || viewingReport.student.roll_number}`}
        >
          <div className="space-y-4 font-sans text-xs max-h-[80vh] overflow-y-auto pr-1">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">Student Roll Number</span>
                <div className="text-lg font-mono font-extrabold text-slate-900 dark:text-slate-100">{viewingReport.student.roll_number}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{viewingReport.student.user?.email}</div>
              </div>
              <Badge variant="success" className="px-3 py-1 text-xs">
                {viewingReport.performanceGrade}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Attendance Rate</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{viewingReport.attendancePercentage}%</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium block">Total Logged Hours</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{viewingReport.totalWorkingHours} Hours</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Program Assignment:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{viewingReport.student.program?.title || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Batch Type:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {formatBatchType(viewingReport.student.batch_type)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Biometric Face Baseline:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{viewingReport.faceEnrollmentStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Financial Fees Plan:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{viewingReport.feesStatus}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setViewingReport(null)}>
                Close Preview
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleDownloadSingleReport(viewingReport.student)}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download CSV
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};
