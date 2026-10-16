import React from 'react';
import { Modal } from './Modal';
import { StudentAttendanceCalendar } from './StudentAttendanceCalendar';
import { Student } from '../types';

interface StudentAttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export const StudentAttendanceCalendarModal: React.FC<StudentAttendanceCalendarModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Monthly Attendance Calendar: ${student?.user?.full_name || student?.roll_number || 'Student'}`}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-4">
        {student ? (
          <StudentAttendanceCalendar student={student} />
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">No student selected.</p>
        )}
      </div>
    </Modal>
  );
};
