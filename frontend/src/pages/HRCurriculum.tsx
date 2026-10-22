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

  // Import State (Doc type file only: .docx / .doc)
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [importTargetMode, setImportTargetMode] = useState<'SELECTED' | 'NEW'>('SELECTED');
  const [newProgramTitle, setNewProgramTitle] = useState<string>('');
  const [newProgramCode, setNewProgramCode] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [parsedPreviewTopics, setParsedPreviewTopics] = useState<CurriculumImportItem[]>([]);
  const [isParsingDoc, setIsParsingDoc] = useState<boolean>(false);
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
  // PARSE WORD DOCUMENT (.docx / .doc ONLY)
  // =========================================================================
  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isDoc = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');

    if (!isDoc) {
      setImportParseError('Invalid file type. Only Word document files (.docx, .doc) are supported for curriculum import.');
      setSelectedDocFile(null);
      setParsedPreviewTopics([]);
      e.target.value = '';
      return;
    }

    setSelectedDocFile(file);
    setImportParseError(null);
    setIsParsingDoc(true);

    // Auto-populate suggested new program title and code if not provided
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ').trim();
    if (!newProgramTitle) {
      setNewProgramTitle(baseName);
    }
    if (!newProgramCode) {
      const codeWord = baseName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 6);
      setNewProgramCode(`PRG-${codeWord || 'DOC'}`);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.upload<{ filename: string; total_topics: number; topics: CurriculumImportItem[] }>(
        '/curriculum/parse-doc',
        formData
      );

      if (!res.topics || res.topics.length === 0) {
        setImportParseError('No curriculum modules or topics could be detected in this Word document.');
        setParsedPreviewTopics([]);
      } else {
        setParsedPreviewTopics(res.topics);
        setImportParseError(null);
      }
    } catch (err: any) {
      setImportParseError(err.message || 'Failed to parse Word document. Please ensure it contains structured curriculum modules and topics.');
      setParsedPreviewTopics([]);
    } finally {
      setIsParsingDoc(false);
    }
  };

  // Submit Import & Accurately Create Curriculum
  const handleConfirmImport = async () => {
    if (parsedPreviewTopics.length === 0) {
      addToast({
        type: 'error',
        title: 'Empty Curriculum',
        message: 'No valid topics detected in the imported document.',
      });
      return;
    }

    if (importTargetMode === 'NEW' && !newProgramTitle.trim()) {
      addToast({
        type: 'error',
        title: 'Program Title Required',
        message: 'Please provide a title for the new training program.',
      });
      return;
    }

    try {
      setIsActionLoading(true);
      const targetId = importTargetMode === 'NEW' ? 'new' : selectedProgramId;
      const payload: any = {
        topics: parsedPreviewTopics,
        replace_existing: replaceExisting,
      };

      if (importTargetMode === 'NEW') {
        payload.new_program_title = newProgramTitle.trim();
        payload.new_program_code = newProgramCode.trim() || `PRG-${Date.now().toString().slice(-6)}`;
      }

      const res = await api.post<ProgramCurriculum>(
        `/curriculum/programs/${targetId}/import`,
        payload
      );

      // Refresh programs list
      const updatedPrograms = await api.get<Program[]>('/programs');
      setPrograms(updatedPrograms || []);
      setSelectedProgramId(res.program_id);
      setCurriculum(res);

      setIsImportModalOpen(false);
      setSelectedDocFile(null);
      setParsedPreviewTopics([]);
      setNewProgramTitle('');
      setNewProgramCode('');

      addToast({
        type: 'success',
        title: 'New Curriculum Created',
        message: `Successfully created curriculum with ${res.total_topics} topics according to "${selectedDocFile?.name || 'document'}".`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Import Failed',
        message: err.message || 'Failed to import curriculum from document.',
      });
    } finally {
      setIsActionLoading(false);
    }
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
              onClick={() => {
                setImportParseError(null);
                setIsImportModalOpen(true);
              }}
              className="text-xs py-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Import Curriculum (.doc)
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

            {/* Target Program Selection */}
            <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Curriculum Target
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                    importTargetMode === 'SELECTED'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importTargetMode"
                    value="SELECTED"
                    checked={importTargetMode === 'SELECTED'}
                    onChange={() => setImportTargetMode('SELECTED')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <p className="font-bold">Apply to Current Program</p>
                    <p className="text-[11px] opacity-80 mt-0.5">{currentProgram?.title} ({currentProgram?.code})</p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                    importTargetMode === 'NEW'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importTargetMode"
                    value="NEW"
                    checked={importTargetMode === 'NEW'}
                    onChange={() => setImportTargetMode('NEW')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <p className="font-bold">+ Create Brand New Program</p>
                    <p className="text-[11px] opacity-80 mt-0.5">Generate a new training track & curriculum</p>
                  </div>
                </label>
              </div>

              {importTargetMode === 'NEW' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      New Program Title *
                    </label>
                    <input
                      type="text"
                      value={newProgramTitle}
                      onChange={(e) => setNewProgramTitle(e.target.value)}
                      placeholder="e.g. Full Stack Engineering"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Program Code
                    </label>
                    <input
                      type="text"
                      value={newProgramCode}
                      onChange={(e) => setNewProgramCode(e.target.value.toUpperCase())}
                      placeholder="e.g. PRG-FSE-2026"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
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
                    Replace existing topics (Generates a clean curriculum matching document exactly)
                  </label>
                </div>
              )}
            </div>

            {/* Document Upload Area (Doc Only) */}
            <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-xl p-6 text-center bg-indigo-50/20 dark:bg-slate-900/40 relative">
              <FileText className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {selectedDocFile ? selectedDocFile.name : 'Choose or Drag & Drop Word Document'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Strictly accepts Word document files (<span className="font-semibold text-indigo-600 dark:text-indigo-400">.docx</span> and <span className="font-semibold text-indigo-600 dark:text-indigo-400">.doc</span> only)
              </p>
              <input
                type="file"
                accept=".docx,.doc,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleDocFileUpload}
                disabled={isParsingDoc || isActionLoading}
                className="block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
            </div>

            {/* Document Parsing Progress Indicator */}
            {isParsingDoc && (
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-center gap-3 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                <svg className="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Accurately analyzing and extracting curriculum modules & topics from Word document...
              </div>
            )}

            {/* Error Message */}
            {importParseError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {importParseError}
              </p>
            )}

            {/* Parsed Preview Table */}
            {parsedPreviewTopics.length > 0 && !isParsingDoc && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Accurately Extracted {parsedPreviewTopics.length} Topics across{' '}
                    {new Set(parsedPreviewTopics.map((t) => t.module_name)).size} Modules
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedDocFile?.name}
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
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
                      {parsedPreviewTopics.map((pt, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-1.5 px-3 font-mono text-slate-500">{pt.order_index || i + 1}</td>
                          <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {pt.module_name}
                          </td>
                          <td className="py-1.5 px-3 text-slate-900 dark:text-slate-100 font-medium">{pt.title}</td>
                          <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400 truncate max-w-xs">{pt.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedDocFile(null);
                  setParsedPreviewTopics([]);
                  setImportParseError(null);
                }}
                disabled={isActionLoading || isParsingDoc}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                disabled={isActionLoading || isParsingDoc || parsedPreviewTopics.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isActionLoading
                  ? 'Creating Curriculum...'
                  : `Confirm & Create Curriculum (${parsedPreviewTopics.length} Topics)`}
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
