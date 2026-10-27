import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from './Modal';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { api } from '../api/client';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Users,
  GraduationCap,
  Sparkles,
  Info
} from 'lucide-react';

interface StudentExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  roll_number: string;
  full_name: string;
  email: string;
  contact_number?: string;
  program?: string;
  batch?: string;
  batch_type?: string;
  enrollment_status?: string;
  total_fees?: number;
  payment_mode?: string;
  installment_type?: string;
  college_name?: string;
  qualification?: string;
  domicile?: string;
  dob?: string;
  start_date?: string;
  end_date?: string;
  passout_year?: number;
  address?: string;
  isValid: boolean;
  validationError?: string;
}

export const StudentExcelImportModal: React.FC<StudentExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Import mode: 'AUTO' | 'CURRENT' | 'PREVIOUS'
  const [importMode, setImportMode] = useState<'AUTO' | 'CURRENT' | 'PREVIOUS'>('AUTO');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    total: number;
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);

  // Generate & Download Excel Template using SheetJS
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Roll Number': 'NL-2026-FSD-01',
        'Full Name': 'Aarav Sharma',
        'Email': 'aarav.sharma@netlink.org',
        'Contact Number': '9876543210',
        'Program': 'Full Stack Development',
        'Batch': 'Batch 2026-A',
        'Batch Type': 'TECH_MASTER',
        'Enrollment Status': 'ACTIVE',
        'Total Fees': 35000,
        'Payment Mode': 'ONLINE',
        'Installment Type': 'ONE_TIME',
        'College Name': 'RGPV Bhopal',
        'Qualification': 'B.Tech CSE',
        'Domicile': 'Madhya Pradesh',
        'Date of Birth': '2001-05-14',
        'Start Date': '2026-01-10',
        'End Date': '2026-12-30',
        'Passout Year': 2025,
        'Address': 'Bhopal, MP',
      },
      {
        'Roll Number': 'NL-2025-FSD-99',
        'Full Name': 'Priya Patel',
        'Email': 'priya.patel@netlink.org',
        'Contact Number': '9876543222',
        'Program': 'Full Stack Development',
        'Batch': 'Batch 2025-B',
        'Batch Type': 'SHORT_DURATION',
        'Enrollment Status': 'COMPLETED',
        'Total Fees': 25000,
        'Payment Mode': 'ONLINE',
        'Installment Type': 'TWO_INSTALLMENTS',
        'College Name': 'MANIT Bhopal',
        'Qualification': 'MCA',
        'Domicile': 'Madhya Pradesh',
        'Date of Birth': '2000-08-20',
        'Start Date': '2025-01-15',
        'End Date': '2025-07-15',
        'Passout Year': 2024,
        'Address': 'Indore, MP',
      },
      {
        'Roll Number': 'NL-2024-ALUMNI-05',
        'Full Name': 'Rohan Gupta',
        'Email': 'rohan.gupta@netlink.org',
        'Contact Number': '9876543333',
        'Program': 'Full Stack Development',
        'Batch': 'Batch 2024-A',
        'Batch Type': 'INTERNSHIP',
        'Enrollment Status': 'COMPLETED',
        'Total Fees': 15000,
        'Payment Mode': 'ONLINE',
        'Installment Type': 'ONE_TIME',
        'College Name': 'SGSITS Indore',
        'Qualification': 'B.Tech IT',
        'Domicile': 'Madhya Pradesh',
        'Date of Birth': '1999-12-10',
        'Start Date': '2024-02-01',
        'End Date': '2024-06-01',
        'Passout Year': 2023,
        'Address': 'Gwalior, MP',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set auto-fit column widths
    worksheet['!cols'] = [
      { wch: 18 }, // Roll Number
      { wch: 18 }, // Full Name
      { wch: 25 }, // Email
      { wch: 15 }, // Contact Number
      { wch: 24 }, // Program
      { wch: 16 }, // Batch
      { wch: 18 }, // Batch Type
      { wch: 18 }, // Enrollment Status
      { wch: 12 }, // Total Fees
      { wch: 14 }, // Payment Mode
      { wch: 16 }, // Installment Type
      { wch: 18 }, // College Name
      { wch: 15 }, // Qualification
      { wch: 16 }, // Domicile
      { wch: 14 }, // Date of Birth
      { wch: 14 }, // Start Date
      { wch: 14 }, // End Date
      { wch: 14 }, // Passout Year
      { wch: 20 }, // Address
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'Netseed_Students_Import_Template.xlsx');
  };

  // Handle file selection and parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setError('No data rows found in uploaded file.');
          setParsedRows([]);
          return;
        }

        const rows: ParsedRow[] = rawJson.map((r, i) => {
          // Normalize header keys
          const getVal = (possibleKeys: string[]) => {
            for (const key of possibleKeys) {
              for (const rowKey of Object.keys(r)) {
                if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                  return String(r[rowKey]).trim();
                }
              }
            }
            return '';
          };

          const roll = getVal(['rollnumber', 'rollno', 'roll_number', 'roll']);
          const name = getVal(['fullname', 'name', 'studentname', 'full_name']);
          const email = getVal(['email', 'emailaddress', 'studentemail']).toLowerCase();
          const phone = getVal(['contactnumber', 'phone', 'contact', 'mobile']);
          const program = getVal(['program', 'programname', 'course']);
          const batch = getVal(['batch', 'batchname']);
          const batch_type = getVal(['batchtype', 'type', 'course_type']) || 'TECH_MASTER';
          let statusVal = getVal(['enrollmentstatus', 'status', 'studentstatus']);

          if (importMode === 'CURRENT' && (!statusVal || statusVal.toUpperCase() === 'ENROLLED')) {
            statusVal = 'ACTIVE';
          } else if (importMode === 'PREVIOUS' && !statusVal) {
            statusVal = 'COMPLETED';
          }

          const feesStr = getVal(['totalfees', 'fees', 'amount']);
          const total_fees = feesStr ? parseFloat(feesStr.replace(/[^0-9.]/g, '')) : undefined;
          const payment_mode = getVal(['paymentmode', 'payment_mode']) || 'ONLINE';
          const installment_type = getVal(['installmenttype', 'installment']) || 'ONE_TIME';
          const college = getVal(['collegename', 'college', 'institution']);
          const qual = getVal(['qualification', 'degree']);
          const domicile = getVal(['domicile', 'state']);
          const dob = getVal(['dateofbirth', 'dob', 'birthdate']);
          const start_date = getVal(['startdate', 'joiningdate']);
          const end_date = getVal(['enddate', 'completiondate']);
          const passout_year_str = getVal(['passoutyear', 'graduationyear']);
          const passout_year = passout_year_str ? parseInt(passout_year_str, 10) : undefined;
          const address = getVal(['address', 'city']);

          let isValid = true;
          let validationError = '';

          if (!roll) {
            isValid = false;
            validationError = 'Missing Roll Number';
          } else if (!name) {
            isValid = false;
            validationError = 'Missing Full Name';
          } else if (!email || !email.includes('@')) {
            isValid = false;
            validationError = 'Invalid or Missing Email';
          }

          return {
            roll_number: roll,
            full_name: name,
            email,
            contact_number: phone || undefined,
            program: program || undefined,
            batch: batch || undefined,
            batch_type,
            enrollment_status: statusVal || 'ACTIVE',
            total_fees,
            payment_mode,
            installment_type,
            college_name: college || undefined,
            qualification: qual || undefined,
            domicile: domicile || undefined,
            dob: dob || undefined,
            start_date: start_date || undefined,
            end_date: end_date || undefined,
            passout_year,
            address: address || undefined,
            isValid,
            validationError,
          };
        });

        setParsedRows(rows);
      } catch (err: any) {
        setError(`Failed to read file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit parsed data to backend
  const handleImportSubmit = async () => {
    if (!parsedRows.length) return;

    const validRows = parsedRows.filter((r) => r.isValid);
    if (!validRows.length) {
      setError('No valid rows found to import. Please fix rows with missing Roll Number, Name, or Email.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
      let default_status: string | undefined = undefined;
      if (importMode === 'CURRENT') default_status = 'ACTIVE';
      if (importMode === 'PREVIOUS') default_status = 'COMPLETED';

      const res = await api.post<{
        success: boolean;
        message: string;
        total_processed: number;
        created_count: number;
        updated_count: number;
        errors: string[];
      }>('/students/import-bulk', {
        students: validRows,
        default_enrollment_status: default_status,
      });

      setImportResult({
        success: res.success,
        message: res.message,
        total: res.total_processed,
        created: res.created_count,
        updated: res.updated_count,
        errors: res.errors || [],
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Import failed. Please check the file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) {
          handleReset();
          onClose();
        }
      }}
      title="Import Student Data via Excel / CSV"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-xs font-sans">
        {/* Step 1: Mode & Template Downloads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            onClick={() => setImportMode('AUTO')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              importMode === 'AUTO'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div className="font-bold text-slate-900 dark:text-slate-100">Auto-Detect Status</div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Import both current and previous students based on the "Status" column in your file.
            </p>
          </div>

          <div
            onClick={() => setImportMode('CURRENT')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              importMode === 'CURRENT'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div className="font-bold text-slate-900 dark:text-slate-100">Currently Enrolled</div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Default rows to <strong>ACTIVE</strong> status for new trainees currently attending classes.
            </p>
          </div>

          <div
            onClick={() => setImportMode('PREVIOUS')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              importMode === 'PREVIOUS'
                ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 shadow-xs ring-2 ring-purple-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div className="font-bold text-slate-900 dark:text-slate-100">Previous / Alumni</div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Default rows to <strong>COMPLETED</strong> status for alumni and past batch records.
            </p>
          </div>
        </div>

        {/* Download Template Banner */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">Standard Excel Template (.xlsx)</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Includes sample rows with all fields: Roll Number, Name, Email, Batch, Status, Fees, etc.
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleDownloadTemplate}
            className="font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            Download Sample Excel
          </Button>
        </div>

        {/* File Dropzone */}
        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Click to browse or drag and drop your spreadsheet here
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Supports Microsoft Excel (.xlsx, .xls) and CSV files
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedFile.name}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                  ({(selectedFile.size / 1024).toFixed(1)} KB) • {parsedRows.length} rows detected
                </span>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={handleReset} disabled={isLoading}>
              Change File
            </Button>
          </div>
        )}

        {/* Alerts */}
        {error && <ErrorMessage message={error} />}

        {importResult && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{importResult.message}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              <span>Total Processed: {importResult.total}</span>
              <span>•</span>
              <span>New Registered: {importResult.created}</span>
              <span>•</span>
              <span>Profiles Updated: {importResult.updated}</span>
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800 text-[11px] text-amber-700 dark:text-amber-300">
                <strong>Notes / Skipped rows ({importResult.errors.length}):</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Data Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <span>Data Preview ({parsedRows.length} rows)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {parsedRows.filter((r) => r.isValid).length} Valid
                </span>
                {parsedRows.some((r) => !r.isValid) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                    {parsedRows.filter((r) => !r.isValid).length} Needs Attention
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-normal">Showing top 50 records</span>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Roll No</th>
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Program / Batch</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Fees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <tr
                      key={idx}
                      className={!row.isValid ? 'bg-rose-50/60 dark:bg-rose-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}
                    >
                      <td className="p-2.5 whitespace-nowrap">
                        {!row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            <AlertCircle className="w-3 h-3" />
                            {row.validationError}
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              row.enrollment_status === 'COMPLETED'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            }`}
                          >
                            {row.enrollment_status}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.roll_number}</td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">{row.full_name}</td>
                      <td className="p-2.5 text-slate-500 font-mono text-[10px]">{row.email}</td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300">
                        {row.program || 'General'}{row.batch ? ` • ${row.batch}` : ''}
                      </td>
                      <td className="p-2.5 text-slate-500 text-[10px]">{row.batch_type}</td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                        {row.total_fees ? `₹${row.total_fees.toLocaleString('en-IN')}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-sky-500" />
            <span>Existing roll numbers or emails will be smoothly updated without data loss.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                handleReset();
                onClose();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleImportSubmit}
              isLoading={isLoading}
              disabled={!parsedRows.length || !parsedRows.some((r) => r.isValid)}
              className="font-bold"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1.5" />
              Import {parsedRows.filter((r) => r.isValid).length} Student(s)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
