// components/DailyAssessmentForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import '../styles/TeacherDashboard.css';

// Define the maximum scores
const MAX_SCORES = {
  homework_score: 20,
  grammar_score: 15,
  vocabulary_score: 15,
  memorization_score: 15,
  attendance_score: 15,
  writing_score: 10,
  interaction_score: 10,
};

const DailyAssessmentForm = () => {
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [scores, setScores] = useState({});
  const [teacherNotes, setTeacherNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id, 
          title, 
          created_at, 
          education_type_id,
          grade_level_id,
          group_types (
            name
          ),
          grade_levels (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setMessage('خطأ في تحميل الحصص');
    }
  };

  const fetchStudentsForLesson = async (lessonId) => {
    setStudentsLoading(true);
    setMessage('');
    setStudents([]);
    setSelectedStudentId('');
    setScores({});
    setTeacherNotes('');
    
    try {
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('grade_level_id, education_type_id')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      if (!lessonData) {
        setMessage('الحصة غير موجودة');
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('grade_level_id', lessonData.grade_level_id)
        .eq('education_type_id', lessonData.education_type_id)
        .order('first_name');

      if (error) throw error;
      
      setStudents(data || []);

    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage('خطأ في تحميل الطلاب');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleLessonChange = (lessonId) => {
    setSelectedLessonId(lessonId);
    if (lessonId) {
      fetchStudentsForLesson(lessonId);
    }
  };
  
  const handleStudentChange = (studentId) => {
    setSelectedStudentId(studentId);
    setScores({});
    setTeacherNotes('');
  };

  const handleScoreChange = (subject, value) => {
    const maxScore = MAX_SCORES[subject];
    const numericValue = parseInt(value, 10);
    
    if (value === '' || (numericValue >= 0 && numericValue <= maxScore)) {
      setScores(prev => ({
        ...prev,
        [subject]: numericValue
      }));
      setMessage('');
    } else {
      setMessage(`الدرجة القصوى لهذا العنصر هي ${maxScore}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedLessonId || !selectedStudentId) {
      setMessage('يرجى اختيار حصة وطالب');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const lesson = lessons.find(l => l.id === parseInt(selectedLessonId));
      if (!lesson) {
        throw new Error('الحصة المحددة غير موجودة في البيانات المحملة');
      }

      const lessonDate = lesson.created_at ? 
        new Date(lesson.created_at).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];

      const assessmentData = {
        student_id: parseInt(selectedStudentId),
        lesson_id: parseInt(selectedLessonId),
        lesson_date: lessonDate,
        created_at: new Date().toISOString(),
        grammar_score: scores.grammar_score ?? 0,
        vocabulary_score: scores.vocabulary_score ?? 0,
        writing_score: scores.writing_score ?? 0,
        homework_score: scores.homework_score ?? 0,
        memorization_score: scores.memorization_score ?? 0,
        interaction_score: scores.interaction_score ?? 0,
        attendance_score: scores.attendance_score ?? 0,
        teacher_notes: teacherNotes
      };

      // Check if assessment for this student/lesson already exists
      const { data: existingAssessment, error: checkError } = await supabase
        .from('daily_assessments')
        .select('id')
        .eq('student_id', selectedStudentId)
        .eq('lesson_id', selectedLessonId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw checkError;
      }
      
      if (existingAssessment) {
        const { error: updateError } = await supabase
          .from('daily_assessments')
          .update(assessmentData)
          .eq('id', existingAssessment.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('daily_assessments')
          .insert([assessmentData]);
        if (insertError) throw insertError;
      }

      setMessage('تم حفظ التقييم بنجاح!');
      setSelectedStudentId('');
      setScores({});
      setTeacherNotes('');
      
    } catch (error) {
      console.error('Error saving assessment:', error);
      setMessage('خطأ في حفظ التقييم: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatGregorianDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const selectedStudent = students.find(s => s.id === parseInt(selectedStudentId));

  return (
    <form onSubmit={handleSubmit} className="section-card assessment-form-card">
      <div className="form-group">
        <label>اختر الحصة:</label>
        <select 
          value={selectedLessonId} 
          onChange={(e) => handleLessonChange(e.target.value)}
          required
        >
          <option value="">-- اختر حصة --</option>
          {lessons.map(lesson => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title} - {formatGregorianDate(lesson.created_at)} - 
              مستوى: {lesson.grade_levels?.name || lesson.grade_level_id} - 
              نوع: {lesson.group_types?.name || lesson.education_type_id}
            </option>
          ))}
        </select>
      </div>

      {studentsLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>جاري تحميل الطلاب...</p>
        </div>
      ) : students.length > 0 ? (
        <>
          <div className="form-group">
            <label>اختر الطالب:</label>
            <select 
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              required
            >
              <option value="">-- اختر طالب --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
          </div>

          {selectedStudentId && selectedStudent && (
            <>
              <h3 className="assessment-students-title">تقييم الطالب: {selectedStudent.first_name} {selectedStudent.last_name}</h3>
              
              <div className="score-inputs-grid-new">
                <div className="score-input-item">
                  <label>القواعد النحوية ({MAX_SCORES.grammar_score}):</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={scores.grammar_score ?? ''}
                    onChange={(e) => handleScoreChange('grammar_score', e.target.value)}
                    placeholder="الدرجة"
                  />
                </div>

                <div className="score-input-item">
                  <label>المفردات ({MAX_SCORES.vocabulary_score}):</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={scores.vocabulary_score ?? ''}
                    onChange={(e) => handleScoreChange('vocabulary_score', e.target.value)}
                    placeholder="الدرجة"
                  />
                </div>

                <div className="score-input-item">
                  <label>الكتابة ({MAX_SCORES.writing_score}):</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={scores.writing_score ?? ''}
                    onChange={(e) => handleScoreChange('writing_score', e.target.value)}
                    placeholder="الدرجة"
                  />
                </div>

                <div className="score-input-item">
                  <label>الواجب المنزلي ({MAX_SCORES.homework_score}):</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={scores.homework_score ?? ''}
                    onChange={(e) => handleScoreChange('homework_score', e.target.value)}
                    placeholder="الدرجة"
                  />
                </div>

                <div className="score-input-item">
                  <label>الحفظ ({MAX_SCORES.memorization_score}):</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={scores.memorization_score ?? ''}
                    onChange={(e) => handleScoreChange('memorization_score', e.target.value)}
                    placeholder="الدرجة"
                  />
                </div>

                <div className="score-input-item">
                  <label>التفاعل ({MAX_SCORES.interaction_score}):</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={scores.interaction_score ?? ''}
                    onChange={(e) => handleScoreChange('interaction_score', e.target.value)}
                    placeholder="الدرجة"
                  />
                </div>

                <div className="score-input-item">
                  <label>الحضور ({MAX_SCORES.attendance_score}):</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={scores.attendance_score ?? ''}
                    onChange={(e) => handleScoreChange('attendance_score', e.target.value)}
                    placeholder="الدرجة"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ملاحظات عامة للطالب:</label>
                <textarea 
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  rows="4"
                  placeholder="اكتب ملاحظاتك العامة للطالب هنا..."
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ التقييم'}
              </button>
            </>
          )}
        </>
      ) : selectedLessonId && !message.includes('نجاح') ? (
        <div className="empty-state-list">
          <div className="empty-icon">👨‍🎓</div>
          <h3>لا يوجد طلاب لهذه الحصة</h3>
          <p>قد تكون هذه الحصة مخصصة لمستوى لا يوجد به طلاب مسجلون بعد</p>
        </div>
      ) : null}

      {message && <div className={`message ${message.includes('نجاح') ? 'success' : 'error'}`}>{message}</div>}
    </form>
  );
};

export default DailyAssessmentForm;