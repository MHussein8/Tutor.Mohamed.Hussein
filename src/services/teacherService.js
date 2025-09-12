import { supabase } from './supabase';

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

  const totals = dailyAssessments.reduce((acc, assessment) => ({
    homework: acc.homework + (assessment.homework_score || 0),
    grammar: acc.grammar + (assessment.grammar_score || 0),
    vocabulary: acc.vocabulary + (assessment.vocabulary_score || 0),
    memorization: acc.memorization + (assessment.memorization_score || 0),
    attendance: acc.attendance + (assessment.attendance_score || 0),
    writing: acc.writing + (assessment.writing_score || 0),
    interaction: acc.interaction + (assessment.interaction_score || 0),
  }), {
    homework: 0, grammar: 0, vocabulary: 0, 
    memorization: 0, attendance: 0, writing: 0, interaction: 0
  });

  const daysCount = dailyAssessments.length;
  
  const report = {
    homework_score: Math.round(totals.homework / daysCount),
    grammar_score: Math.round(totals.grammar / daysCount),
    vocabulary_score: Math.round(totals.vocabulary / daysCount),
    memorization_score: Math.round(totals.memorization / daysCount),
    attendance_score: Math.round(totals.attendance / daysCount),
    writing_score: Math.round(totals.writing / daysCount),
    interaction_score: Math.round(totals.interaction / daysCount),
  };

  report.total_score = 
    report.homework_score + report.grammar_score + report.vocabulary_score +
    report.memorization_score + report.attendance_score + 
    report.writing_score + report.interaction_score;

  report.percentage = Math.round((report.total_score / 100) * 100);

  return report;
};