import React from 'react';
import './StudentTable.css';

const StudentTable = ({ students }) => {
  if (!students || students.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">👨‍🎓</div>
        <h3>لا يوجد طلاب مسجلين</h3>
        <p>ابدأ بإضافة طلابك الأول</p>
      </div>
    );
  }

  return (
    <div className="student-table-container">
      <table className="student-table">
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
                <div className="student-info">
                  <div className="avatar">
                    {student.first_name?.[0]}{student.last_name?.[0]}
                  </div>
                  <div className="name">
                    {student.first_name} {student.last_name}
                  </div>
                </div>
              </td>
              <td>
                <span className="grade-badge">الصف {student.grade_level_id || 1}</span>
              </td>
              <td>
                <span className="status active">نشط</span>
              </td>
              <td>
                <div className="last-assessment">
                  <span className="score">-</span>
                  <span className="date">لم يتم التقييم بعد</span>
                </div>
              </td>
              <td>
                <div className="actions">
                  <button className="btn-icon view" title="عرض الملف">
                    👁️
                  </button>
                  <button className="btn-icon assess" title="تقييم">
                    📝
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;