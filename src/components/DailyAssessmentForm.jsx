import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MAX_SCORES } from '../config/assessmentConfig';
import '../styles/TeacherDashboard.css';

const DailyAssessmentForm = () => {
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [scores, setScores] = useState({});
  const [teacherNotes, setTeacherNotes] = useState('');
const calculateTotalScore = () => {
  return Object.keys(scores).reduce((sum, key) => {
    return sum + (scores[key] ? Number(scores[key]) : 0);
  }, 0);
};
const calculateMaxTotalScore = () => {
  return Object.keys(scores).reduce((sum, key) => {
    return sum + MAX_SCORES[key];
  }, 0);
};

const calculatePercentage = () => {
  const total = calculateTotalScore();
  const maxTotal = calculateMaxTotalScore();
  return maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
};
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
          lesson_date, 
          education_type_id,
          grade_level_id,
          group_types (
            name
          ),
          grade_levels (
            name
          )
        `)
        .order('lesson_date', { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setMessage('خطأ في تحميل الحصص');
    }
  };

  const fetchStudentsForLesson = async (lessonId) => {
    console.log('Fetching students for lesson ID:', lessonId);
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

      if (lessonError) {
        console.error('Lesson fetch error:', lessonError);
        throw lessonError;
      }
      console.log('Lesson data:', lessonData);
      if (!lessonData) {
        setMessage('الحصة غير موجودة');
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level_id, education_type_id')
        .eq('grade_level_id', lessonData.grade_level_id)
        .eq('education_type_id', lessonData.education_type_id)
        .order('first_name');

      if (error) {
        console.error('Students fetch error:', error);
        throw error;
      }
      console.log('Students data:', data);
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

const handleScoreChange = (key, value) => {
  console.log('Updating score:', key, value);
  const numValue = value ? Number(value) : '';
  if (numValue === '' || (numValue >= 0 && numValue <= MAX_SCORES[key])) {
    setScores((prevScores) => ({
      ...prevScores,
      [key]: numValue
    }));
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

const lessonDate = lesson.lesson_date;


const assessmentData = {
  student_id: parseInt(selectedStudentId),
  lesson_id: parseInt(selectedLessonId),
  lesson_date: lessonDate,
  created_at: new Date().toISOString(),
  teacher_notes: teacherNotes
};

// بس اضيف الحقول الي ليها قيم
Object.keys(scores).forEach(key => {
  if (scores[key] !== '' && scores[key] !== null) {
    assessmentData[key] = scores[key];
  }
});

      const { data: existingAssessment, error: checkError } = await supabase
        .from('daily_assessments')
        .select('id')
        .eq('student_id', selectedStudentId)
        .eq('lesson_id', selectedLessonId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
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

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const formatGregorianDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="daily-assessment-form">
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
              {lesson.title} - {formatGregorianDate(lesson.lesson_date)} - 
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

          {selectedStudentId && (
            <>
              <h3>إدخال الدرجات:</h3>
<div className="scores-input-group">
  {console.log('MAX_SCORES:', MAX_SCORES)}
  <div className="score-input-item">
    <label>القواعد ({MAX_SCORES.grammar_score}):</label>
    <input 
      type="number" 
      min="0" 
      max={MAX_SCORES.grammar_score}
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
      max={MAX_SCORES.vocabulary_score}
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
      max={MAX_SCORES.writing_score}
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
      max={MAX_SCORES.homework_score}
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
      max={MAX_SCORES.memorization_score}
      value={scores.memorization_score ?? ''}
      onChange={(e) => handleScoreChange('memorization_score', e.target.value)}
      placeholder="الدرجة"
    />
  </div>
    <div className="score-input-item">
    <label>اختبارات ({MAX_SCORES.quiz_score}):</label>
    <input 
      type="number" 
      min="0" 
      max={MAX_SCORES.quiz_score}
      value={scores.quiz_score ?? ''}
      onChange={(e) => handleScoreChange('quiz_score', e.target.value)}
      placeholder="الدرجة"
    />
  </div>
{/* حقل الحضور */}
<div className="score-input-item">
  <label>الحضور ({MAX_SCORES.attendance_score}): *</label>
  <input 
    type="number" 
    min="0" 
    max={MAX_SCORES.attendance_score}
    value={scores.attendance_score ?? ''}
    onChange={(e) => handleScoreChange('attendance_score', e.target.value)}
    placeholder="الدرجة"
    required
  />
</div>

{/* حقل التفاعل */}
<div className="score-input-item">
  <label>التفاعل ({MAX_SCORES.interaction_score}): *</label>
  <input 
    type="number" 
    min="0" 
    max={MAX_SCORES.interaction_score}
    value={scores.interaction_score ?? ''}
    onChange={(e) => handleScoreChange('interaction_score', e.target.value)}
    placeholder="الدرجة"
    required
  />
</div></div>
<div className="total-score">
  <label>
    الدرجة الإجمالية: {calculateTotalScore()}/{calculateMaxTotalScore()} 
    ({calculatePercentage()}%)
  </label>
</div>
              <div className="form-group">
                <label>ملاحظات المعلم:</label>
                <textarea 
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="أدخل ملاحظاتك هنا..."
                  rows="3"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="submit-btn"
              >
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