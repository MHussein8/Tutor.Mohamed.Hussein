import React, { useState, useEffect, useCallback } from 'react';
import { MAX_SCORES, calculateMaxTotalScore } from '../config/assessmentConfig';
import { supabase } from '../services/supabase';
import Sidebar from '../components/Sidebar';
import '../styles/TeacherDashboard.css';
import '../styles/DailyAssessmentReportPage.css';

const DailyAssessmentReportPage = () => {
  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [dailyAssessments, setDailyAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);
  const [stats, setStats] = useState({
    totalStudents: 0,
    averageScore: 0,
    maxScore: 0,
    minScore: 0
  });

  const resetStats = useCallback(() => {
    setStats({
      totalStudents: 0,
      averageScore: 0,
      maxScore: 0,
      minScore: 0
    });
  }, []);

const calculateStats = useCallback((assessments) => {
  if (!assessments || assessments.length === 0) {
    resetStats();
    return;
  }

  const combinedStats = assessments.reduce((acc, assessment) => {
    const evaluatedKeys = Object.keys(MAX_SCORES).filter(key => assessment[key] !== null && assessment[key] !== undefined);
    const currentTotal = evaluatedKeys.reduce((sum, key) => sum + assessment[key], 0);
    const currentMax = calculateMaxTotalScore(evaluatedKeys);

    acc.totalScores.push(currentTotal);
    acc.totalMaxScores.push(currentMax);

    return acc;
  }, { totalScores: [], totalMaxScores: [] });

  const overallTotalScore = combinedStats.totalScores.reduce((sum, score) => sum + score, 0);
  const overallTotalMaxScore = combinedStats.totalMaxScores.reduce((sum, maxScore) => sum + maxScore, 0);

  const averagePercentage = overallTotalMaxScore > 0 ? (overallTotalScore / overallTotalMaxScore) * 100 : 0;

  const allScores = combinedStats.totalScores;
  const minScore = allScores.length > 0 ? Math.min(...allScores) : 0;
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;

  setStats({
    totalStudents: assessments.length,
    averageScore: Math.round(averagePercentage),
    maxScore: maxScore,
    minScore: minScore
  });
}, [resetStats]);

  const fetchLessons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, lesson_date')
        .order('lesson_date', { ascending: false });

      if (error) throw error;
      setLessons(data);
    } catch (error) {
      console.error('Error fetching lessons:', error.message);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const fetchDailyAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_assessments')
        .select(`
          *,
          students (id, first_name, last_name)
        `)
        .eq('lesson_id', selectedLessonId);
      
      if (error) throw error;
      setDailyAssessments(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching daily assessments:', error.message);
      setDailyAssessments([]);
      resetStats();
    } finally {
      setLoading(false);
    }
  }, [selectedLessonId, calculateStats, resetStats]);

  useEffect(() => {
    if (selectedLessonId) {
      fetchDailyAssessments();
    } else {
      setDailyAssessments([]);
      resetStats();
    }
  }, [selectedLessonId, fetchDailyAssessments, resetStats]);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const exportToPDF = useCallback(() => {
    // يمكن تنفيذ هذه الوظيفة لتصدير التقرير كملف PDF
    alert('سيتم تنفيذ وظيفة التصدير إلى PDF في المستقبل');
  }, []);

const selectedLesson = lessons.find(lesson => lesson.id === Number(selectedLessonId));
console.log('--- Debugging selectedLesson ---');
console.log('Value of selectedLessonId:', selectedLessonId);
console.log('Data type of selectedLessonId:', typeof selectedLessonId);
console.log('Value of selectedLesson:', selectedLesson);
console.log('---------------------------------');  

  return (
    <div className="dashboard-layout">
      <Sidebar 
        activeTab="assessments" 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      
      <div className={`main-content ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
        <div className="daily-assessment-report-page-container improved-design">
          <div className="page-header improved-header">
            <div className="header-content">
              <h1>تقييمات الحصص</h1>
              <p>راجع أداء الطلاب في كل حصة بالتفصيل</p>
            </div>
            {selectedLessonId && dailyAssessments.length > 0 && (
              <button className="export-btn" onClick={exportToPDF}>
                📄 تصدير التقرير
              </button>
            )}
          </div>
          
          <div className="controls-section improved-controls">
            <div className="control-group">
              <label htmlFor="lesson-select">اختر الحصة:</label>
              <select 
                id="lesson-select"
                value={selectedLessonId} 
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="improved-select"
              >
                <option value="">-- اختر حصة --</option>
                {lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {new Date(lesson.lesson_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} - {lesson.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedLesson && (
            <div className="lesson-summary-info improved-summary">
              <h2>تفاصيل الحصة: {selectedLesson.title}</h2>
              <p>تاريخ الحصة: {new Date(selectedLesson.lesson_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              
              {dailyAssessments.length > 0 && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.totalStudents}</div>
                      <div className="stat-label">عدد الطلاب</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.averageScore}</div>
                      <div className="stat-label">المتوسط</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.maxScore}</div>
                      <div className="stat-label">أعلى درجة</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📉</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.minScore}</div>
                      <div className="stat-label">أقل درجة</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-message">جاري تحميل تقييمات الطلاب...</p>
            </div>
          ) : (
            selectedLessonId && dailyAssessments.length > 0 ? (
              <div className="assessments-grid improved-grid">
                {dailyAssessments.map(assessment => {
const totalScore = Object.keys(MAX_SCORES).reduce((sum, key) => {
  const score = assessment[key];
  return sum + (score !== null && score !== undefined ? score : 0);
}, 0);

const maxPossibleScore = Object.keys(MAX_SCORES).reduce((sum, key) => {
  const score = assessment[key];
  return sum + (score !== null && score !== undefined ? MAX_SCORES[key] : 0);
}, 0);

                  // تحديد لون البطاقة بناء على الأداء
const performancePercentage = maxPossibleScore > 0 
  ? (totalScore / maxPossibleScore) * 100 
  : 0;

const performanceLevel = performancePercentage >= 80 ? 'excellent' : 
                        performancePercentage >= 60 ? 'good' : 
                        performancePercentage >= 40 ? 'average' : 'weak';

                  return (
                    <div className={`assessment-card improved-card ${performanceLevel}`} key={assessment.id}>
                      <div className="card-header improved-card-header">
                        <div className="student-info">
                          <div className="student-avatar">
                            {assessment.students?.first_name?.[0]}{assessment.students?.last_name?.[0]}
                          </div>
                          <span className="student-name">
                            {assessment.students?.first_name} {assessment.students?.last_name}
                          </span>
                        </div>
<span className={`total-score ${performanceLevel}`}>
  {totalScore}/{maxPossibleScore}
</span>
                      </div>
                      <div className="card-body improved-card-body">
<div className="scores-grid improved-grid">
  {Object.keys(MAX_SCORES)
    .filter(key => assessment[key] !== null && assessment[key] !== undefined)
    .map((key) => {
      const score = assessment[key];
      const maxScore = MAX_SCORES[key];
      const percentage = (score / maxScore) * 100;

      return (
        <div key={key} className="score-item improved">
          <span className="score-label">
            {key === 'homework_score' ? 'الواجب' :
             key === 'grammar_score' ? 'القواعد' :
             key === 'vocabulary_score' ? 'المفردات' :
             key === 'memorization_score' ? 'التسميع' :
             key === 'attendance_score' ? 'الحضور' :
             key === 'writing_score' ? 'الكتابة' :
             key === 'interaction_score' ? 'التفاعل' :
             key === 'quiz_score' ? 'الاختبارات' : key}
          </span>
          <div className="score-bar-container">
            <div 
              className="score-bar" 
              style={{width: `${percentage}%`}}
            ></div>
          </div>
          <span className="score-value">
            {`${score}/${maxScore}`}
          </span>
        </div>
      );
  })}
</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              selectedLessonId && !loading && (
                <div className="no-data-container">
                  <div className="no-data-icon">📊</div>
                  <p className="no-data-message">لا توجد تقييمات لهذه الحصة بعد.</p>
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyAssessmentReportPage;