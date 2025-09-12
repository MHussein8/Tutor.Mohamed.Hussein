// TeacherDashboard.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import '../styles/TeacherDashboard.css';
import AddStudentModal from '../components/AddStudentModal';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

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

  // الدوال المساعدة هنا
  const calculateTotalScore = (assessment) => {
    if (!assessment) return 0;
    return (assessment.homework_score || 0) +
           (assessment.grammar_score || 0) +
           (assessment.vocabulary_score || 0) +
           (assessment.memorization_score || 0) +
           (assessment.attendance_score || 0) +
           (assessment.writing_score || 0) +
           (assessment.interaction_score || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

const fetchDashboardData = async () => {
  try {
    // استعلام الطلاب مع Join
const { data: studentsData, count: studentsCount } = await supabase
  .from('students')
  .select(`
    *,
    grade_levels (*),
    group_types (*)
  `, { count: 'exact' })
  .order('first_name');

    // حساب بداية الأسبوع (السبت) ونهايته (الجمعة)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (الأحد) إلى 6 (السبت)
    
    // حساب الأيام للرجوع إلى السبت الماضي
    let daysToSubtract;
    if (dayOfWeek === 6) { // إذا اليوم هو السبت
      daysToSubtract = 0;
    } else if (dayOfWeek === 0) { // إذا اليوم هو الأحد
      daysToSubtract = 1;
    } else {
      daysToSubtract = dayOfWeek + 1; // بالنسبة لباقي الأيام
    }
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    // حساب نهاية الأسبوع (الجمعة)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // جلب التقييمات اليومية للأسبوع الحالي
    const { data: dailyAssessments } = await supabase
      .from('daily_assessments')
      .select('*')
      .gte('lesson_date', weekStart.toISOString())
      .lte('lesson_date', weekEnd.toISOString());

    // حساب متوسط الأداء الحقيقي
    let weeklyAverage = 0;
    if (dailyAssessments && dailyAssessments.length > 0) {
      let totalActualScore = 0;
      let totalMaxPossibleScore = 0;

      dailyAssessments.forEach(assessment => {
        // جمع الدرجات الفعلية
        totalActualScore += (assessment.homework_score || 0) +
                          (assessment.grammar_score || 0) +
                          (assessment.vocabulary_score || 0) +
                          (assessment.memorization_score || 0) +
                          (assessment.attendance_score || 0) +
                          (assessment.writing_score || 0) +
                          (assessment.interaction_score || 0);

        // جمع الحد الأقصى (100 نقطة لكل تقييم يومي)
        totalMaxPossibleScore += 100;
      });

      // حساب النسبة المئوية الحقيقية
      weeklyAverage = totalMaxPossibleScore > 0 
        ? Math.round((totalActualScore / totalMaxPossibleScore) * 100)
        : 0;
    }

    // جلب آخر تقييم لكل طالب
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
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString());

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
        {/* قم بتحديث هذا السطر لتمرير الخصائص */}
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
      {/* قم بتحديث هذا السطر لتمرير الخصائص */}
      <Sidebar activeTab="dashboard" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="main-content">
        {/* Header */}
        <div className="dashboard-header">
          <h1>لوحة تحكم المعلم</h1>
          <p>مرحباً بك في نظام إدارة الفصل الدراسي</p>
        </div>

        {/* Statistics Grid */}
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

        {/* Students Table */}
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
</td>                      <td>
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