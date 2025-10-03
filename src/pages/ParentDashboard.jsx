/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { MAX_SCORES } from '../config/assessmentConfig';
import { parentService } from '../services/parentService';
import parentMessageService from '../services/parentMessageService';
import ParentStatsGrid from '../components/ParentDashboard/ParentStatsGrid';
import StudentProgressChart from '../components/ParentDashboard/StudentProgressChart';
import ParentMessageForm from '../components/ParentDashboard/ParentMessageForm';
import AddStudentToParentModal from '../components/ParentDashboard/AddStudentToParentModal';
import '../styles/ParentDashboard.css';
import '../styles/ParentDashboardMessages.css';

// دالة مساعدة للحصول على الأسبوع الحالي
const getCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay(); // 0 = الأحد ... 6 = السبت

  // السبت = 6 → نحسب الفرق ونرجع لبداية الأسبوع
  const diff = (day - 6 + 7) % 7;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek.toLocaleDateString('en-CA');
};

// دالة مساعدة للحصول على نطاق التاريخ في الأسبوع للعرض
const getWeekRange = (weekDate) => {
  const start = new Date(weekDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 5); // 5 أيام بعد السبت (لبلوغ الخميس)

  // هذه هي الأسطر التي يجب عليك إنشاؤها (لأنها تعرض التاريخ)
  const formatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
  const startFormatted = start.toLocaleDateString('ar-EG', formatOptions);
  const endFormatted = end.toLocaleDateString('ar-EG', formatOptions);
  
  return `${startFormatted} - ${endFormatted}`;
};

// دالة عبقرية لتحديد لون شريط التقدم بناءً على الدرجة
const getScoreColor = (score, maxScore) => {
  if (maxScore === 0) return 'hsl(0, 0%, 50%)';
  const hue = (score / maxScore) * 120;
  return `hsl(${hue}, 70%, 50%)`;
};

// دالة مساعدة للحصول على أيام الأسبوع ككائنات { name, date }
const getDaysOfWeek = (weekDate) => {
  const start = new Date(weekDate);
  const days = [];
  
  // نضمن تكراراً لـ 7 أيام كاملة بدءاً من تاريخ البداية
  const options = { weekday: 'long' }; 

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({
      dateString: date.toLocaleDateString('en-CA'), // مثال: 2023-10-21 (للمقارنة في الفلترة)
      dayName: date.toLocaleDateString('ar-EG', options), // مثال: السبت
      fullDate: date.toLocaleDateString('ar-EG'), // مثال: ٢١‏/١٠‏/٢٠٢٣
    });
  }
  return days;
};

// تم تعديل هذا السطر لقبول الـ prop
const ParentDashboard = ({ parentUser, onLogout, parentId }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentTeacherId, setStudentTeacherId] = useState(null);
  const [dailyAssessments, setDailyAssessments] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [weeklyLessons, setWeeklyLessons] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [stats, setStats] = useState({
    performanceAverage: 0,
    completedLessons: 0,
    teacherNotes: 0,
    progressPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
const [sentMessages, setSentMessages] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // الحالة الجديدة
  // دالة لجلب الرسائل المرسلة من ولي الأمر
const fetchSentMessages = useCallback(async () => {
  if (!parentId) {
    console.error('Parent ID is not available.');
    return;
  }
  try {
    const messages = await parentMessageService.getSentMessages(parentId);
    setSentMessages(messages);
  } catch (error) {
    console.error('Error fetching sent messages:', error);
  }
}, [parentId]);
  const [setMessageSending] = useState(false);
  const [mostImprovedSkill, setMostImprovedSkill] = useState(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  // دالة حساب نسبة التقدم (مش useCallback)
const calculateProgress = async (studentId) => {
  try {
    const lastTwoAssessments = await parentService.getLastTwoAssessments(studentId);
    if (lastTwoAssessments.length < 2) return 0;

    const [current, previous] = lastTwoAssessments;
    
    // 1. تحديد المهارات التي تم تقييمها في آخر تقييمين
    const evaluatedKeys = new Set();
    Object.keys(MAX_SCORES).forEach(key => {
      if ((current[key] !== null && current[key] !== undefined) || (previous[key] !== null && previous[key] !== undefined)) {
        evaluatedKeys.add(key);
      }
    });

    // 2. حساب الأداء من التقييم الحالي والسابق بناءً على المهارات المحددة
    const currentPerformance = Array.from(evaluatedKeys).reduce((sum, key) => sum + (current[key] || 0), 0);
    const previousPerformance = Array.from(evaluatedKeys).reduce((sum, key) => sum + (previous[key] || 0), 0);

    // 3. حساب المجموع الأقصى الصحيح بناءً على المهارات التي تم تقييمها فقط
    const dynamicMaxScore = Array.from(evaluatedKeys).reduce((sum, key) => sum + MAX_SCORES[key], 0);

    if (dynamicMaxScore === 0) return 0; // تجنب القسمة على صفر

    const progress = ((currentPerformance - previousPerformance) / dynamicMaxScore) * 100;
    return Math.round(progress);
  } catch (error) {
    console.error('Error calculating progress:', error);
    return 0;
  }
};

const loadStudentData = useCallback(async (studentId) => {
  try {
    const [dailyData] = await Promise.all([
      parentService.getDailyAssessments(studentId),
    ]);

    setDailyAssessments(dailyData);
    const improvedSkillData = await parentService.getMostImprovedSkill(studentId);
setMostImprovedSkill(improvedSkillData);

const totalScore = dailyData.reduce((sum, assessment) => {
  let assessmentTotal = 0;
  let assessmentCount = 0;
  
  Object.keys(MAX_SCORES).forEach(key => {
    if (assessment[key] !== null && assessment[key] !== undefined) {
      assessmentTotal += assessment[key] || 0;
      assessmentCount += 1;
    }
  });
  
  return sum + (assessmentCount > 0 ? assessmentTotal : 0);
}, 0);

// حساب النسبة بناء على العناصر المتاحة فقط
const availableMaxScore = dailyData.reduce((sum, assessment) => {
  let assessmentMax = 0;
  
  Object.keys(MAX_SCORES).forEach(key => {
    if (assessment[key] !== null && assessment[key] !== undefined) {
      assessmentMax += MAX_SCORES[key];
    }
  });
  
  return sum + assessmentMax;
}, 0);

const averagePerformance = availableMaxScore > 0
  ? Math.round((totalScore / availableMaxScore) * 100)
  : 0;

const progressPercentage = await calculateProgress(studentId);


    const teacherNotesCount = dailyData.filter(assessment =>
      assessment.teacher_notes && assessment.teacher_notes.trim() !== ''
    ).length;

    setStats({
      performanceAverage: averagePerformance,
      completedLessons: dailyData.length,
      teacherNotes: teacherNotesCount,
      progressPercentage: progressPercentage || 0
    });
  } catch (error) {
    console.error('Error loading student data:', error);
  }
}, []);

// تحديث معلم الطالب عند تغيير الطالب المختار
useEffect(() => {
  const updateStudentTeacher = () => {
    if (selectedStudent && students.length > 0) {
      const currentStudent = students.find(student => 
        student.student_id === selectedStudent
      );
      
      // جلب teacher_id من بيانات الطالب
      const teacherId = currentStudent?.students?.teacher_id;
      setStudentTeacherId(teacherId || null);
    }
  };

  updateStudentTeacher();
}, [selectedStudent, students]);


  const loadParentData = useCallback(async () => {
    try {
      setLoading(true);
      const studentData = await parentService.getStudentsByParent(parentId);
      setStudents(studentData);
      console.log('بيانات الطلاب المحملة:', studentData);


      if (studentData.length > 0) {
        setSelectedStudent(studentData[0].student_id);
        await loadStudentData(studentData[0].student_id);
      }
    } catch (error) {
      console.error('Error loading parent data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadStudentData, parentId]);

  useEffect(() => {
    loadParentData();
  }, [loadParentData]);

    useEffect(() => {
    // جلب الرسائل فقط عندما يكون التبويب النشط هو "messages"
    if (activeTab === 'messages') {
      fetchSentMessages();
    }
  }, [activeTab, fetchSentMessages]);
  
  // دالة جديدة لتحميل الدروس الأسبوعية
const loadWeeklyLessons = async (studentId, weekDate) => {
  try {
    const lessonsData = await parentService.getWeeklyLessons(studentId, weekDate);
    console.log("📚 جميع الدروس المحملة:", lessonsData); // 👈 أضف هذا
    setWeeklyLessons(lessonsData || []);
  } catch (error) {
    console.error('Error loading weekly lessons:', error);
    setWeeklyLessons([]);
  }
};
useEffect(() => {
    if (selectedStudent) {
      loadWeeklyReport(selectedStudent, selectedWeek);
      loadParentMessages(selectedStudent);
      loadWeeklyLessons(selectedStudent, selectedWeek);
    }
    
    // تعيين اليوم الافتراضي لأول يوم في الأسبوع المختار
    if (selectedWeek) {
        const days = getDaysOfWeek(selectedWeek);
        if (days.length > 0) {
            setSelectedDay(days[0].dateString);
        }
    }
  }, [selectedStudent, selectedWeek]);
  
  const loadParentMessages = async (studentId) => {
    try {
      // استدعاء API لجلب الرسائل السابقة
      const messages = await parentMessageService.getParentMessages(studentId, parentId);
      setSentMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  const handleSendMessage = async (messageData) => {
    try {
      setMessageSending(true);
      // إرسال الرسالة إلى قاعدة البيانات باستخدام خدمة الرسائل
      const result = await parentMessageService.sendParentMessage(messageData);
      
      // إضافة الرسالة المرسلة إلى قائمة الرسائل المعروضة
      setSentMessages(prev => [result, ...prev]);
      
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setMessageSending(false);
    }
  };

const loadWeeklyReport = async (studentId, weekDate) => {
  try {
     // استدعاء جلب تقارير التقييم والدروس الأسبوعية
    const [reportData, lessonsData] = await Promise.all([
      parentService.getWeeklyReportFromDaily(studentId, weekDate),
      parentService.getWeeklyLessons(studentId, weekDate) // 👈 جلب الدروس
     ]);
     setWeeklyLessons(lessonsData || []); // 👈 تخزين دروس الأسبوع
     
     if (reportData) {
      // إعادة حساب المجموع والنسبة بناء على العناصر المتاحة فقط
      let totalScore = 0;
      let totalMax = 0;
      
      Object.keys(MAX_SCORES).forEach(key => {
        const scoreValue = reportData[key] || reportData[`${key}_score`];
        if (scoreValue !== null && scoreValue !== undefined) {
          totalScore += scoreValue;
          totalMax += MAX_SCORES[key];
        }
      });
      
      // تحديث البيانات بالقيم المحسوبة حديثاً
setWeeklyReport({
  ...reportData,
  total_score: totalScore,
  percentage: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
  calculated_max_score: totalMax // يمكن إضافته لعرض القيمة القصوى المحسوبة
});
    } else {
      setWeeklyReport(null);
    }
  } catch (error) {
    console.error('Error loading weekly report:', error);
    setWeeklyReport(null);
  }
};

  const handleStudentChange = async (studentId) => {
    setSelectedStudent(studentId);
    await loadStudentData(studentId);
    await loadWeeklyReport(studentId, selectedWeek);
  };

const handlePreviousWeek = () => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setSelectedWeek(newWeek.toISOString().split('T')[0]);
    setSelectedDay(null); // مسح اليوم المختار لتحديثه في useEffect
  };

const handleNextWeek = () => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setSelectedWeek(newWeek.toISOString().split('T')[0]);
    setSelectedDay(null); // مسح اليوم المختار لتحديثه في useEffect
  };

const handleDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    const day = selectedDate.getDay(); // 0 = الأحد ... 6 = السبت

    // السبت = 6 → نحسب الفرق ونرجع لبداية الأسبوع
    const diff = (day - 6 + 7) % 7;

    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    setSelectedWeek(startOfWeek.toLocaleDateString('en-CA'));
};

  if (loading) {
    return (
      <div className="parent-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>جاري تحميل بيانات الطالب...</p>
      </div>
    );
  }

  const cardColors = ['#7567f8ff', '#fa60baff', '#67f8b0ff', '#d7f749ff'];
  const assessmentsWithNotes = dailyAssessments.filter(assessment => assessment.teacher_notes && assessment.teacher_notes.trim() !== '');

  return (
    <div className="parent-dashboard-new">
      <div className="dashboard-header-new">
        <div className="header-top-bar-new">
        </div>

        <div className="header-main-content-new">
          <h1>لوحة متابعة الطالب</h1>
          <p>مرحباً بك في نظام متابعة الأداء الدراسي</p>
        </div>
        
        {/* الحاوية الجديدة لرسالة الترحيب ومستطيل اختيار الطالب */}
        <div className="header-bottom-bar-new">
          <div className="header-controls-group">
            <span className="welcome-message-new">مرحباً، {parentUser?.name}</span>

            <div className="student-selector-new">
              <div className="selector-wrapper-new">
                <i className="icon-student">👨‍🎓</i>
                <select
                  value={selectedStudent || ''}
                  onChange={(e) => handleStudentChange(parseInt(e.target.value))}
                  className="student-dropdown-new"
                >
                  {students.map(student => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.students?.first_name} {student.students?.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="header-buttons-group">
            <button onClick={onLogout} className="logout-btn-new">
              تسجيل الخروج
            </button>
            <button 
              className="add-student-btn-new"
              onClick={() => setIsAddStudentModalOpen(true)}
            >
              <i className="fas fa-plus"></i>
              إضافة طالب
            </button>
          </div>
        </div>
      </div>
      <div className="dashboard-tabs-new">        <button
          className={`tab-btn-new ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="tab-icon">📊</i>
          <span>نظرة عامة</span>
        </button>
        <button
          className={`tab-btn-new ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessments')}
        >
          <i className="tab-icon">📝</i>
          <span>التقييمات</span>
        </button>
        <button
          className={`tab-btn-new ${activeTab === 'weekly-plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly-plan')}
           >
          <i className="tab-icon">📘</i> {/* 👈 تم توحيد الأيقونة في وسم i */}
          <span>الخطة الأسبوعية</span> {/* 👈 تم توحيد النص في وسم span */}
        </button>
        <button
          className={`tab-btn-new ${activeTab === 'weekly-report' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly-report')}
        >
          <i className="tab-icon">📈</i>
          <span>التقرير الأسبوعي</span>
        </button>
        <button
          className={`tab-btn-new ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <i className="tab-icon">📋</i>
          <span>ملاحظات المعلم</span>
        </button>
        <button
          className={`tab-btn-new ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          <i className="tab-icon">✉️</i>
          <span>رسائل للمعلم</span>
        </button>
      </div>
      <div className="dashboard-content-new">
        {activeTab === 'overview' && (
          <>
            <ParentStatsGrid 
  stats={stats} 
  colors={cardColors} 
  mostImprovedSkill={mostImprovedSkill} 
/>
            <div className="content-grid-new">
              <div className="main-section-new">
                <div className="chart-card-new">
                  <h3>آخر التقييمات</h3>
                  <StudentProgressChart dailyAssessments={dailyAssessments.slice(0, 7)} />
                </div>
              </div>
              <div className="sidebar-section-new">
                <div className="quick-stats-card-new">
                  <h3>إحصائيات سريعة</h3>
                  <div className="quick-stats-new">
                    <div className="stat-item-new">
                      <span className="stat-label-new">متوسط الأداء</span>
                      <span className="stat-value-new">{stats.performanceAverage}%</span>
                    </div>
                    <div className="stat-item-new">
  <span className="stat-label-new">نسبة التقدم</span>
  <span className="stat-value-new">{stats.progressPercentage}%</span>
</div>
                    <div className="stat-item-new">
                      <span className="stat-label-new">عدد الحصص</span>
                      <span className="stat-value-new">{stats.completedLessons}</span>
                    </div>
                    <div className="stat-item-new">
                      <span className="stat-label-new">ملاحظات المعلم</span>
                      <span className="stat-value-new">{stats.teacherNotes}</span>
                    </div>
                  </div>
                </div>
                <div className="recent-notes-card-new">
                  <h3>آخر الملاحظات</h3>
                  <div className="notes-list-new">
                    {assessmentsWithNotes.slice(0, 3).map(assessment => (
                      <div key={assessment.id} className="note-preview-new">
                        <p className="note-text-new">{assessment.teacher_notes.substring(0, 60)}...</p>
                        <span className="note-date-new">
                          {new Date(assessment.lesson_date).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    ))}
                    {assessmentsWithNotes.length === 0 && (
                      <p className="no-notes-new">لا توجد ملاحظات حالياً</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === 'assessments' && (
          <div className="assessments-tab-new">
            <div className="tab-header-new">
              <h2>سجل التقييمات</h2>
              <p>آخر التقييمات اليومية للطالب</p>
            </div>
            <div className="assessments-grid-new">
              {dailyAssessments.map(assessment => (
                <div key={assessment.id} className="assessment-card-new">
                  <div className="assessment-header-new">
                    <h4>تقييم يوم {new Date(assessment.lesson_date).toLocaleDateString('ar-EG')}</h4>
<span className="total-score-new">
  {(() => {
    let totalScore = 0;
    let totalMax = 0;
    
    Object.keys(MAX_SCORES).forEach(key => {
      if (assessment[key] !== null && assessment[key] !== undefined) {
        totalScore += assessment[key] || 0;
        totalMax += MAX_SCORES[key];
      }
    });
    
    return `${Math.round(totalScore)} / ${totalMax}`;
  })()}
</span>
                  </div>
                  <div className="scores-grid-new">
                    
{assessment.grammar_score !== null && assessment.grammar_score !== undefined && (
  <div className="score-item-new">
    <span>الجرامر</span>
    <div className="score-bar-new">
      <div
        className="score-progress-new"
        style={{width: `${(assessment.grammar_score || 0)/5*100}%`, background: getScoreColor(assessment.grammar_score || 0, 5)}}
      ></div>
      <span className="score-new">{assessment.grammar_score}/5</span>
    </div>
  </div>
)}              
                    {assessment.vocabulary_score !== null && assessment.vocabulary_score !== undefined && (
                    <div className="score-item-new">
                      <span>المفردات</span>
                      <div className="score-bar-new">
                        <div
                          className="score-progress-new"
                          style={{width: `${(assessment.vocabulary_score || 0)/5*100}%`, background: getScoreColor(assessment.vocabulary_score || 0, 5)}}
                        ></div>
                        <span className="score-new">{assessment.vocabulary_score}/5</span>
                      </div>
                    </div>
                    )}
                    {assessment.writing_score !== null && assessment.writing_score !== undefined && (
                    <div className="score-item-new">
                      <span>الكتابة</span>
                      <div className="score-bar-new">
                        <div
                          className="score-progress-new"
                          style={{width: `${(assessment.writing_score || 0)/5*100}%`, background: getScoreColor(assessment.writing_score || 0, 5)}}
                        ></div>
                        <span className="score-new">{assessment.writing_score}/5</span>
                      </div>
                    </div>
                    )}
                    {assessment.homework_score !== null && assessment.homework_score !== undefined && (
                    <div className="score-item-new">
                      <span>الواجب</span>
                      <div className="score-bar-new">
                        <div
                          className="score-progress-new"
                          style={{width: `${(assessment.homework_score || 0)/10*100}%`, background: getScoreColor(assessment.homework_score || 0, 10)}}
                        ></div>
                        <span className="score-new">{assessment.homework_score}/10</span>
                      </div>
                    </div>
                    )}
                    {assessment.memorization_score !== null && assessment.memorization_score !== undefined && (
                    <div className="score-item-new">
                      <span>التسميع</span>
                      <div className="score-bar-new">
                        <div
                          className="score-progress-new"
                          style={{width: `${(assessment.memorization_score || 0)/15*100}%`,
                                  background: getScoreColor(assessment.memorization_score || 0, 15)}}
                        ></div>
                        <span className="score-new">{assessment.memorization_score}/15</span>
                      </div>
                    </div>
                    )}
                    {assessment.interaction_score !== null && assessment.interaction_score !== undefined && (
                    <div className="score-item-new">
                      <span>التفاعل</span>
                      <div className="score-bar-new">
                        <div
                          className="score-progress-new"
                          style={{width: `${(assessment.interaction_score || 0)/5*100}%`, background: getScoreColor(assessment.interaction_score || 0, 5)}}
                        ></div>
                        <span className="score-new">{assessment.interaction_score}/5</span>
                      </div>
                    </div>
                    )}
                    {assessment.quiz_score !== null && assessment.quiz_score !== undefined && (
                    <div className="score-item-new">
  <span>الاختبارات القصيرة</span>
  <div className="score-bar-new">
    <div
      className="score-progress-new"
      style={{width: `${(assessment.quiz_score || 0)/35*100}%`, background: getScoreColor(assessment.quiz_score || 0, 35)}}
    ></div>
    <span className="score-new">{assessment.quiz_score}/35</span>
  </div>
</div>
                    )}
                    {assessment.attendance_score !== null && assessment.attendance_score !== undefined && (
                    <div className="score-item-new">
                      <span>الحضور</span>
                      <div className="score-bar-new">
                        <div
                          className="score-progress-new"
                          style={{width: `${(assessment.attendance_score || 0)/10*100}%`, background: getScoreColor(assessment.attendance_score || 0, 10)}}
                        ></div>
                        <span className="score-new">{assessment.attendance_score}/10</span>
                      </div>
                    </div>
                    )}
                  </div>
                  {assessment.teacher_notes && (
                    <div className="assessment-notes-new">
                      <p><strong>ملاحظات المعلم:</strong> {assessment.teacher_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'weekly-report' && (
          <div className="weekly-report-tab-new">
            <div className="tab-header-with-controls">
              <h2>التقرير الأسبوعي</h2>
              <div className="date-input-container">
                  <label htmlFor="week-date-picker">اختر أسبوعًا:</label>
                  <input
                      type="date"
                      id="week-date-picker"
                      value={selectedWeek}
                      onChange={handleDateChange}
                  />
              </div>
            </div>

            <div className="week-selector-container-new-mobile-fix">
              <div className="week-navigation-new">
                <button onClick={handlePreviousWeek} className="nav-btn-new">
                  <i className="fas fa-chevron-right"></i>
                  <span>الأسبوع السابق</span>
                </button>
                <div className="current-week-display-new">
                  {getWeekRange(selectedWeek)}
                </div>
                <button onClick={handleNextWeek} className="nav-btn-new">
                  <span>الأسبوع التالي</span>
                  <i className="fas fa-chevron-left"></i>
                </button>
              </div>
            </div>
            {weeklyReport ? (
              <div className="weekly-report-content-new">
                <div className="report-summary-new">
                  <div className="total-score-card-new">
                    <h3>المجموع الكلي</h3>
<div className="score-new-large">
  {(() => {
    const { totalScore, totalMax } = Object.keys(MAX_SCORES).reduce((acc, key) => {
      const scoreValue = weeklyReport[key] || weeklyReport[`${key}_score`];
      
      if (scoreValue !== null && scoreValue !== undefined) {
        acc.totalScore += scoreValue;
        acc.totalMax += MAX_SCORES[key];
      }
      
      return acc;
    }, { totalScore: 0, totalMax: 0 });
    
    return `${totalScore} / ${totalMax}`;
  })()}
</div>
                    <div className="percentage-new">
  {(() => {
    let totalScore = 0;
    let totalMax = 0;
    
    Object.keys(MAX_SCORES).forEach(key => {
      const scoreValue = weeklyReport[`${key}_score`] || weeklyReport[key];
      if (scoreValue !== null && scoreValue !== undefined) {
        totalScore += scoreValue;
        totalMax += MAX_SCORES[key];
      }
    });
    
    return totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  })()}%
</div>
                    <div className="percentage-explanation-new" style={{fontSize: '12px', opacity: 0.7}}>
  (محسوب على العناصر المتاحة فقط)
</div>
                  </div>
                </div>
                <div className="detailed-scores-new">
                  <h3>التفاصيل</h3>
<div className="scores-grid-detailed-new">
  {Object.keys(MAX_SCORES).map((key) => {
    const scoreValue = weeklyReport[key] || weeklyReport[`${key}_score`];
    const maxScore = MAX_SCORES[key];
    
    // عرض العنصر فقط إذا كانت له قيمة
    if (scoreValue !== null && scoreValue !== undefined) {
      return (
        <div key={key} className="score-item-detailed-new">
          <span className="score-label-new">
            {key === 'homework_score' ? 'الواجب المنزلي' :
             key === 'grammar_score' ? 'الجرامر' :
             key === 'vocabulary_score' ? 'المفردات' :
             key === 'memorization_score' ? 'التسميع' :
             key === 'attendance_score' ? 'الحضور' :
             key === 'writing_score' ? 'الكتابة' :
             key === 'interaction_score' ? 'التفاعل' :
             key === 'quiz_score' ? 'الاختبارات القصيرة' : key}
          </span>
          <div className="score-container-detailed-new">
            <span className="score-value-new">{scoreValue}/{maxScore}</span>
            <div className="score-bar-detailed-new">
              <div
                className="score-progress-detailed-new"
                style={{ 
                  width: `${(scoreValue / maxScore) * 100}%`,
                  background: getScoreColor(scoreValue, maxScore) 
                }}
              ></div>
            </div>
          </div>
        </div>
      );
    }
    return null; // لا تعرض العناصر التي لا تحتوي على قيم
  })}
</div>
                </div>
                {weeklyReport.teacher_notes && (
                  <div className="teacher-notes-new">
                    <h3>ملاحظات المعلم</h3>
                    <p>{weeklyReport.teacher_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-report-new">
                <div className="no-report-icon">📊</div>
                <p>لا يوجد تقرير أسبوعي لهذا الأسبوع</p>
              </div>
            )}
          </div>
        )}
{/* 💥 التبويب الجديد والفخم: الخطة الأسبوعية (weekly-plan) */}
{activeTab === 'weekly-plan' && (
  <div className="weekly-plan-container-new">
    <h2 className="plan-main-title">🗺️ خطة الأسبوع الدراسي</h2>
    <p className="plan-description">اطلع على الدروس والواجبات المخصصة لابنك/ابنتك لهذا الأسبوع.</p>

    {/* إضافة عناصر التحكم بالأسبوع */}
    <div className="week-selector-container-new-mobile-fix">
      <div className="week-navigation-new">
        <button onClick={handlePreviousWeek} className="nav-btn-new">
          <i className="fas fa-chevron-right"></i>
          <span>الأسبوع السابق</span>
        </button>
        <div className="current-week-display-new">
          {getWeekRange(selectedWeek)}
        </div>
        <button onClick={handleNextWeek} className="nav-btn-new">
          <span>الأسبوع التالي</span>
          <i className="fas fa-chevron-left"></i>
        </button>
      </div>
    </div>
    
    {/* 👈 تصميم فلاتر الأيام الجديدة */}
    <div className="days-filter-new">
      {getDaysOfWeek(selectedWeek).map((day) => {
        // نحدد إذا كان هناك درس في هذا اليوم لعرض الفلتر
        const hasLesson = weeklyLessons.some(l => 
          new Date(l.lesson_date).toLocaleDateString('en-CA') === day.dateString
        );
            console.log(`🔍 ${day.dayName} - ${day.dateString}:`, hasLesson); // 👈 أضف هذا

        // إذا لم يكن هناك دروس لهذا اليوم، لا نعرض الفلتر (اخياري)
        if (!hasLesson) return null;

        return (
          <button
            key={day.dateString}
            className={`day-filter-btn ${selectedDay === day.dateString ? 'active' : ''}`}
            onClick={() => setSelectedDay(day.dateString)}
          >
            {day.dayName}
            <div className="day-date-new">
              {day.fullDate}
              {!hasLesson && <i className="no-lesson-dot"></i>} {/* يمكن إضافة نقطة لتمييز الأيام التي بها دروس */}
            </div>
          </button>
        );
      })}
    </div>

    <div className="day-view-new">
      {selectedDay ? (
        (() => {
          const lessonForSelectedDay = weeklyLessons.find(l => 
            new Date(l.lesson_date).toLocaleDateString('en-CA') === selectedDay
          );
                    console.log("بيانات الدرس لليوم المختار:", lessonForSelectedDay);


          if (lessonForSelectedDay) {
            return (
              <div className="cards-container-new">
                {/* 1. بطاقة الدرس */}
                <div className="card-new lesson">
                    <div className="card-header-new-plan">
                        <div className="card-icon">📖</div>
                        <h3>الدرس</h3>
                    </div>
                    <div className="card-content-new-plan">
<div dangerouslySetInnerHTML={{ __html: lessonForSelectedDay.content || 'لا يوجد وصف تفصيلي لهذا الدرس.' }} />
                    </div>
                </div>
                
                {/* 2. بطاقة الواجب */}
                <div className="card-new homework">
                    <div className="card-header-new-plan">
                        <div className="card-icon">✏️</div>
                        <h3>الواجب</h3>
                    </div>
                    <div className="card-content-new-plan">
                        <div dangerouslySetInnerHTML={{ __html: lessonForSelectedDay.homework || 'لا يوجد واجب لهذا اليوم.' }} />
                    </div>
                </div>
                
                {/* 3. بطاقة الملاحظات */}
                {lessonForSelectedDay.notes && (
                  <div className="card-new notes">
                      <div className="card-header-new-plan">
                          <div className="card-icon">💡</div>
                          <h3>ملاحظات المعلم</h3>
                      </div>
<div className="card-content-new-plan">
                              <div dangerouslySetInnerHTML={{ __html: lessonForSelectedDay.notes }} />
                          </div>
                  </div>
                )}
                
                {/* 4. بطاقة التقييمات المخطط لها (مثال ثابت لتصميمك) */}
<div className="card-new evaluation">
    <div className="card-header-new-plan">
        <div className="card-icon">⭐</div>
        <h3>عناصر التقييم اليومي</h3>
    </div>
    <div className="card-content-new-plan">
        {/* التحقق من وجود بيانات تقييم وعرضها */}
        {lessonForSelectedDay.evaluations && Object.keys(lessonForSelectedDay.evaluations).length > 0 ? (
            <ul className="evaluation-items-list">
                {Object.keys(lessonForSelectedDay.evaluations).map(key => {
                    const evalItem = lessonForSelectedDay.evaluations[key];
                    // نعرض العنصر فقط إذا كان "نشطاً" (active: true)
                    if (evalItem.active) {
                        return (
                            <li key={key}>
                                <span className="eval-name">
                                    {/* عرض اسم التقييم (مثل: Writing) */}
                                    {key.charAt(0).toUpperCase() + key.slice(1)}: 
                                </span>
                                <div className="eval-details">
                                    {/* عرض التفاصيل المضافة من المعلم */}
                                    {evalItem.details || 'لم يتم إضافة تفاصيل لهذا العنصر.'}
                                </div>
                            </li>
                        );
                    }
                    return null;
                })}
            </ul>
        ) : (
            <p className="evaluation-note">لا توجد تقييمات مُخطط لها لهذا اليوم.</p>
        )}
    </div>
</div>
              </div>
            );
          } else {
            return (
              <div className="no-plan-new">
                <div className="no-plan-icon">📘</div>
                <p>لا توجد خطة دروس مُضافة لليوم المختار ({new Date(selectedDay).toLocaleDateString('ar-EG')}).</p>
              </div>
            );
          }
        })()
      ) : (
        <div className="no-plan-new">
          <div className="no-plan-icon">📅</div>
          <p>يرجى اختيار يوم من الأسبوع أعلاه لعرض الخطة.</p>
        </div>
      )}
    </div>
  </div>
)}
        {activeTab === 'notes' && (
          <div className="notes-tab-new">
            <div className="tab-header-new">
              <h2>ملاحظات المعلم</h2>
              <p>جميع ملاحظات المعلمين على الطالب</p>
            </div>
            <div className="notes-cards-new">
              {assessmentsWithNotes.map(assessment => (
                <div key={assessment.id} className="note-card-new">
                  <div className="note-content-new">
                    <p>{assessment.teacher_notes}</p>
                  </div>
                  <div className="note-meta-new">
                    <span className="note-date-new">
                      {new Date(assessment.lesson_date).toLocaleDateString('ar-EG')}
                    </span>
                    <span className="note-type-new">ملاحظة يومية</span>
                  </div>
                </div>
              ))}
              {assessmentsWithNotes.length === 0 && (
                <div className="no-notes-new">
                  <div className="no-notes-icon">📋</div>
                  <p>لا توجد ملاحظات حالياً</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'messages' && (
          <div className="messages-tab-new">
            <div className="tab-header-new">
              <h2>رسائل للمعلم</h2>
              <p>يمكنك إرسال رسائل واستفسارات للمعلم بخصوص الطالب</p>
            </div>
            
            <ParentMessageForm 
              onSendMessage={handleSendMessage} 
              parentId={parentId} 
              studentId={selectedStudent}
              teacherId={studentTeacherId}
            />
            
            <div className="sent-messages-container">
              <h3 className="sent-messages-title">
                <i className="messages-icon">📨</i>
                الرسائل المرسلة
              </h3>
              
              <div className="messages-list">
                {sentMessages.length > 0 ? (
                  sentMessages.map((msg, index) => (
                    <div key={index} className="message-item">
                      <div className="message-header">
                        <span className="message-topic">
                          {msg.topic === 'general' && 'استفسار عام'}
                          {msg.topic === 'academic' && 'استفسار أكاديمي'}
                          {msg.topic === 'attendance' && 'استفسار عن الحضور'}
                          {msg.topic === 'homework' && 'استفسار عن الواجبات'}
                          {msg.topic === 'feedback' && 'تقديم ملاحظات'}
                          {msg.topic === 'other' && 'أخرى'}
                        </span>
                        <span className="message-date">
                          {new Date(msg.payload?.timestamp || msg.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <div className="message-content">
                        <p>{msg.message_text}</p>
                      </div>
                                    {/* ✅ إضافة هذا الجزء الجديد لعرض رد المعلم */}
              {msg.teacher_reply && (
                <div className="teacher-reply-content">
                  <div className="reply-header">
                    <span>رد المعلم</span>
                    <span className="reply-date">
                       {new Date(msg.reply_timestamp).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <p>{msg.teacher_reply}</p>
                </div>
              )}
                      <div className="message-footer">
                        <span className={`message-status ${msg.is_anonymous ? 'anonymous' : ''}`}>
                          {msg.is_anonymous ? 'تم الإرسال بدون اسم' : 'تم الإرسال باسمك'}
                        </span>
                        <span className="message-read-status">
                          {msg.teacher_read ? 'تمت القراءة ✓' : 'لم تتم القراءة بعد'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-messages">
                    <div className="no-messages-icon">📭</div>
                    <p>لم تقم بإرسال أي رسائل بعد</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {isAddStudentModalOpen && (
  <AddStudentToParentModal
    isOpen={isAddStudentModalOpen}
    onClose={() => setIsAddStudentModalOpen(false)}
    parentId={parentId}
    onStudentAdded={() => {
      loadParentData(); // إعادة تحميل بيانات ولي الأمر
      setIsAddStudentModalOpen(false);
    }}
  />
)}
    </div>
  );
};

export default ParentDashboard;