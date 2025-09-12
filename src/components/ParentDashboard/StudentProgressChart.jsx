import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import '../../styles/ParentDashboard.css';

const StudentProgressChart = ({ dailyAssessments }) => {
  if (!dailyAssessments || dailyAssessments.length === 0) {
    return (
      <div className="no-data-message">
        <p>لا توجد بيانات تقييمات يومية لعرضها</p>
      </div>
    );
  }

  // تحويل البيانات لتتناسب مع المخطط
  const chartData = dailyAssessments.slice(0, 7).map(assessment => {
    const totalScore = (
      (assessment.grammar_score || 0) +
      (assessment.vocabulary_score || 0) +
      (assessment.writing_score || 0) +
      (assessment.homework_score || 0) +
      (assessment.memorization_score || 0) +
      (assessment.interaction_score || 0) +
      (assessment.attendance_score || 0)
    );
    
    const percentage = Math.round((totalScore / 100) * 100);

    return {
      name: new Date(assessment.lesson_date).toLocaleDateString('ar-EG', {
        weekday: 'short',
        day: 'numeric'
      }),
      أداء: percentage
    };
  }).reverse();

  return (
    <div className="progress-chart">
      <h3>أداء الطالب في آخر 7 حصص</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip 
            formatter={(value) => [`${value}%`, 'الأداء']}
            labelFormatter={(label) => `التاريخ: ${label}`}
          />
          <Bar 
            dataKey="أداء" 
            fill="#4f46e5" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StudentProgressChart;