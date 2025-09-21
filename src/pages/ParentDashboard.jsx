/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { MAX_SCORES, calculateMaxTotalScore } from '../config/assessmentConfig';
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
  const dayOfWeek = today.getDay(); // 0 = الأحد, 6 = السبت
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - (dayOfWeek + 1) % 7); // الرجوع للسبت
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toISOString().split('T')[0];
};

// دالة عبقرية لتحديد لون شريط التقدم بناءً على الدرجة
const getScoreColor = (score, maxScore) => {
  if (maxScore === 0) return 'hsl(0, 0%, 50%)';
  const hue = (score / maxScore) * 120;
  return `hsl(${hue}, 70%, 50%)`;
};

// تم تعديل هذا السطر لقبول الـ prop
const ParentDashboard = ({ parentUser, onLogout, parentId }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [dailyAssessments, setDailyAssessments] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
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

    const currentPerformance = Object.keys(MAX_SCORES).reduce((sum, key) => sum + (current[key] || 0), 0);
    const previousPerformance = Object.keys(MAX_SCORES).reduce((sum, key) => sum + (previous[key] || 0), 0);

    const progress = ((currentPerformance - previousPerformance) / calculateMaxTotalScore()) * 100;
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
      return sum + (
        (assessment.grammar_score || 0) +
        (assessment.vocabulary_score || 0) +
        (assessment.writing_score || 0) +
        (assessment.homework_score || 0) +
        (assessment.memorization_score || 0) +
        (assessment.interaction_score || 0) +
        (assessment.attendance_score || 0) +
        (assessment.quiz_score || 0)
      );
    }, 0);

    const averagePerformance = dailyData.length > 0
      ? Math.round((totalScore / (dailyData.length * calculateMaxTotalScore())) * 100)
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




  const loadParentData = useCallback(async () => {
    try {
      setLoading(true);
      const studentData = await parentService.getStudentsByParent(parentId);
      setStudents(studentData);

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
  
  
  useEffect(() => {
    if (selectedStudent) {
      loadWeeklyReport(selectedStudent, selectedWeek);
      loadParentMessages(selectedStudent);
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
      const reportData = await parentService.getWeeklyReportFromDaily(studentId, weekDate);
      setWeeklyReport(reportData);
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
  };

  const handleNextWeek = () => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setSelectedWeek(newWeek.toISOString().split('T')[0]);
  };

  const handleDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() - 1);
    setSelectedWeek(startOfWeek.toISOString().split('T')[0]);
  };

  const getWeekRange = (weekDate) => {
    const start = new Date(weekDate);
    const end = new Date(weekDate);
    end.setDate(end.getDate() + 6);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('ar-EG', options)} - ${end.toLocaleDateString('ar-EG', options)}`;
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
          <button onClick={onLogout} className="logout-btn-new">
            تسجيل الخروج
          </button>
        </div>

        <div className="header-main-content-new">
          <h1>لوحة متابعة الطالب</h1>
          <p>مرحباً بك في نظام متابعة الأداء الدراسي</p>
        </div>
        
        {/* الحاوية الجديدة لرسالة الترحيب ومستطيل اختيار الطالب */}
        <div className="header-bottom-bar-new">
          <span className="welcome-message-new">مرحباً، {parentUser?.name}</span>
          <button 
  className="add-student-btn-new"
  onClick={() => setIsAddStudentModalOpen(true)}
>
  <i className="fas fa-plus"></i>
  إضافة طالب
</button>
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

      </div>
      <div className="dashboard-tabs-new">
        <button
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
                      {Math.round((
                        (assessment.grammar_score || 0) +
                        (assessment.vocabulary_score || 0) +
                        (assessment.writing_score || 0) +
                        (assessment.homework_score || 0) +
                        (assessment.memorization_score || 0) +
                        (assessment.interaction_score || 0) +
                        (assessment.attendance_score || 0) +
                        (assessment.quiz_score || 0)
                       ))} / {calculateMaxTotalScore()}
                    </span>
                  </div>
                  <div className="scores-grid-new">
                    <div className="score-item-new">
                      <span>القواعد</span>
                      <div className="score-bar-new">
                        <div
                          className="score-progress-new"
                          style={{width: `${(assessment.grammar_score || 0)/5*100}%`, background: getScoreColor(assessment.grammar_score || 0, 5)}}
                        ></div>
                        <span className="score-new">{assessment.grammar_score}/5</span>
                      </div>
                    </div>
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

            <div className="week-selector-container-new">
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
                    <div className="score-new-large">{weeklyReport.total_score}/{calculateMaxTotalScore()}</div>
                    <div className="percentage-new">{weeklyReport.percentage}%</div>
                  </div>
                </div>
                <div className="detailed-scores-new">
                  <h3>التفاصيل</h3>
<div className="scores-grid-detailed-new">
  {Object.keys(MAX_SCORES).map((key) => (
    <div key={key} className="score-item-detailed-new">
      <span className="score-label-new">
        {key === 'homework' ? 'الواجب المنزلي' :
         key === 'grammar' ? 'القواعد' :
         key === 'vocabulary' ? 'المفردات' :
         key === 'memorization' ? 'التسميع' :
         key === 'attendance' ? 'الحضور' :
         key === 'writing' ? 'الكتابة' :
         key === 'interaction' ? 'التفاعل' : key}
      </span>
      <div className="score-container-detailed-new">
        <span className="score-value-new">{weeklyReport[`${key}_score`]}/{MAX_SCORES[key]}</span>
        <div className="score-bar-detailed-new">
          <div
            className="score-progress-detailed-new"
            style={{ width: `${(weeklyReport[`${key}_score`] / MAX_SCORES[key]) * 100}%`,
                    background: getScoreColor(weeklyReport[`${key}_score`], MAX_SCORES[key]) }}
          ></div>
        </div>
      </div>
    </div>
  ))}
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
              teacherId={1} // يمكن تعديل هذا لاحقًا ليكون معلم الطالب الفعلي
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