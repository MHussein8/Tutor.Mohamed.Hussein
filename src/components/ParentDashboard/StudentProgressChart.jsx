import React from 'react';
import { calculateMaxTotalScore } from '../../config/assessmentConfig';
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
// تحديد مفاتيح الدرجات التي تم تقييمها فقط
const evaluatedKeys = Object.keys(assessment).filter(key => key.endsWith('_score') && assessment[key] !== null);

// حساب المجموع الإجمالي للدرجات المحققة
const totalScore = evaluatedKeys.reduce((sum, key) => {
  return sum + (assessment[key] || 0);
}, 0);

// حساب الدرجة العظمى ديناميكياً بناءً على العناصر المقيمة
const maxTotalScore = calculateMaxTotalScore(evaluatedKeys);

// حساب النسبة المئوية بناءً على الدرجة العظمى الديناميكية
const percentage = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;

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