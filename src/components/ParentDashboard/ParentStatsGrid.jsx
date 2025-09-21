import React from 'react';
import '../../styles/ParentDashboard.css';

const ParentStatsGrid = ({ stats, colors, mostImprovedSkill, actualMaxScore }) => {

  const getSkillName = (skillKey) => {
  const skillNames = {
    grammar_score: 'القواعد',
    vocabulary_score: 'المفردات',
    writing_score: 'الكتابة',
    homework_score: 'الواجب',
    memorization_score: 'التسميع',
    interaction_score: 'التفاعل',
    attendance_score: 'الحضور',
    quiz_score: 'الاختبارات'
  };
  return skillNames[skillKey] || skillKey;
};

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
      
<div className="stat-card" style={{ backgroundColor: colors[1] }}>
  <div className="stat-icon progress">  {/* غيرت من attendance إلى progress */}
    <i className="fas fa-trending-up"></i>  {/* غيرت الأيقونة */}
  </div>
  <div className="stat-content">
    <h3 style={{ color: '#40048fff' }}>نسبة التقدم</h3>  {/* غيرت النص */}
    <p className="stat-value">{stats.progressPercentage}%</p>  {/* غيرت القيمة */}
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
      
<div className="stat-card" style={{ backgroundColor: colors[3] }}>
  <div className="stat-icon improvement">
    <i className="fas fa-trending-up"></i>
  </div>
  <div className="stat-content">
    <h3 style={{ color: '#000000ff' }}>أكثر مهارة اتحسنت</h3>
    <p className="stat-value">
      {mostImprovedSkill 
        ? `${getSkillName(mostImprovedSkill.skill)} +${mostImprovedSkill.improvement}`
        : 'لا يوجد تحسن'
      }
    </p>
  </div>
</div>
    </div>
  );
};

export default ParentStatsGrid;