// TeacherDashboard.jsx

import React, { useState, useEffect } from 'react';
import { MAX_SCORES } from '../config/assessmentConfig';
import { supabase } from '../services/supabase';
import '../styles/TeacherDashboard.css';
import AddStudentModal from '../components/AddStudentModal';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TeacherMessagesList from '../components/TeacherDashboard/TeacherMessagesList';
import TeacherReplyForm from '../components/TeacherDashboard/TeacherReplyForm';
import teacherMessageService from '../services/teacherMessageService';
import { getCurrentTeacherId } from '../services/teacherService';


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
  const [filterGroupType, setFilterGroupType] = useState('');
const [filterGradeLevel, setFilterGradeLevel] = useState('');
const [groupTypes, setGroupTypes] = useState([]);
const [gradeLevels, setGradeLevels] = useState([]);
const [searchTerm, setSearchTerm] = useState('');


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
      const currentTeacherId = await getCurrentTeacherId();
      if (!currentTeacherId) {
        console.error('لا يمكن تحديد هوية المدرس');
        return;
      }
      
      const messages = await teacherMessageService.getTeacherMessages(currentTeacherId);
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
  const filteredStudents = students.filter(student => {
  // فلتر البحث بالاسم
  const nameMatch = `${student.first_name} ${student.last_name}`
    .toLowerCase()
    .includes(searchTerm.toLowerCase());
  
  // فلتر نوع التعليم
  const groupTypeMatch = filterGroupType === '' || 
    student.group_types?.name === filterGroupType;
  
  // فلتر الصف الدراسي
  const gradeLevelMatch = filterGradeLevel === '' || 
    student.grade_levels?.name === filterGradeLevel;
  
  return nameMatch && groupTypeMatch && gradeLevelMatch;
});

  useEffect(() => {
    fetchDashboardData();
    fetchFilterOptions();
  }, []);
  
const calculateTotalScore = (assessment) => {
  if (!assessment || !MAX_SCORES) return 0;
  
  let totalScore = 0;
  let totalMax = 0;
  
  Object.keys(MAX_SCORES).forEach(key => {
    const scoreValue = assessment[key];
    if (scoreValue !== null && scoreValue !== undefined) {
      totalScore += scoreValue;
      totalMax += MAX_SCORES[key];
    }
  });
  
  return `${totalScore}/${totalMax}`;
};

  const fetchFilterOptions = async () => {
    try {
      // جلب أنواع المجموعات
      const { data: groupTypesData } = await supabase
        .from('group_types')
        .select('*')
        .order('name');
      
      // جلب المستويات الدراسية
      const { data: gradeLevelsData } = await supabase
        .from('grade_levels')
        .select('*')
        .order('name');
      
      setGroupTypes(groupTypesData || []);
      setGradeLevels(gradeLevelsData || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const currentTeacherId = await getCurrentTeacherId();
      if (!currentTeacherId) {
        console.error('لا يمكن تحديد هوية المدرس');
        return;
      }

      const { data: studentsData, count: studentsCount } = await supabase
        .from('students')
        .select(`
          *,
          grade_levels (*),
          group_types (*)
        `, { count: 'exact' })
        .eq('teacher_id', currentTeacherId)
        .order('first_name');

const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = الأحد, 6 = السبت
      
      // منطق صحيح لحساب بداية الأسبوع (السبت)
      const startOfWeek = new Date(today);
      const daysToSaturday = dayOfWeek === 6 ? 0 : (dayOfWeek + 1);
      startOfWeek.setDate(today.getDate() - daysToSaturday);
      startOfWeek.setHours(0, 0, 0, 0);

      // حساب نهاية الأسبوع (الجمعة)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);


      const { data: dailyAssessments } = await supabase
        .from('daily_assessments')
        .select('*')
        .eq('teacher_id', currentTeacherId)
        .gte('lesson_date', startOfWeek.toISOString())
        .lte('lesson_date', endOfWeek.toISOString());

      let weeklyAverage = 0;
      if (dailyAssessments && dailyAssessments.length > 0) {
        let totalActualScore = 0;
        let totalMaxPossibleScore = 0;

dailyAssessments.forEach(assessment => {
  let actualScore = 0;
  let maxPossibleScore = 0;
  
  // حساب الدرجة الفعلية والمجموع الأقصى لكل تقييم
  Object.keys(MAX_SCORES).forEach(key => {
    const scoreValue = assessment[key]; // بدون _score
    if (scoreValue !== null && scoreValue !== undefined) {
      actualScore += scoreValue;
      maxPossibleScore += MAX_SCORES[key];
    }
  });
  
  totalActualScore += actualScore;
  totalMaxPossibleScore += maxPossibleScore; // ✅ مجموع ديناميكي
});

weeklyAverage = totalMaxPossibleScore > 0 
  ? Math.round((totalActualScore / totalMaxPossibleScore) * 100)
  : 0;

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
            .eq('teacher_id', currentTeacherId)
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
        .eq('teacher_id', currentTeacherId)
        .gte('lesson_date', startOfWeek.toISOString())
        .lte('lesson_date', endOfWeek.toISOString());

const { data: allLessons } = await supabase
  .from('lessons')
  .select('lesson_date')
  .eq('teacher_id', currentTeacherId); // ✅ هكذا أصبحت السطور متصلة

const weeklyClassesCount = allLessons.filter(lesson => {
  const lessonDate = new Date(lesson.lesson_date);
  return lessonDate >= startOfWeek && lessonDate <= endOfWeek;
}).length;

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
              
              
  <div className="filters-container">
    <div className="filter-group">
      <div className="search-box">
        <input
          type="text"
          placeholder="ابحث باسم الطالب..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span>🔍</span>
      </div>
    </div>
    
    <div className="filter-group">
      <select 
        value={filterGroupType} 
        onChange={(e) => setFilterGroupType(e.target.value)}
        className="filter-select"
      >
        <option value="">كل أنواع التعليم</option>
        {groupTypes.map(group => (
          <option key={group.id} value={group.name}>
            {group.name}
          </option>
        ))}
      </select>
    </div>
    
    <div className="filter-group">
      <select 
        value={filterGradeLevel} 
        onChange={(e) => setFilterGradeLevel(e.target.value)}
        className="filter-select"
      >
        <option value="">كل الصفوف</option>
        {gradeLevels.map(grade => (
          <option key={grade.id} value={grade.name}>
            {grade.name}
          </option>
        ))}
      </select>
    </div>
    
    <button 
      className="btn btn-clear-filters"
      onClick={() => {
        setSearchTerm('');
        setFilterGroupType('');
        setFilterGradeLevel('');
      }}
    >
      مسح الفلاتر
    </button>
  </div>
  
  {/* غيري students إلى filteredStudents في بقية الكود */}
  {!filteredStudents || filteredStudents.length === 0 ? (
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
          {filteredStudents.map((student) => ( // غيري هنا
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
  {calculateTotalScore(student.last_assessment)}
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