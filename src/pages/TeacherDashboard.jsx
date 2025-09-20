// TeacherDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { MAX_SCORES, calculateMaxTotalScore } from '../config/assessmentConfig';
import { supabase } from '../services/supabase';
import '../styles/TeacherDashboard.css';
import AddStudentModal from '../components/AddStudentModal';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TeacherMessagesList from '../components/TeacherDashboard/TeacherMessagesList';
import TeacherReplyForm from '../components/TeacherDashboard/TeacherReplyForm';
import teacherMessageService from '../services/teacherMessageService';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [averagePerformance, setAveragePerformance] = useState(0);
  const [weeklyAssessments, setWeeklyAssessments] = useState(0);
  const [weeklyClasses, setWeeklyClasses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // متغيرات حالة لقسم الرسائل
  const [activeTab, setActiveTab] = useState('dashboard');
  const [parentMessages, setParentMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReplyForm, setShowReplyForm] = useState(false);

  // تم دمج هذه الدالة مع loadParentMessages لأنها تؤدي نفس الوظيفة
  // وتم إزالة useCallback لتجنب مشكلة الـ ESLint
  // const fetchParentMessages = useCallback(async () => {
  //   setLoadingMessages(true);
  //   try {
  //     const messages = await teacherMessageService.getTeacherMessages(teacherUser.id);
  //     setParentMessages(messages);
  //   } catch (error) {
  //     console.error('Error fetching parent messages:', error);
  //   } finally {
  //     setLoadingMessages(false);
  //   }
  // }, [teacherUser.id]);

  const loadParentMessages = async () => {
    setLoadingMessages(true);
    try {
      const teacherId = 1;
      
      const messages = await teacherMessageService.getTeacherMessages(teacherId);
      setParentMessages(messages);
      
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      loadParentMessages();
    }
  }, [activeTab]);

const handleReplyToMessage = async (replyData) => {
    try {
      setLoadingMessages(true);
      
      // ✅ التعديل هنا: نستخدم selectedMessage.id للحصول على مُعرف الرسالة
      // ونرسلreplyData.replyText التي تحتوي على نص الرد
      await teacherMessageService.replyToMessage({
        parentMessageId: selectedMessage.id, 
        replyText: replyData.replyText 
      });

      // ✅ استدعاء الدالة الصحيحة لتحديث قائمة الرسائل
      await loadParentMessages(); 
      setShowReplyForm(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  const handleSelectMessageForReply = (message) => {
    setSelectedMessage(message);
    setShowReplyForm(true);
  };
  
  const handleMarkAsRead = async (messageId) => {
    try {
      await teacherMessageService.markMessageAsRead(messageId);
      loadParentMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);
  
const calculateTotalScore = (assessment) => {
  if (!MAX_SCORES || typeof MAX_SCORES !== 'object') {
    console.error('MAX_SCORES is undefined or not an object');
    return 0;
  }
  return Object.keys(MAX_SCORES).reduce((sum, key) => {
    return sum + (assessment[`${key}_score`] || 0);
  }, 0);
};

  const fetchDashboardData = async () => {
    try {
      const { data: studentsData, count: studentsCount } = await supabase
        .from('students')
        .select(`
          *,
          grade_levels (*),
          group_types (*)
        `, { count: 'exact' })
        .order('first_name');

      const today = new Date();
      const dayOfWeek = today.getDay();
      let daysToSubtract;
      if (dayOfWeek === 6) {
        daysToSubtract = 0;
      } else {
        daysToSubtract = dayOfWeek + 1;
      }

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysToSubtract);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const { data: dailyAssessments } = await supabase
        .from('daily_assessments')
        .select('*')
        .gte('lesson_date', weekStart.toISOString())
        .lte('lesson_date', weekEnd.toISOString());

      let weeklyAverage = 0;
      if (dailyAssessments && dailyAssessments.length > 0) {
        let totalActualScore = 0;
        let totalMaxPossibleScore = 0;

        dailyAssessments.forEach(assessment => {
          const actualScore = 
            (assessment.homework_score || 0) +
            (assessment.grammar_score || 0) +
            (assessment.vocabulary_score || 0) +
            (assessment.memorization_score || 0) +
            (assessment.attendance_score || 0) +
            (assessment.writing_score || 0) +
            (assessment.interaction_score || 0);
          
          totalActualScore += actualScore;
          totalMaxPossibleScore += 100;
        });

        weeklyAverage = totalMaxPossibleScore > 0 
          ? Math.round((totalActualScore / totalMaxPossibleScore) * 100)
          : 0;
      }

      const studentsWithLastAssessment = await Promise.all(
        (studentsData || []).map(async (student) => {
          const { data: lastAssessment } = await supabase
            .from('daily_assessments')
            .select('*')
            .eq('student_id', student.id)
            .order('lesson_date', { ascending: false })
            .limit(1)
            .single();

          return {
            ...student,
            last_assessment: lastAssessment
          };
        })
      );

      const { count: weeklyAssessmentsCount } = await supabase
        .from('daily_assessments')
        .select('*', { count: 'exact' })
        .gte('lesson_date', weekStart.toISOString())
        .lte('lesson_date', weekEnd.toISOString());

      const { count: weeklyClassesCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact' })
        .gte('lesson_date', weekStart.toISOString())
        .lte('lesson_date', weekEnd.toISOString());

      setStudents(studentsWithLastAssessment || []);
      setStudentsCount(studentsCount || 0);
      setAveragePerformance(weeklyAverage);
      setWeeklyAssessments(weeklyAssessmentsCount || 0);
      setWeeklyClasses(weeklyClassesCount || 0);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar activeTab="dashboard" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جاري تحميل البيانات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="main-content">
        <div className="dashboard-header">
          <h1>لوحة تحكم المعلم</h1>
          <p>مرحباً بك في نظام إدارة الفصل الدراسي</p>
        </div>
        
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span>لوحة التحكم</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <span>رسائل أولياء الأمور</span>
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="stats-section">
              <div className="stats-card-grid">
                <div className="stats-card stat-students">
                  <span className="icon-text">طلاب</span>
                  <div className="stat-info">
                    <div className="stat-value">{studentsCount}</div>
                    <div className="stat-label">عدد الطلاب</div>
                  </div>
                </div>
                
                <div className="stats-card stat-performance">
                  <span className="icon-text">أداء</span>
                  <div className="stat-info">
                    <div className="stat-value">{averagePerformance}%</div>
                    <div className="stat-label">متوسط الأداء</div>
                  </div>
                </div>
                
                <div className="stats-card stat-assessments">
                  <span className="icon-text">تقييم</span>
                  <div className="stat-info">
                    <div className="stat-value">{weeklyAssessments}</div>
                    <div className="stat-label">تقييم هذا الأسبوع</div>
                  </div>
                </div>
                
                <div className="stats-card stat-classes">
                  <span className="icon-text">حصص</span>
                  <div className="stat-info">
                    <div className="stat-value">{weeklyClasses}</div>
                    <div className="stat-label">حصص هذا الأسبوع</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="students-list-section">
              <div className="section-header">
                <h2>قائمة الطلاب</h2>
                <span className="students-count-badge">{studentsCount} طالب</span>
              </div>
              
              {!students || students.length === 0 ? (
                <div className="empty-state-list">
                  <div className="empty-icon">👨‍🎓</div>
                  <h3>لا يوجد طلاب مسجلين</h3>
                  <p>ابدأ بإضافة طلابك الأول</p>
                </div>
              ) : (
                <div className="students-table-container">
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>الصف</th>
                        <th>الحالة</th>
                        <th>آخر تقييم</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <div className="student-profile">
                              <div className="student-avatar">
                                {student.first_name?.[0]}{student.last_name?.[0]}
                              </div>
                              <div className="student-name">
                                {student.first_name} {student.last_name}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="grade-pill">
                              {student.grade_levels?.name || `الصف ${student.grade_level_id}`}
                            </span>
                          </td>                      
                          <td>
                            <span className={`status ${student.group_types?.name === 'اونلاين' ? 'online' : 'offline'}`}>
                              {student.group_types?.name || 'غير محدد'}
                            </span>
                          </td>
                          <td>
                            <div className="last-assessment-info">
                              {student.last_assessment ? (
                                <>
                                  <span className="assessment-score">
                                    {calculateTotalScore(student.last_assessment)}/100
                                  </span>
                                  <span className="assessment-date">
                                    {formatDate(student.last_assessment.lesson_date)}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="assessment-score">-</span>
                                  <span className="assessment-date">لم يتم التقييم بعد</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="student-actions">
                              <button className="action-btn-small" title="عرض الملف">
                                👁️
                              </button>
                              <button className="action-btn-small assess-now" title="تقييم" onClick={() => navigate('/daily-assessment')}>
                                📝
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        
        {activeTab === 'messages' && (
          <div className="teacher-messages-container">
            <h2 className="messages-title">رسائل أولياء الأمور</h2>
            
            {loadingMessages ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>جاري تحميل الرسائل...</p>
              </div>
            ) : showReplyForm && selectedMessage ? (
              <TeacherReplyForm 
                message={selectedMessage}
                onSendReply={handleReplyToMessage}
                onCancel={() => {
                  setShowReplyForm(false);
                  setSelectedMessage(null);
                }}
              />
            ) : (
              <TeacherMessagesList 
                messages={parentMessages}
                onReplyClick={handleSelectMessageForReply}
                onMarkAsRead={handleMarkAsRead}
              />
            )}
          </div>
        )}
      </div>
      
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStudentAdded={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
};

export default TeacherDashboard;