import React from 'react';
import '../../styles/ParentDashboard.css';

const ParentStatsGrid = ({ stats, colors }) => { // إضافة colors هنا
  return (
    <div className="parent-stats-grid">
      <div className="stat-card" style={{ backgroundColor: colors[0] }}> {/* استخدام أول لون */}
        <div className="stat-icon performance">
          <i className="fas fa-chart-line"></i>
        </div>
        <div className="stat-content">
          <h3 style={{ color: '#FFFFFF' }}>متوسط الأداء</h3>

          <p className="stat-value">{stats.performanceAverage}%</p>
        </div>
      </div>
      
      <div className="stat-card" style={{ backgroundColor: colors[1] }}> {/* استخدام ثاني لون */}
        <div className="stat-icon attendance">
          <i className="fas fa-calendar-check"></i>
        </div>
        <div className="stat-content">
          <h3 style={{ color: '#40048fff' }}>نسبة الحضور</h3>
          <p className="stat-value">{stats.attendanceRate}%</p>
        </div>
      </div>
      
      <div className="stat-card" style={{ backgroundColor: colors[2] }}> {/* استخدام ثالث لون */}
        <div className="stat-icon lessons">
          <i className="fas fa-book"></i>
        </div>
        <div className="stat-content">
          <h3 style={{ color: '#8f3004ff' }}>الدروس المكتملة</h3>
          <p className="stat-value">{stats.completedLessons}</p>
        </div>
      </div>
      
      <div className="stat-card" style={{ backgroundColor: colors[3] }}> {/* استخدام رابع لون */}
        <div className="stat-icon notes">
          <i className="fas fa-sticky-note"></i>
        </div>
        <div className="stat-content">
          <h3 style={{ color: '#000000ff' }}>ملاحظات المعلم</h3>
          <p className="stat-value">{stats.teacherNotes}</p>
        </div>
      </div>
    </div>
  );
};

export default ParentStatsGrid;