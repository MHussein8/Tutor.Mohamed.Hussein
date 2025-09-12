// src/pages/StudentAssessmentsPage.jsx

import React, { useState, useEffect } from 'react';
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
            lessons (title, created_at)
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

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
                const totalScore = assessment.homework_score + 
                                   assessment.grammar_score + 
                                   assessment.vocabulary_score + 
                                   assessment.memorization_score +
                                   assessment.writing_score +
                                   assessment.interaction_score +
                                   assessment.attendance_score;
                return (
                  <div className="assessment-card" key={assessment.id}>
                    <div className="card-header">
                      <span className="student-name-header">
                        {assessment.lessons.title}
                      </span>
                      <span className="total-score-header">المجموع: {totalScore}</span>
                    </div>
                    <div className="card-body">
                      <div className="score-item">
                        <span className="score-label">الواجب:</span>
                        <span className="score-value">{assessment.homework_score}</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">القواعد:</span>
                        <span className="score-value">{assessment.grammar_score}</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">المفردات:</span>
                        <span className="score-value">{assessment.vocabulary_score}</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">التسميع:</span>
                        <span className="score-value">{assessment.memorization_score}</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">الكتابة:</span>
                        <span className="score-value">{assessment.writing_score}</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">التفاعل:</span>
                        <span className="score-value">{assessment.interaction_score}</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">الحضور:</span>
                        <span className="score-value">{assessment.attendance_score}</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="assessment-date">
                        التاريخ: {new Date(assessment.lessons.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
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