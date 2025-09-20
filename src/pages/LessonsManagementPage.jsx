// LessonsManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import Sidebar from '../components/Sidebar';
import AddLessonModal from '../components/AddLessonModal';
import '../styles/LessonsManagement.css';
import '../styles/TeacherDashboard.css';

const LessonsManagementPage = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          content,
          lesson_date,
          start_time,
          end_time,
          education_type_id,
          grade_level_id,
          group_types (name),
          grade_levels (name)
        `)
        .order('lesson_date', { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      
      alert('تم حذف الحصة بنجاح');
      fetchLessons();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('حدث خطأ أثناء حذف الحصة');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredLessons = lessons.filter(lesson => 
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lesson.content && lesson.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalLessons = lessons.length;
  const weeklyLessons = lessons.filter(lesson => {
    const lessonDate = new Date(lesson.lesson_date);
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek + 1;
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);
    return lessonDate >= startOfWeek;
  }).length;
  const todayLessons = lessons.filter(lesson => {
    const lessonDate = new Date(lesson.lesson_date);
    const today = new Date();
    return lessonDate.toDateString() === today.toDateString();
  }).length;

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar activeTab="classes" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <div className="main-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جاري تحميل الحصص...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab="classes" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="main-content">
        <div className="lessons-page-container">
          <div className="page-header">
            <div className="header-main">
              <div className="header-content">
                <h1>إدارة الحصص</h1>
                <p>تنظيم ومتابعة جميع الحصص الدراسية</p>
              </div>
              <div className="header-actions">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="بحث عن حصة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span>🔍</span>
                </div>
                <button className="btn btn-add-lesson" onClick={() => setIsAddModalOpen(true)}>
                  + إضافة حصة
                </button>
              </div>
            </div>
          </div>
          
          <div className="dashboard-cards lessons-stats-grid">
            <div className="dashboard-card stat-total">
              <div className="card-content">
                <h3>إجمالي الحصص</h3>
                <span className="count">{totalLessons}</span>
              </div>
            </div>
            
            <div className="dashboard-card stat-weekly">
              <div className="card-content">
                <h3>الحصص هذا الأسبوع</h3>
                <span className="count">{weeklyLessons}</span>
              </div>
            </div>
            
            <div className="dashboard-card stat-today">
              <div className="card-content">
                <h3>الحصص اليوم</h3>
                <span className="count">{todayLessons}</span>
              </div>
            </div>
          </div>

          <div className="lessons-list-section">
            <div className="section-header">
              <h2>قائمة الحصص</h2>
              <span className="lesson-count-badge">{filteredLessons.length} حصة</span>
            </div>
            
            {filteredLessons.length === 0 ? (
              <div className="empty-state-lessons">
                <h3>لا توجد حصص مسجلة</h3>
                <p>ابدأ بإضافة أول حصة لك الآن.</p>
              </div>
            ) : (
              <div className="lessons-table-container">
                <table className="lessons-table">
                  <thead>
                    <tr>
                      <th>عنوان الحصة</th>
                      <th>المحتوى</th>
                      <th>نوع التعليم</th>
                      <th>المستوى</th>
                      <th>التاريخ</th>
                      <th>الوقت</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLessons.map(lesson => (
                      <tr key={lesson.id}>
                        <td data-label="عنوان الحصة">{lesson.title}</td>
                        <td data-label="المحتوى">{lesson.content || 'لا يوجد'}</td>
                        <td data-label="نوع التعليم">{lesson.group_types?.name || 'غير معروف'}</td>
                        <td data-label="المستوى">{lesson.grade_levels?.name || 'غير معروف'}</td>
                        <td data-label="التاريخ">{formatDate(lesson.lesson_date)}</td>
                        <td data-label="الوقت">{`${lesson.start_time.slice(0, 5)} - ${lesson.end_time.slice(0, 5)}`}</td>
                        <td data-label="الإجراءات">
                          <div className="lesson-actions">
                            <button className="action-btn-small" title="تعديل" onClick={() => {
                              setEditingLesson(lesson);
                              setIsAddModalOpen(true);
                            }}>
                              ✏️
                            </button>
                            <button className="action-btn-small btn-delete" title="حذف" onClick={() => handleDeleteLesson(lesson.id)}>
                              🗑️
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
        <AddLessonModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingLesson(null);
          }}
          onLessonAdded={() => {
            fetchLessons();
            setEditingLesson(null);
          }}
          lesson={editingLesson}
        />
      </div>
    </div>
  );
};

export default LessonsManagementPage;