import { supabase } from './supabase';
import { MAX_SCORES, calculateMaxTotalScore } from '../config/assessmentConfig';

export const getTeacherStats = async () => {
  return { totalStudents: 25, averagePerformance: 85 };
};

export const getStudents = async () => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('first_name');
  
  if (error) throw error;
  return data;
};

export const getDailyAssessments = async () => {
  const { data, error } = await supabase
    .from('daily_assessments')
    .select('*')
    .order('lesson_date', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const getWeeklyReport = async (studentId, weekStartDate) => {
  // تحديد بداية ونهاية الأسبوع (السبت إلى الجمعة)
  const startOfWeek = new Date(weekStartDate);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // السبت + 6 أيام = الجمعة

  const { data: dailyAssessments, error } = await supabase
    .from('daily_assessments')
    .select('*')
    .eq('student_id', studentId)
    .gte('lesson_date', startOfWeek.toISOString().split('T')[0])
    .lte('lesson_date', endOfWeek.toISOString().split('T')[0])
    .order('lesson_date', { ascending: true });

  if (error) throw error;

  if (!dailyAssessments || dailyAssessments.length === 0) {
    return null;
  }

  // حساب الإجماليات لكل فئة باستخدام MAX_SCORES
  const totals = dailyAssessments.reduce((acc, assessment) => {
    return Object.keys(MAX_SCORES).reduce((newAcc, key) => {
      newAcc[key] = (newAcc[key] || 0) + (assessment[`${key}_score`] || 0);
      return newAcc;
    }, acc);
  }, {});

  const daysCount = dailyAssessments.length;
  
  // إنشاء التقرير بحساب متوسط كل فئة
  const report = Object.keys(MAX_SCORES).reduce((rep, key) => {
    rep[`${key}_score`] = Math.round(totals[key] / daysCount);
    return rep;
  }, {});

// تحديد عناصر التقييم التي لها درجة متوسطة محسوبة (ليست null)
const evaluatedKeys = Object.keys(report).filter(key => key.endsWith('_score') && report[key] !== null);

// حساب الدرجة العظمى الديناميكية بناءً على العناصر المقيمة
const maxTotalScore = calculateMaxTotalScore(evaluatedKeys);

// حساب الإجمالي الكلي والنسبة المئوية بناءً على الدرجة العظمى الديناميكية
report.total_score = Object.values(report).reduce((sum, score) => sum + (score || 0), 0);
report.percentage = maxTotalScore > 0 ? Math.round((report.total_score / maxTotalScore) * 100) : 0;

  return report;
};