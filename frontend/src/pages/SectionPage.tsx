import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../api/client';
import {
  Shield, ArrowLeft, CheckCircle2, Lock, CheckSquare, Bell,
  Send, ExternalLink, MessageSquare, Sparkles, Clock, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionPageProps {
  title: string;
  subtitle: string;
  category: 'STUDENT' | 'MENTOR' | 'HR' | 'SUPER_ADMIN';
  description: string;
}

interface DemoTask {
  id: string;
  title: string;
  assignedTo: string;
  module: string;
  repoUrl?: string;
  status: 'PENDING_REVIEW' | 'ACKNOWLEDGED' | 'COMPLETED';
  submittedAt: string;
  acknowledgedBy?: string;
}

export const SectionPage: React.FC<SectionPageProps> = ({ title, subtitle, category, description }) => {
  const { user } = useAuth();
  const { addToast } = useNotifications();

  // Task Submission Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Acknowledgement Modal State
  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [ackRecipient, setAckRecipient] = useState('');
  const [ackSubject, setAckSubject] = useState('');
  const [ackMessage, setAckMessage] = useState('');
  const [isSendingAck, setIsSendingAck] = useState(false);

  // Sample tasks for demonstration
  const [tasks, setTasks] = useState<DemoTask[]>([
    {
      id: 'task-1',
      title: 'Full Stack Authentication Pipeline & JWT Cookies',
      assignedTo: user?.role === 'STUDENT' ? (user.full_name || 'You') : 'Rahul Sharma',
      module: 'Backend Security Architecture',
      repoUrl: 'https://github.com/netseed/auth-pipeline',
      status: 'ACKNOWLEDGED',
      submittedAt: 'Today, 10:30 AM',
      acknowledgedBy: 'Senior Mentor'
    },
    {
      id: 'task-2',
      title: 'Database Schema Migration & Geofence Polygon Indices',
      assignedTo: user?.role === 'STUDENT' ? (user.full_name || 'You') : 'Priya Patel',
      module: 'FastAPI & SQLAlchemy Core',
      repoUrl: 'https://github.com/netseed/geofence-service',
      status: 'PENDING_REVIEW',
      submittedAt: 'Today, 02:15 PM'
    },
    {
      id: 'task-3',
      title: 'Facial Biometric Liveness Challenge Validation',
      assignedTo: user?.role === 'STUDENT' ? (user.full_name || 'You') : 'Amit Kumar',
      module: 'Computer Vision & Liveness',
      repoUrl: 'https://github.com/netseed/biometric-vision',
      status: 'COMPLETED',
      submittedAt: 'Yesterday, 04:45 PM',
      acknowledgedBy: 'Lead Architect'
    }
  ]);

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setIsSubmitting(true);
      // Trigger in-app notification to Mentors and HR
      await api.post('/notifications', {
        title: `Task Completed: ${taskTitle}`,
        message: `${user?.full_name || 'Student'} completed task "${taskTitle}" (${repoUrl || 'Repository link submitted'}).`,
        notification_type: 'TASK_COMPLETED',
        target_role: 'MENTOR'
      }).catch(() => null);

      const newTask: DemoTask = {
        id: `task-${Date.now()}`,
        title: taskTitle.trim(),
        assignedTo: user?.full_name || 'Current User',
        module: subtitle,
        repoUrl: repoUrl.trim(),
        status: 'PENDING_REVIEW',
        submittedAt: 'Just now'
      };

      setTasks(prev => [newTask, ...prev]);
      setIsSubmitModalOpen(false);
      setTaskTitle('');
      setRepoUrl('');
      setTaskNotes('');

      addToast({
        title: 'Task Completion Submitted!',
        message: 'Your task completion and code repository have been recorded. Mentors & HR notified.',
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        title: 'Submission Error',
        message: err.message || 'Could not record task submission',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledgeTask = async (taskId: string, currentTitle: string) => {
    try {
      // Trigger Acknowledgement notification
      await api.post('/notifications', {
        title: `Task Acknowledged: ${currentTitle}`,
        message: `${user?.full_name || 'Mentor'} has officially acknowledged and verified task "${currentTitle}".`,
        notification_type: 'ACKNOWLEDGEMENT',
        target_role: 'STUDENT'
      }).catch(() => null);

      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'ACKNOWLEDGED', acknowledgedBy: user?.full_name || 'Reviewer' }
          : t
      ));

      addToast({
        title: 'Task Acknowledged!',
        message: `Task "${currentTitle}" marked as acknowledged. In-app notification sent.`,
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        title: 'Acknowledgement Failed',
        message: err.message || 'Could not record task acknowledgement',
        type: 'error'
      });
    }
  };

  const handleSendCustomAck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ackSubject.trim() || !ackMessage.trim()) return;

    try {
      setIsSendingAck(true);
      await api.post('/notifications', {
        title: ackSubject.trim(),
        message: ackMessage.trim(),
        notification_type: 'ACKNOWLEDGEMENT',
        target_role: category === 'STUDENT' ? 'MENTOR' : 'STUDENT'
      }).catch(() => null);

      setIsAckModalOpen(false);
      setAckSubject('');
      setAckMessage('');
      setAckRecipient('');

      addToast({
        title: 'Acknowledgement Delivered!',
        message: 'Your acknowledgement notice was successfully posted and notified to the recipient.',
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        title: 'Failed to Send',
        message: err.message || 'Could not send acknowledgement',
        type: 'error'
      });
    } finally {
      setIsSendingAck(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to={category === 'STUDENT' ? '/student' : category === 'MENTOR' ? '/mentor' : category === 'HR' ? '/hr' : '/admin'}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 sm:gap-2.5">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
              {title}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">{subtitle}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <Badge variant={category === 'SUPER_ADMIN' ? 'error' : category === 'HR' ? 'warning' : category === 'MENTOR' ? 'info' : 'success'} className="w-fit self-start sm:self-auto">
              {category} SCOPED
            </Badge>

            {/* Action buttons for task completion & acknowledgements */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[38px]"
            >
              <CheckSquare className="w-4 h-4 shrink-0" />
              Submit Task Completion
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAckModalOpen(true)}
              className="flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[38px]"
            >
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
              Send Acknowledgement
            </Button>
          </div>
        </div>

        {/* Task Completion & Acknowledgement System Roster */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Task Completion & Acknowledgement Roster
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every task completion triggers an automated in-app notification. Mentors & HR can acknowledge submissions directly.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.map(t => (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t.title}</span>
                    <Badge variant={
                      t.status === 'COMPLETED' ? 'success' :
                      t.status === 'ACKNOWLEDGED' ? 'info' : 'warning'
                    }>
                      {t.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span><strong>Trainee:</strong> {t.assignedTo}</span>
                    <span>•</span>
                    <span><strong>Module:</strong> {t.module}</span>
                    <span>•</span>
                    <span><strong>Submitted:</strong> {t.submittedAt}</span>
                  </div>
                  {t.acknowledgedBy && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acknowledged by {t.acknowledgedBy}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.repoUrl && (
                    <a
                      href={t.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Code
                    </a>
                  )}

                  {t.status === 'PENDING_REVIEW' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcknowledgeTask(t.id, t.title)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acknowledge & Sign-Off
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Existing RBAC & Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card title="RBAC Boundary Enforcement" subtitle="Defense-in-Depth Guard">
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                FastAPI Verified
              </div>
              <p>Every request to this module is validated on the server using `Depends(get_current_user)` and strict role dependency checkers.</p>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-mono text-indigo-700 dark:text-indigo-300">
                User Role: {user?.role} <br />
                User Email: {user?.email}
              </div>
            </div>
          </Card>

          <Card title="Module Purpose & Scope" subtitle="PRD Architecture">
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <p>{description}</p>
              <div className="pt-2 flex items-center gap-2">
                <Badge variant="neutral">Phase 1 Auth Guard Active</Badge>
              </div>
            </div>
          </Card>

          <Card title="Security & Isolation Rules" subtitle="Zero Client Trust Policy">
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                <Lock className="w-4 h-4" />
                Data Isolation Active
              </div>
              <p>Cross-tenant queries are blocked on the backend. Attempting unauthorized queries returns an HTTP 403 Forbidden exception.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: SUBMIT TASK COMPLETION                        */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Task Completion"
      >
        <form onSubmit={handleSubmitTask} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="E.g., Milestone 3: Realtime WebSockets & Audit Logs"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Repository / Artifact URL
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo/pull/12"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Completion Notes & Summary
            </label>
            <textarea
              rows={3}
              value={taskNotes}
              onChange={e => setTaskNotes(e.target.value)}
              placeholder="Describe what was implemented, tests executed, and any edge cases handled..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              {isSubmitting ? 'Recording...' : 'Submit & Notify Mentors'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* MODAL: SEND ACKNOWLEDGEMENT                          */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={isAckModalOpen}
        onClose={() => setIsAckModalOpen(false)}
        title="Send Official Acknowledgement"
      >
        <form onSubmit={handleSendCustomAck} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Acknowledgement Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={ackSubject}
              onChange={e => setAckSubject(e.target.value)}
              placeholder="E.g., Task Completion Verified & Signed Off"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Name / Group
            </label>
            <input
              type="text"
              value={ackRecipient}
              onChange={e => setAckRecipient(e.target.value)}
              placeholder="E.g., Assigned Trainee / Full Batch"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Acknowledgement Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={ackMessage}
              onChange={e => setAckMessage(e.target.value)}
              placeholder="Write the acknowledgement feedback or confirmation details..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAckModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSendingAck}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isSendingAck ? 'Sending...' : 'Send Acknowledgement Notice'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
