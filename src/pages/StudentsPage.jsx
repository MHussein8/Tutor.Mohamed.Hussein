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
  const [filterGroupType, setFilterGroupType] = useState('');
  const [filterGradeLevel, setFilterGradeLevel] = useState('');
  const [groupTypes, setGroupTypes] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState(false);

  // ✅ نقل الدالة داخل المكون الرئيسي
  const calculateStudentPerformance = (weeklyAssessments) => {
    if (!weeklyAssessments || weeklyAssessments.length === 0) {
      return 'لا يوجد';
    }
    
    // حساب المتوسط بناء على العناصر الفعلية فقط
    const validAssessments = weeklyAssessments.filter(assessment => 
      assessment.total_score !== null && assessment.total_score !== undefined
    );
    
    if (validAssessments.length === 0) return 'لا يوجد';
    
    const totalScore = validAssessments.reduce((sum, assessment) => sum + assessment.total_score, 0);
    const average = totalScore / validAssessments.length;
    return average.toFixed(1);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      fetchFilterOptions();
    }
  }, [students]);

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
    const { data: studentsData, error } = await supabase
      .from('students')
      .select('*')
      .order('first_name');

    if (error) throw error;

    // جلب البيانات المرتبطة بشكل منفصل
    const studentIds = studentsData.map(s => s.id);
    
    const { data: assessmentsData } = await supabase
      .from('daily_assessments')
      .select('student_id, total_score, lesson_date')
      .in('student_id', studentIds);

    const { data: groupTypesData } = await supabase
      .from('group_types')
      .select('*');

    const { data: gradeLevelsData } = await supabase
      .from('grade_levels')
      .select('*');

    // دمج البيانات يدوياً
    const studentsWithDetails = studentsData.map(student => ({
      ...student,
      daily_assessments: assessmentsData?.filter(a => a.student_id === student.id) || [],
      group_types: groupTypesData?.find(g => g.id === student.education_type_id) || null,
      grade_levels: gradeLevelsData?.find(gl => gl.id === student.grade_level_id) || null
    }));

    setStudents(studentsWithDetails);
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