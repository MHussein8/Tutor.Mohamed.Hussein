import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import Sidebar from '../components/Sidebar';
import AddStudentModal from '../components/AddStudentModal';
import AddParentModal from '../components/AddParentModal';
import { useNavigate } from 'react-router-dom';
import '../styles/TeacherDashboard.css';
import '../styles/StudentsPage.css';

const StudentsPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState(false);


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
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          weekly_assessments (total_score),
          grade_levels (name),
          group_types (name, id)
        `)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    const confirmDelete = window.confirm("هل أنت متأكد من حذف هذا الطالب؟ سيتم حذف جميع تقييماته أيضًا.");
    if (!confirmDelete) return;

    try {
      // الخطوة 1: حذف جميع التقييمات المرتبطة بالطالب أولاً
      const { error: assessmentsError } = await supabase
        .from('daily_assessments')
        .delete()
        .eq('student_id', studentId);

      if (assessmentsError) throw assessmentsError;

      // الخطوة 2: الآن قم بحذف الطالب
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (studentError) throw studentError;

      // تحديث قائمة الطلاب بعد الحذف
      setStudents(prevStudents => prevStudents.filter(student => student.id !== studentId));
      alert('تم حذف الطالب وجميع تقييماته بنجاح.');
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('حدث خطأ أثناء حذف الطالب. تأكد من وجود اتصال.');
    }
  };

  const handleStudentAdded = (newStudent) => {
    setStudents(prevStudents => [newStudent, ...prevStudents]);
  };

  const calculateStudentPerformance = (weeklyAssessments) => {
    if (!weeklyAssessments || weeklyAssessments.length === 0) {
      return 'لا يوجد';
    }
    const totalScore = weeklyAssessments.reduce((sum, assessment) => sum + assessment.total_score, 0);
    const average = totalScore / weeklyAssessments.length;
    return average.toFixed(1);
  };

  const filteredStudents = students.filter(student =>
    (student.first_name + ' ' + student.last_name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      <Sidebar 
        activeTab="students" 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      
      <div className={`main-content ${!isSidebarOpen && window.innerWidth <= 992 ? 'full-width' : ''}`}>
        <div className="students-page-container">
          <div className="dashboard-header-with-btn">
            <h1>قائمة الطلاب</h1>
            <div className="actions-group">
              <button 
  className="btn btn-primary" 
  onClick={() => setIsAddParentModalOpen(true)}
>
  <i className="fas fa-user-plus"></i> إضافة ولي أمر
</button>
              <button 
                className="btn-add-student" 
                onClick={() => setIsModalOpen(true)}
              >
                + إضافة طالب جديد
              </button>

            </div>
          </div>
          
          <div className="search-container">
            <input
              type="text"
              placeholder="ابحث عن طالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="students-list-section">
            {loading ? (
              <p className="loading-message">جاري تحميل بيانات الطلاب...</p>
            ) : filteredStudents.length === 0 ? (
              <div className="empty-state-list">
                <span className="empty-icon">😔</span>
                <p>لا يوجد طلاب حاليًا.</p>
                <p>اضغط على "إضافة طالب جديد" للبدء.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>اسم الطالب</th>
                      <th>المستوى الدراسي</th>
                      <th>نوع التعليم</th>
                      <th>المتوسط</th>
                      <th>إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td>{student.first_name} {student.last_name}</td>
                        <td>
                          <span className="grade-pill">
                            {student.grade_levels?.name || 'غير محدد'}
                          </span>
                        </td>
                        <td>
                          <span className={`education-type-badge type-${student.group_types?.id}`}>
                            {student.group_types?.name || 'غير محدد'}
                          </span>
                        </td>
                        <td>
                          <span className="performance-score">
                            {calculateStudentPerformance(student.weekly_assessments)}
                          </span>
                        </td>
                        <td>
                          <div className="student-actions">
                            <button 
                              className="action-btn-small" 
                              title="عرض ملف الطالب"
                              onClick={() => navigate(`/student-profile/${student.id}`)}
                            >
                              👁️
                            </button>
                            <button 
                              className="action-btn-small assess-now" 
                              title="سجل التقييمات"
                              onClick={() => navigate(`/student-assessments/${student.id}`)} 
                            >
                              📝
                            </button>
                            <button 
                              className="action-btn-small btn-delete" 
                              title="حذف"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
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
      </div>
      <AddStudentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onStudentAdded={handleStudentAdded}
      />
      <AddParentModal 
  isOpen={isAddParentModalOpen} 
  onClose={() => setIsAddParentModalOpen(false)}
/>
    </div>
  );
};

export default StudentsPage;
