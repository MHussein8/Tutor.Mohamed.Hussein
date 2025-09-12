// WeeklyReportPage.jsx
import React, { useState, useEffect } from 'react';
import { getStudents, getWeeklyReport } from '../services/teacherService';
import Sidebar from '../components/Sidebar';
import '../styles/WeeklyReport.css';
import '../styles/TeacherDashboard.css';

const WeeklyReportPage = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);

  function getCurrentWeek() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() - 1);
    return startOfWeek.toISOString().split('T')[0];
  }

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
      const studentsData = await getStudents();
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedStudent || !selectedWeek) return;
    
    setLoading(true);
    try {
      const reportData = await getWeeklyReport(selectedStudent, selectedWeek);
      setReport(reportData);
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
                    onChange={(e) => setSelectedStudent(e.target.value)}
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
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value);
                      const saturdayDate = new Date(selectedDate);
                      saturdayDate.setDate(selectedDate.getDate() - selectedDate.getDay() - 1);
                      setSelectedWeek(saturdayDate.toISOString().split('T')[0]);
                    }}
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
                    <span className="score-value">{report.total_score}/100</span>
                  </div>
                  <div className="summary-item percentage-score">
                    <span>النسبة المئوية</span>
                    <span className="score-value">{report.percentage}%</span>
                  </div>
                </div>
              </div>
              
              <div className="report-grid improved-grid">
                <div className="report-item improved-item">
                  <span className="item-label">الواجب المنزلي</span>
                  <div className="score-container">
                    <span className="score">{report.homework_score}/20</span>
                    <div className="score-bar">
                      <div 
                        className="score-progress" 
                        style={{width: `${(report.homework_score/20)*100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="report-item improved-item">
                  <span className="item-label">القواعد</span>
                  <div className="score-container">
                    <span className="score">{report.grammar_score}/15</span>
                    <div className="score-bar">
                      <div 
                        className="score-progress" 
                        style={{width: `${(report.grammar_score/15)*100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="report-item improved-item">
                  <span className="item-label">المفردات</span>
                  <div className="score-container">
                    <span className="score">{report.vocabulary_score}/15</span>
                    <div className="score-bar">
                      <div 
                        className="score-progress" 
                        style={{width: `${(report.vocabulary_score/15)*100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="report-item improved-item">
                  <span className="item-label">التسميع</span>
                  <div className="score-container">
                    <span className="score">{report.memorization_score}/15</span>
                    <div className="score-bar">
                      <div 
                        className="score-progress" 
                        style={{width: `${(report.memorization_score/15)*100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="report-item improved-item">
                  <span className="item-label">الحضور</span>
                  <div className="score-container">
                    <span className="score">{report.attendance_score}/15</span>
                    <div className="score-bar">
                      <div 
                        className="score-progress" 
                        style={{width: `${(report.attendance_score/15)*100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="report-item improved-item">
                  <span className="item-label">الكتابة</span>
                  <div className="score-container">
                    <span className="score">{report.writing_score}/10</span>
                    <div className="score-bar">
                      <div 
                        className="score-progress" 
                        style={{width: `${(report.writing_score/10)*100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="report-item improved-item">
                  <span className="item-label">التفاعل</span>
                  <div className="score-container">
                    <span className="score">{report.interaction_score}/10</span>
                    <div className="score-bar">
                      <div 
                        className="score-progress" 
                        style={{width: `${(report.interaction_score/10)*100}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportPage;