import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { User, Program } from '../types';
import { api } from '../api/client';
import { BookOpen, UserCheck, Users, Calendar, Clock, Layers, Sparkles, Check, X, Plus } from 'lucide-react';

interface ProgramFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mentors: User[];
}

const PRESET_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 
  'SQL', 'PostgreSQL', 'Docker', 'AWS', 'Git', 
  'UI/UX Design', 'Java', 'Spring Boot', 'Data Structures', 'REST APIs'
];

const PROGRAM_TYPES = [
  'Tech Master',
  'Short Duration',
  'Internship'
];

export const ProgramFormModal: React.FC<ProgramFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mentors,
}) => {
  const [title, setTitle] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [maxStudents, setMaxStudents] = useState<number | ''>(25);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [programType, setProgramType] = useState('Tech Master');
  const [durationWeeks, setDurationWeeks] = useState<number | ''>(12);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['React', 'Python', 'SQL']);
  const [customSkillInput, setCustomSkillInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed]);
      setCustomSkillInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a Program Name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: title.trim(),
        program_type: programType,
        mentor_id: mentorId || null,
        max_students: maxStudents !== '' ? Number(maxStudents) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        duration_weeks: durationWeeks !== '' ? Number(durationWeeks) : 12,
        skills: selectedSkills,
        description: `${programType} covering ${selectedSkills.join(', ')}`,
      };

      await api.post<Program>('/programs', payload);
      
      // Reset form
      setTitle('');
      setMentorId('');
      setMaxStudents(25);
      setStartDate('');
      setEndDate('');
      setProgramType('Tech Master');
      setDurationWeeks(12);
      setSelectedSkills(['React', 'Python', 'SQL']);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create program.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Program">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            {error}
          </div>
        )}

        {/* Program Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Program Name <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder="e.g. Full Stack Web Development Traineeship"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Row: Mentor & Program Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Program Mentor
            </label>
            <select
              value={mentorId}
              onChange={(e) => setMentorId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">-- Select Program Mentor (Optional) --</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Program Type
            </label>
            <select
              value={programType}
              onChange={(e) => setProgramType(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {PROGRAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row: No. of Students & Duration (Weeks) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              No. of Students (Max Capacity)
            </label>
            <Input
              type="number"
              min="1"
              max="500"
              placeholder="e.g. 25"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Duration (Weeks)
            </label>
            <Input
              type="number"
              min="1"
              max="104"
              placeholder="e.g. 12"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        {/* Row: Start Date & End Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Skills Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Skills Selection for Program
          </label>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            {/* Selected Pills */}
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium self-center mr-1">Selected:</span>
                {selectedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 rounded-full"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className="hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-500/30'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {skill}
                  </button>
                );
              })}
            </div>

            {/* Custom Skill Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                placeholder="Add custom skill (press Enter)..."
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={handleAddCustomSkill}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCustomSkill}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Program...' : 'Create Program'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
