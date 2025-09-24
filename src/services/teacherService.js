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
  endOfWeek.setDate(startOfWeek.getDate() + 6);

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

  const evaluatedTotals = {};
  dailyAssessments.forEach(assessment => {
    Object.keys(assessment).forEach(key => {
      if (key.endsWith('_score') && assessment[key] !== null && assessment[key] !== undefined) {
        if (!evaluatedTotals[key]) {
          evaluatedTotals[key] = { sum: 0, count: 0 };
        }
        evaluatedTotals[key].sum += assessment[key];
        evaluatedTotals[key].count += 1;
      }
    });
  });

  const report = {};
  Object.keys(evaluatedTotals).forEach(key => {
    report[key] = evaluatedTotals[key].sum;
  });

  return report;
};

export const getCurrentTeacherId = async () => {
  // إرجع لطريقة localStorage الآمنة
  const teacherId = localStorage.getItem('current_teacher_id');
  
  if (teacherId) {
    return parseInt(teacherId);
  }
  
  // إذا مفيش teacher_id في localStorage، إرجع 1 (أنت)
  return 1;
};

export const logoutTeacher = () => {
  localStorage.removeItem('current_teacher_id');
};