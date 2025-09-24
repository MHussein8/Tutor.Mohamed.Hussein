// WeeklyReportPage.jsx
import React, { useState, useEffect } from 'react';
// إضافة استيراد الدالة الديناميكية لحساب المجموع الأقصى
import { MAX_SCORES, calculateMaxTotalScore } from '../config/assessmentConfig';
import { supabase } from '../services/supabase';
import { getCurrentTeacherId } from '../services/teacherService';
import Sidebar from '../components/Sidebar';
import '../styles/WeeklyReport.css';
import '../styles/TeacherDashboard.css';

const WeeklyReportPage = () => {
  // تم تعديل أسماء المفاتيح لتتوافق مع البيانات القادمة من teacherService.js
const SKILL_NAMES = {
  homework_score: 'الواجب المنزلي',
  grammar_score: 'القواعد النحوية',
  vocabulary_score: 'المفردات',
  memorization_score: 'الحفظ',
  quiz_score: 'الاختبارات القصيرة',
  attendance_score: 'الحضور',
  writing_score: 'الكتابة',
  interaction_score: 'التفاعل',
};

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);

  // دالة مساعدة لحساب المجموع الفعلي
  const calculateActualTotalScore = (report) => {
    if (!report) return 0;
    let total = 0;
    Object.keys(report).forEach(key => {
      // البحث عن المفاتيح التي تنتهي بـ _score
      if (key.endsWith('_score')) {
        const score = report[key];
        if (score !== null && score !== undefined) {
          total += score;
        }
      }
    });
    return total;
  };

  // دالة مساعدة لحساب أقصى درجة ممكنة بشكل ديناميكي
  const calculateActualMaxScore = (report) => {
    if (!report) return 0;
    
    // استخراج المفاتيح التي تم تقييمها فقط
    const evaluatedKeys = Object.keys(report).filter(key => 
      key.endsWith('_score') && report[key] !== null && report[key] !== undefined
    );
    
    // استخدام الدالة الديناميكية لحساب المجموع الأقصى
    return calculateMaxTotalScore(evaluatedKeys);
  };

  // دالة محسنة لحساب الأسبوع الحالي
  function getCurrentWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const startOfWeek = new Date(today);
    const daysToSaturday = (dayOfWeek === 6) ? 0 : (6 - dayOfWeek);
    startOfWeek.setDate(today.getDate() + daysToSaturday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    return startOfWeek.toISOString().split('T')[0];
  }

  // دالة مساعدة لضبط تاريخ البداية إلى السبت
  const adjustToSaturday = (date) => {
    const adjustedDate = new Date(date);
    const dayOfWeek = adjustedDate.getDay();
    
    if (dayOfWeek === 6) return adjustedDate;
    
    const daysToAdd = (6 - dayOfWeek + 7) % 7;
    adjustedDate.setDate(adjustedDate.getDate() + daysToAdd);
    
    return adjustedDate;
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStudents = async () => {
    try {
      const currentTeacherId = await getCurrentTeacherId();
      if (!currentTeacherId) {
        console.error('لا يمكن تحديد هوية المدرس');
        return;
      }

      // استخدام supabase مباشرة مع فلتر teacher_id
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', currentTeacherId)
        .order('first_name');

      if (error) throw error;
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedStudent || !selectedWeek) return;
    
    setLoading(true);
    try {
      const currentTeacherId = await getCurrentTeacherId();
      if (!currentTeacherId) {
        console.error('لا يمكن تحديد هوية المدرس');
        return;
      }

      // استخدام supabase مباشرة مع فلتر teacher_id
      const startOfWeek = new Date(selectedWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { data: dailyAssessments, error } = await supabase
        .from('daily_assessments')
        .select('*')
        .eq('student_id', selectedStudent)
        .eq('teacher_id', currentTeacherId)
        .gte('lesson_date', startOfWeek.toISOString().split('T')[0])
        .lte('lesson_date', endOfWeek.toISOString().split('T')[0])
        .order('lesson_date', { ascending: true });

      if (error) throw error;

      if (!dailyAssessments || dailyAssessments.length === 0) {
        setReport(null);
        return;
      }

      // حساب التقرير بنفس المنطق الموجود في teacherService
      const evaluatedTotals = {};
      dailyAssessments.forEach(assessment => {
        Object.keys(assessment).forEach(key => {
          if (key.endsWith('_score') && assessment[key] !== null && assessment[key] !== undefined) {
            if (!evaluatedTotals[key]) {
              evaluatedTotals[key] = { sum: 0, count: 0 };
            }
            evaluatedTotals[key].sum += assessment[key];
            evaluatedTotals[key].count += 1;
          }
        });
      });

      const report = {};
      Object.keys(evaluatedTotals).forEach(key => {
        report[key] = evaluatedTotals[key].sum;
      });

      setReport(report);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDates = (startDate) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return {
      start: formatDate(start),
      end: formatDate(end)
    };
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleWeekChange = (dateString) => {
    const selectedDate = new Date(dateString);
    const saturdayDate = adjustToSaturday(selectedDate);
    setSelectedWeek(saturdayDate.toISOString().split('T')[0]);
  };

  const weekDates = selectedWeek ? getWeekDates(selectedWeek) : null;

  return (
    <div className="dashboard-layout">
      <Sidebar 
        activeTab="reports" 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      
      <div className={`main-content improved-layout ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
        <div className="weekly-report-page">
          <div className="page-header improved-header">
            <h1>التقرير الأسبوعي لأداء الطلاب</h1>
            <p>تابع أداء الطلاب من خلال تقارير أسبوعية مفصلة</p>
          </div>
          
          <div className="report-controls-container improved-controls">
            <div className="control-section improved-control-section">
              <h3>إعدادات التقرير</h3>
              
              <div className="report-controls">
                <div className="control-group">
                  <label>اختر الطالب:</label>
                  <select 
                    value={selectedStudent} 
                    onChange={(e) => setSelectedStudent(Number(e.target.value))}
                  >
                    <option value="">اختر الطالب</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label>اختر أسبوع التقرير:</label>
                  <input 
                    type="date"
                    value={selectedWeek}
                    onChange={(e) => handleWeekChange(e.target.value)}
                  />
                </div>
                
                <button 
                  onClick={generateReport} 
                  disabled={!selectedStudent || !selectedWeek || loading}
                  className="generate-btn improved-generate-btn"
                >
                  {loading ? 'جاري التحميل...' : 'عرض التقرير'}
                </button>
              </div>
            </div>

            {weekDates && (
              <div className="week-info-section improved-week-info">
                <h3>الفترة الزمنية</h3>
                <div className="week-info">
                  <span className="week-range">من {weekDates.start} إلى {weekDates.end}</span>
                </div>
              </div>
            )}
          </div>

          {report && (
            <div className="report-results improved-results">
              <div className="report-header improved-report-header">
                <h2>تقرير أداء الطالب</h2>
                <div className="performance-summary improved-summary">
                  <div className="summary-item total-score">
                    <span>المجموع الكلي</span>
                    <span className="score-value">
                      {calculateActualTotalScore(report)}/{calculateActualMaxScore(report)}
                    </span>
                  </div>
                  <div className="summary-item percentage-score">
                    <span>النسبة المئوية</span>
                    <span className="score-value">
                      {calculateActualMaxScore(report) > 0 
                        ? Math.round((calculateActualTotalScore(report) / calculateActualMaxScore(report)) * 100) 
                        : 0
                      }%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="report-grid">
                {Object.keys(report)
                  // البحث عن المفاتيح التي تنتهي بـ _score
                  .filter(key => key.endsWith('_score') && report[key] !== null && report[key] !== undefined)
                  .map((key) => {
                    // تم حذف السطر baseKey لأنه لم يعد ضرورياً
                    const maxScore = MAX_SCORES[key] || 0;
                    const score = report[key] || 0;
                    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    
                    return (
                      <div key={key} className="report-item improved-item">
                        <span className="item-label">
                          {SKILL_NAMES[key] || key.replace('_score', '')}
                        </span>
                        <div className="score-container">
                          <span className="score">{score} / {maxScore}</span>
                          <div className="score-bar">
                            <div
                              className="score-progress"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportPage;