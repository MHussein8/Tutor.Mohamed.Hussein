// teacherService.js
import { supabase } from './supabase';

/**
 * دالة مساعدة للحصول على teacherId الحالي من localStorage.
 * في المستقبل، يجب ربط هذه الدالة بنظام مصادقة (Authentication) كامل.
 */
export const getCurrentTeacherId = () => {
  const teacherId = localStorage.getItem('current_teacher_id');
  
  // نرجع null بدلاً من القيمة الافتراضية (1)
  // لضمان أن الكود يعمل فقط إذا كان المعلم مسجلاً دخوله فعلاً
  return teacherId ? parseInt(teacherId) : null;
};

/**
 * تسترجع إحصائيات المدرس الحالي (عدد الطلاب، متوسط الأداء).
 * تم تعديلها لتسترجع بيانات حقيقية من قاعدة البيانات.
 */
export const getTeacherStats = async () => {
  const teacherId = getCurrentTeacherId();

  // جلب عدد الطلاب التابعين للمدرس
  const { count: totalStudents, error: studentsError } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId);
  
  if (studentsError) throw studentsError;

  // جلب جميع التقييمات للطلاب التابعين للمدرس الحالي
  const { data: assessments, error: assessmentsError } = await supabase
    .from('daily_assessments')
    .select('homework_score, grammar_score, vocabulary_score, writing_score, memorization_score, interaction_score, quiz_score')
    .in('student_id', await getStudentIdsByTeacher(teacherId));

  if (assessmentsError) throw assessmentsError;
  
  const totalScores = assessments.reduce((sum, current) => {
    // حساب المجموع الكلي لكل تقييم
    const scores = Object.values(current).filter(score => score !== null);
    return sum + scores.reduce((s, c) => s + c, 0);
  }, 0);
  
  const totalItems = assessments.reduce((count, current) => {
    // حساب عدد العناصر المقيمة
    return count + Object.values(current).filter(score => score !== null).length;
  }, 0);

  const averagePerformance = totalItems > 0 ? (totalScores / totalItems) * 100 / 90 : 0; // يتم قسمة المجموع الكلي على 90 لحساب النسبة المئوية

  return { 
    totalStudents: totalStudents || 0, 
    averagePerformance: Math.round(averagePerformance) 
  };
};

/**
 * تسترجع قائمة الطلاب التابعين للمدرس الحالي فقط.
 */
export const getStudents = async () => {
  const teacherId = getCurrentTeacherId();
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('first_name');
  
  if (error) throw error;
  return data;
};

/**
 * تسترجع قائمة بالتقييمات اليومية للطلاب التابعين للمدرس الحالي.
 */
export const getDailyAssessments = async () => {
  const teacherId = getCurrentTeacherId();
  // يجب أولاً الحصول على كل الطلاب التابعين للمدرس، ثم البحث عن تقييماتهم
  const studentIds = await getStudentIdsByTeacher(teacherId);

  const { data, error } = await supabase
    .from('daily_assessments')
    .select('*')
    .in('student_id', studentIds)
    .order('lesson_date', { ascending: false });
  
  if (error) throw error;
  return data;
};

/**
 * دالة مساعدة لجلب معرفات الطلاب التابعين لمدرس معين.
 */
const getStudentIdsByTeacher = async (teacherId) => {
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('teacher_id', teacherId);

  if (error) throw error;
  return data.map(student => student.id);
};

export const getWeeklyReport = async (studentId, weekStartDate) => {
  const teacherId = getCurrentTeacherId();

  const startOfWeek = new Date(weekStartDate);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // ⚠️ إضافة شرط teacher_id لضمان أن المدرس لا يرى إلا تقارير طلابه
  const { data: dailyAssessments, error } = await supabase
    .from('daily_assessments')
    .select('*')
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)
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

export const logoutTeacher = () => {
  localStorage.removeItem('current_teacher_id');
};