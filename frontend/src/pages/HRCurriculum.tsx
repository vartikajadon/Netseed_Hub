import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../api/client';
import { Program, ProgramCurriculum, CurriculumTopicItem, CurriculumImportItem } from '../types';
import {
  BookOpen,
  Upload,
  Globe,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  ArrowUpDown,
  Search,
  ChevronDown,
  ChevronUp,
  FileCode,
  Info
} from 'lucide-react';

export const HRCurriculum: React.FC = () => {
  const { addToast } = useNotifications();

  // Program & Curriculum states
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [curriculum, setCurriculum] = useState<ProgramCurriculum | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Topic Create / Edit State
  const [editingTopic, setEditingTopic] = useState<CurriculumTopicItem | null>(null);
  const [topicModuleName, setTopicModuleName] = useState<string>('');
  const [topicTitle, setTopicTitle] = useState<string>('');
  const [topicDescription, setTopicDescription] = useState<string>('');
  const [topicOrderIndex, setTopicOrderIndex] = useState<number>(1);
  const [topicToDelete, setTopicToDelete] = useState<CurriculumTopicItem | null>(null);

  // Import State
  const [importMode, setImportMode] = useState<'FILE' | 'TEXT'>('FILE');
  const [importFormat, setImportFormat] = useState<'CSV' | 'JSON'>('CSV');
  const [importRawText, setImportRawText] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [parsedPreviewTopics, setParsedPreviewTopics] = useState<CurriculumImportItem[]>([]);
  const [importParseError, setImportParseError] = useState<string | null>(null);

  // Load programs on mount
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.get<Program[]>('/programs');
        setPrograms(data || []);
        if (data && data.length > 0) {
          setSelectedProgramId(data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load programs list.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  // Fetch curriculum when program changes
  const fetchCurriculum = async (programId: string) => {
    if (!programId) return;
    try {
      setIsCurriculumLoading(true);
      setError(null);
      const data = await api.get<ProgramCurriculum>(`/curriculum/programs/${programId}`);
      setCurriculum(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load program curriculum.');
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProgramId) {
      fetchCurriculum(selectedProgramId);
    }
  }, [selectedProgramId]);

  // Selected program object
  const currentProgram = useMemo(() => {
    return programs.find((p) => p.id === selectedProgramId) || null;
  }, [programs, selectedProgramId]);

  // Group topics by module
  const modulesList = useMemo(() => {
    if (!curriculum?.topics) return [];
    const set = new Set<string>();
    curriculum.topics.forEach((t) => {
      if (t.module_name) set.add(t.module_name.trim());
    });
    return Array.from(set);
  }, [curriculum]);

  // Filtered topics
  const filteredTopics = useMemo(() => {
    if (!curriculum?.topics) return [];
    return curriculum.topics.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.module_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchModule =
        selectedModuleFilter === 'ALL' || t.module_name.toLowerCase() === selectedModuleFilter.toLowerCase();
      return matchSearch && matchModule;
    });
  }, [curriculum, searchQuery, selectedModuleFilter]);

  // Group filtered topics by module
  const topicsByModule = useMemo(() => {
    const grouped: Record<string, CurriculumTopicItem[]> = {};
    filteredTopics.forEach((topic) => {
      const mod = topic.module_name || 'General';
      if (!grouped[mod]) {
        grouped[mod] = [];
      }
      grouped[mod].push(topic);
    });
    return grouped;
  }, [filteredTopics]);

  // =========================================================================
  // PUBLISH / UNPUBLISH ACTION
  // =========================================================================
  const handleTogglePublish = async () => {
    if (!selectedProgramId || !curriculum) return;
    const newPublishStatus = !curriculum.is_published;

    try {
      setIsActionLoading(true);
      const updated = await api.put<ProgramCurriculum>(
        `/curriculum/programs/${selectedProgramId}/publish`,
        { is_published: newPublishStatus }
      );
      setCurriculum(updated);
      addToast({
        type: 'success',
        title: newPublishStatus ? 'Curriculum Published' : 'Curriculum Set to Draft',
        message: newPublishStatus
          ? `Curriculum is now live and visible to Mentors and registered Students of ${currentProgram?.title}.`
          : `Curriculum is now hidden from Mentors and Students.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Failed to update publication status.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // =========================================================================
  // PARSE IMPORT DATA (CSV / JSON)
  // =========================================================================
  const parseCSV = (csvText: string): CurriculumImportItem[] => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const modIdx = headers.findIndex((h) => h.includes('module'));
    const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('topic'));
    const descIdx = headers.findIndex((h) => h.includes('desc'));
    const orderIdx = headers.findIndex((h) => h.includes('order'));

    const items: CurriculumImportItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple regex for CSV splitting supporting quotes
      const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((val) =>
        val.replace(/^"(.*)"$/, '$1').trim()
      );

      const moduleName = modIdx !== -1 && row[modIdx] ? row[modIdx] : 'Module 1';
      const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx] : row[0] || `Topic ${i}`;
      const description = descIdx !== -1 && row[descIdx] ? row[descIdx] : '';
      const order = orderIdx !== -1 && row[orderIdx] ? parseInt(row[orderIdx], 10) || i : i;

      if (title) {
        items.push({
          module_name: moduleName,
          title,
          description,
          order_index: order,
        });
      }
    }
    return items;
  };

  const parseJSON = (jsonText: string): CurriculumImportItem[] => {
    const parsed = JSON.parse(jsonText);
    const list = Array.isArray(parsed) ? parsed : parsed.topics || [];
    return list.map((item: any, idx: number) => ({
      module_name: item.module_name || item.module || 'General',
      title: item.title || item.topic || `Topic ${idx + 1}`,
      description: item.description || item.desc || '',
      order_index: item.order_index || idx + 1,
    }));
  };

  const handleRawTextChange = (text: string) => {
    setImportRawText(text);
    setImportParseError(null);
    if (!text.trim()) {
      setParsedPreviewTopics([]);
      return;
    }

    try {
      if (importFormat === 'CSV') {
        const parsed = parseCSV(text);
        setParsedPreviewTopics(parsed);
      } else {
        const parsed = parseJSON(text);
        setParsedPreviewTopics(parsed);
      }
    } catch (err: any) {
      setImportParseError(err.message || 'Invalid format syntax.');
      setParsedPreviewTopics([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isJson = file.name.endsWith('.json');
    setImportFormat(isJson ? 'JSON' : 'CSV');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleRawTextChange(content);
    };
    reader.readAsText(file);
  };

  // Submit Import
  const handleConfirmImport = async () => {
    if (parsedPreviewTopics.length === 0) {
      addToast({
        type: 'error',
        title: 'Empty Import',
        message: 'No valid topics detected in import file or text.',
      });
      return;
    }

    try {
      setIsActionLoading(true);
      const res = await api.post<ProgramCurriculum>(
        `/curriculum/programs/${selectedProgramId}/import`,
        {
          topics: parsedPreviewTopics,
          replace_existing: replaceExisting,
        }
      );
      setCurriculum(res);
      setIsImportModalOpen(false);
      setImportRawText('');
      setParsedPreviewTopics([]);
      addToast({
        type: 'success',
        title: 'Curriculum Imported',
        message: `Successfully imported ${parsedPreviewTopics.length} topics into ${currentProgram?.title}!`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Import Failed',
        message: err.message || 'Failed to import curriculum topics.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // =========================================================================
  // DOWNLOAD CSV SAMPLE TEMPLATE
  // =========================================================================
  const handleDownloadSample = () => {
    const sampleCsv = `Module Name,Topic Title,Description,Order
Frontend Architecture,React 18 & TypeScript Setup,Configuration of Vite with Tailwind and TypeScript strict mode,1
Frontend Architecture,State Management & Context API,Building resilient global auth state and notification providers,2
Backend Development,FastAPI REST Endpoints,Creating Pydantic V2 schemas and dependency injection guards,3
Backend Development,SQLAlchemy ORM & Migrations,Designing normalized relational models with foreign keys,4
Security & Biometrics,Haversine Geofencing Engine,Server-side great circle distance validation against venue,5
Security & Biometrics,ArcFace Biometric Matching,512-dimensional facial embedding vector extraction,6
DevOps & Cloud,Docker & Production Deployment,Containerizing FastAPI service with environment isolation,7`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentProgram?.code || 'program'}_curriculum_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // SINGLE TOPIC CREATE / EDIT / DELETE
  // =========================================================================
  const openCreateTopicModal = (prefillModule?: string) => {
    setEditingTopic(null);
    setTopicModuleName(prefillModule || (modulesList[0] || 'Module 1'));
    setTopicTitle('');
    setTopicDescription('');
    setTopicOrderIndex((curriculum?.total_topics || 0) + 1);
    setIsTopicModalOpen(true);
  };

  const openEditTopicModal = (topic: CurriculumTopicItem) => {
    setEditingTopic(topic);
    setTopicModuleName(topic.module_name);
    setTopicTitle(topic.title);
    setTopicDescription(topic.description || '');
    setTopicOrderIndex(topic.order_index);
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || !topicModuleName.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Module name and Topic title are required.',
      });
      return;
    }

    try {
      setIsActionLoading(true);
      if (editingTopic) {
        // Update
        await api.put(`/curriculum/topics/${editingTopic.id}`, {
          module_name: topicModuleName,
          title: topicTitle,
          description: topicDescription,
          order_index: topicOrderIndex,
        });
        addToast({
          type: 'success',
          title: 'Topic Updated',
          message: `Updated topic "${topicTitle}" successfully.`,
        });
      } else {
        // Create
        await api.post(`/curriculum/programs/${selectedProgramId}/topics`, {
          module_name: topicModuleName,
          title: topicTitle,
          description: topicDescription,
          order_index: topicOrderIndex,
        });
        addToast({
          type: 'success',
          title: 'Topic Created',
          message: `Added new topic "${topicTitle}" to ${topicModuleName}.`,
        });
      }
      setIsTopicModalOpen(false);
      fetchCurriculum(selectedProgramId);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save curriculum topic.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!topicToDelete) return;
    try {
      setIsActionLoading(true);
      await api.delete(`/curriculum/topics/${topicToDelete.id}`);
      addToast({
        type: 'success',
        title: 'Topic Deleted',
        message: `Removed "${topicToDelete.title}" from curriculum.`,
      });
      setIsDeleteModalOpen(false);
      setTopicToDelete(null);
      fetchCurriculum(selectedProgramId);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete curriculum topic.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <Loading fullScreen message="Loading curriculum portal and programs..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* TOP HEADER BANNER */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                HR Academic Portal
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Program Curriculum Management
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl font-medium">
              Import, organize, and publish syllabi across training tracks. Once published, curricula are
              broadcast live to technical mentors and registered students in their portals.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <Button
              variant="secondary"
              onClick={handleDownloadSample}
              className="text-xs py-2"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              CSV Template
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs py-2"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import Curriculum
            </Button>
            <Button
              variant="primary"
              onClick={() => openCreateTopicModal()}
              className="text-xs py-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Topic
            </Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* ========================================================================= */}
        {/* PROGRAM SELECTOR & PUBLISH STATUS CONTROLS */}
        {/* ========================================================================= */}
        <Card className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Program Dropdown & Quick Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-full sm:w-80">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Select Training Program
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-slate-100"
                >
                  {programs.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.title} ({prog.code})
                    </option>
                  ))}
                </select>
              </div>

              {currentProgram && (
                <div className="flex items-center gap-2 pt-4 sm:pt-5">
                  <Badge variant="info" className="text-xs font-mono font-bold">
                    {currentProgram.code}
                  </Badge>
                  <Badge variant="neutral" className="text-xs">
                    {currentProgram.duration_weeks || 12} Weeks
                  </Badge>
                  {currentProgram.program_type && (
                    <Badge variant="neutral" className="text-xs capitalize">
                      {currentProgram.program_type}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Publication Status & Action Button */}
            <div className="flex items-center flex-wrap gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Visibility Status:
                </span>
                {curriculum?.is_published ? (
                  <Badge
                    variant="success"
                    className="flex items-center gap-1.5 px-3 py-1 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Published & Live
                  </Badge>
                ) : (
                  <Badge
                    variant="warning"
                    className="flex items-center gap-1.5 px-3 py-1 font-bold text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Draft (Hidden from Students)
                  </Badge>
                )}
              </div>

              <Button
                variant={curriculum?.is_published ? 'secondary' : 'primary'}
                onClick={handleTogglePublish}
                disabled={isActionLoading || isCurriculumLoading}
                className={
                  curriculum?.is_published
                    ? 'text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    : 'text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }
              >
                {curriculum?.is_published ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                    Unpublish (Set to Draft)
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 mr-1.5" />
                    Publish to Mentors & Students
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* STATS OVERVIEW CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Modules
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {modulesList.length}
                </h3>
              </div>
              <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                <Layers className="w-6 h-6" />
              </span>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Topics
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {curriculum?.total_topics || 0}
                </h3>
              </div>
              <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                <BookOpen className="w-6 h-6" />
              </span>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Program Duration
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {currentProgram?.duration_weeks || 12} Wks
                </h3>
              </div>
              <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <Sparkles className="w-6 h-6" />
              </span>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Audience Scope
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  Mentors & Enrolled Students
                </p>
              </div>
              <span className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <Globe className="w-6 h-6" />
              </span>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SEARCH & MODULE FILTER BAR */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search topics by title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Filter Module:
            </label>
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="ALL">All Modules ({modulesList.length})</option>
              {modulesList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CURRICULUM TOPICS EXPLORER */}
        {/* ========================================================================= */}
        {isCurriculumLoading ? (
          <Loading message="Loading curriculum topics..." />
        ) : filteredTopics.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              No Curriculum Topics Found
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
              {curriculum?.topics?.length === 0
                ? 'This program does not have any syllabus topics yet. Click Import Curriculum or Add Topic to build the syllabus.'
                : 'No topics matched your search or module filter.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => setIsImportModalOpen(true)}
                className="text-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Import Curriculum CSV / JSON
              </Button>
              <Button
                variant="secondary"
                onClick={() => openCreateTopicModal()}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Single Topic
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(topicsByModule).map(([moduleName, topics]) => (
              <Card key={moduleName} className="overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Module Header Bar */}
                <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      <Layers className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {moduleName}
                    </h3>
                    <Badge variant="neutral" className="text-xs font-semibold">
                      {topics.length} {topics.length === 1 ? 'Topic' : 'Topics'}
                    </Badge>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => openCreateTopicModal(moduleName)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 py-1 px-2.5"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add to this Module
                  </Button>
                </div>

                {/* Topics Table */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono font-bold flex items-center justify-center border border-slate-200 dark:border-slate-700">
                          #{topic.order_index}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {topic.title}
                          </h4>
                          {topic.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-3xl">
                              {topic.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          variant="ghost"
                          onClick={() => openEditTopicModal(topic)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600"
                          title="Edit Topic"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setTopicToDelete(topic);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600"
                          title="Delete Topic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* IMPORT CURRICULUM MODAL */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title={`Import Curriculum for ${currentProgram?.title || 'Program'}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-3.5 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
              <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Import Instructions:</p>
                <p className="mt-0.5">
                  Upload a <b>CSV</b> or <b>JSON</b> file containing your syllabus topics. Required columns are
                  <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded mx-1 font-mono">Module Name</code>
                  and
                  <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded mx-1 font-mono">Topic Title</code>.
                  Optional columns: <code className="font-mono">Description</code>, <code className="font-mono">Order</code>.
                </p>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setImportMode('FILE')}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                  importMode === 'FILE'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Upload File (.csv / .json)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('TEXT')}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
                  importMode === 'TEXT'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Paste Raw CSV / JSON Text
              </button>
            </div>

            {importMode === 'FILE' ? (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/30">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Click or drag and drop CSV or JSON file
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Supports .csv and .json files
                </p>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Paste CSV or JSON content:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImportFormat('CSV');
                        handleRawTextChange(importRawText);
                      }}
                      className={`text-xs px-2 py-0.5 rounded ${
                        importFormat === 'CSV'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportFormat('JSON');
                        handleRawTextChange(importRawText);
                      }}
                      className={`text-xs px-2 py-0.5 rounded ${
                        importFormat === 'JSON'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={importRawText}
                  onChange={(e) => handleRawTextChange(e.target.value)}
                  placeholder={
                    importFormat === 'CSV'
                      ? 'Module Name,Topic Title,Description,Order\nModule 1,HTML & CSS,Responsive design basics,1'
                      : '[\n  {"module_name": "Module 1", "title": "HTML & CSS", "description": "Basics", "order_index": 1}\n]'
                  }
                  className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {importParseError && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Parse Error: {importParseError}
              </p>
            )}

            {/* Import Option: Replace Existing */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="replaceExistingCheckbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <label
                htmlFor="replaceExistingCheckbox"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Replace existing curriculum topics for this program (Wipes current topics before importing)
              </label>
            </div>

            {/* Parsed Preview Table */}
            {parsedPreviewTopics.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Preview: {parsedPreviewTopics.length} Valid Topics Detected
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-bold">#</th>
                        <th className="py-2 px-3 font-bold">Module</th>
                        <th className="py-2 px-3 font-bold">Topic Title</th>
                        <th className="py-2 px-3 font-bold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedPreviewTopics.slice(0, 10).map((pt, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-1.5 px-3 font-mono text-slate-500">{pt.order_index || i + 1}</td>
                          <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {pt.module_name}
                          </td>
                          <td className="py-1.5 px-3 text-slate-900 dark:text-slate-100">{pt.title}</td>
                          <td className="py-1.5 px-3 text-slate-500 truncate max-w-xs">{pt.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedPreviewTopics.length > 10 && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/80 text-center text-xs text-slate-500 font-medium">
                      + {parsedPreviewTopics.length - 10} more topics in this batch
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => setIsImportModalOpen(false)}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                disabled={isActionLoading || parsedPreviewTopics.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isActionLoading ? 'Importing...' : `Confirm & Import ${parsedPreviewTopics.length} Topics`}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ========================================================================= */}
        {/* CREATE / EDIT TOPIC MODAL */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isTopicModalOpen}
          onClose={() => setIsTopicModalOpen(false)}
          title={editingTopic ? 'Edit Curriculum Topic' : 'Add New Curriculum Topic'}
        >
          <form onSubmit={handleSaveTopic} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Module Name *
              </label>
              <input
                type="text"
                required
                list="modulesDatalist"
                value={topicModuleName}
                onChange={(e) => setTopicModuleName(e.target.value)}
                placeholder="e.g. Frontend Fundamentals"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <datalist id="modulesDatalist">
                {modulesList.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Topic Title *
              </label>
              <input
                type="text"
                required
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="e.g. Component State & Props in React"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Description / Learning Objectives
              </label>
              <textarea
                rows={3}
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                placeholder="Key concepts, labs, or assessment criteria for this topic..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Sequence Order Index
              </label>
              <input
                type="number"
                min={1}
                value={topicOrderIndex}
                onChange={(e) => setTopicOrderIndex(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsTopicModalOpen(false)}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isActionLoading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isActionLoading ? 'Saving...' : editingTopic ? 'Update Topic' : 'Add Topic'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* ========================================================================= */}
        {/* DELETE CONFIRMATION MODAL */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Curriculum Topic"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete topic{' '}
              <b className="text-slate-900 dark:text-slate-100">"{topicToDelete?.title}"</b> from module{' '}
              <b>"{topicToDelete?.module_name}"</b>?
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400">
              This action cannot be undone. Any recorded student completion progress for this topic will also be
              removed.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteTopic}
                disabled={isActionLoading}
              >
                {isActionLoading ? 'Deleting...' : 'Delete Topic'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};
