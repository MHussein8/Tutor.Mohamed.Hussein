// src/pages/StudentAssessmentsPage.jsx

import React, { useState, useEffect } from 'react';
import { MAX_SCORES, calculateMaxTotalScore } from '../config/assessmentConfig';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Sidebar from '../components/Sidebar';
import '../styles/TeacherDashboard.css';
import '../styles/DailyAssessmentReportPage.css'; // استخدام نفس التنسيقات

const StudentAssessmentsPage = () => {
  const { studentId } = useParams(); // جلب الـ ID من الـ URL
  const [student, setStudent] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 992);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchStudentAssessments = async () => {
      setLoading(true);
      try {
        // جلب بيانات الطالب
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('first_name, last_name')
          .eq('id', studentId)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

        // جلب جميع التقييمات لهذا الطالب
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from('daily_assessments')
          .select(`
            *,
            lessons (title, lesson_date)
          `)
          .eq('student_id', studentId)
          .order('lesson_date', { ascending: false });

        if (assessmentsError) throw assessmentsError;
        setAssessments(assessmentsData);
      } catch (error) {
        console.error('Error fetching student assessments:', error.message);
        setAssessments([]);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudentAssessments();
    }
  }, [studentId]);

  return (
    <div className="dashboard-layout">
      <Sidebar 
        activeTab="students" 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      
      <div className={`main-content ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
        <div className="daily-assessment-report-page-container">
          <div className="page-header">
            {loading ? (
              <h1>جاري التحميل...</h1>
            ) : student ? (
              <>
                <h1>سجل تقييمات الطالب: {student.first_name} {student.last_name}</h1>
                <p>هنا تجد جميع التقييمات اليومية الخاصة بهذا الطالب.</p>
              </>
            ) : (
              <h1>لم يتم العثور على الطالب</h1>
            )}
          </div>
          
          {loading ? (
            <p className="loading-message">جاري تحميل التقييمات...</p>
          ) : assessments.length > 0 ? (
            <div className="assessments-grid">
              {assessments.map(assessment => {
const totalScore = Object.keys(MAX_SCORES).reduce((sum, key) => {
  return sum + (assessment[`${key}_score`] || 0);
}, 0);
                return (
                  <div className="assessment-card" key={assessment.id}>
                    <div className="card-header">
                      <span className="student-name-header">
                        {assessment.lessons.title}
                      </span>
                      <span className="total-score-header">المجموع: {totalScore}/{calculateMaxTotalScore()}</span>
                    </div>
                    <div className="card-body">
{Object.keys(MAX_SCORES).map((key) => (
  <div key={key} className="score-item">
    <span className="score-label">
      {key === 'homework' ? 'الواجب' :
       key === 'grammar' ? 'القواعد' :
       key === 'vocabulary' ? 'المفردات' :
       key === 'memorization' ? 'التسميع' :
       key === 'attendance' ? 'الحضور' :
       key === 'writing' ? 'الكتابة' :
       key === 'interaction' ? 'التفاعل' : key}:
    </span>
    <span className="score-value">{assessment[`${key}_score`]}/{MAX_SCORES[key]}</span>
  </div>
))}
                    </div>
                    <div className="card-footer">
                      <span className="assessment-date">
                        التاريخ: {new Date(assessment.lessons.lesson_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-data-message">لا توجد تقييمات مسجلة لهذا الطالب بعد.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAssessmentsPage;