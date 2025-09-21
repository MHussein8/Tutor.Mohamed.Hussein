import { supabase } from './supabase';
import { MAX_SCORES, calculateMaxTotalScore, SKILL_PRIORITY } from '../config/assessmentConfig';

export const parentService = {
  // الحصول على بيانات الطلاب التابعين لولي الأمر
  getStudentsByParent: async (parentId) => {
    const { data, error } = await supabase
      .from('student_parents')
      .select(`
        student_id,
        relationship,
        students (
          id,
          first_name,
          last_name,
          birth_date,
          grade_levels (name)
        )
      `)
      .eq('parent_id', parentId);
    
    if (error) throw error;
    return data;
  },

  // الحصول على التقييمات اليومية للطالب
  getDailyAssessments: async (studentId, limit = 10) => {
    const { data, error } = await supabase
      .from('daily_assessments')
      .select(`
        *,
        lessons (title)
      `)
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // الحصول على ملاحظات المعلم على الطالب
  getStudentNotes: async (studentId, limit = 5) => {
    const { data, error } = await supabase
      .from('student_notes')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // حساب متوسط أداء الطالب من التقييمات اليومية
  getStudentPerformanceAverage: async (studentId) => {
    const { data, error } = await supabase
      .from('daily_assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const totalScores = data.map(assessment => {
return Object.keys(MAX_SCORES).reduce((sum, key) => {
  return sum + (assessment[key] || 0);  // إزالة `_score` من key
}, 0);
      });
      
      const total = totalScores.reduce((sum, score) => sum + score, 0);
      const totalMax = calculateMaxTotalScore() * data.length; // إجمالي القيم القصوى لكل التقييمات
      return Math.round((total / totalMax) * 100); // النسبة المئوية
    }
    
    return 0;
  },

    // الحصول على آخر تقييمين للطالب لحساب نسبة التقدم
  getLastTwoAssessments: async (studentId) => {
    const { data, error } = await supabase
      .from('daily_assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .limit(2);
    
    if (error) throw error;
    return data;
  },

  // دالة جديدة: جمع التقرير الأسبوعي من التقييمات اليومية
  getWeeklyReportFromDaily: async (studentId, weekStartDate) => {
    try {
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
    // جمع القيم فقط إذا كانت موجودة
    if (assessment[key] !== null && assessment[key] !== undefined) {
      newAcc[key] = (newAcc[key] || 0) + (assessment[key] || 0);
      newAcc[`${key}_count`] = (newAcc[`${key}_count`] || 0) + 1; // عد عدد المرات التي تم تقييمها
    }
    return newAcc;
  }, acc);
}, {});

      const daysCount = dailyAssessments.length;
      
      // إنشاء التقرير بحساب متوسط كل فئة
const report = Object.keys(MAX_SCORES).reduce((rep, key) => {
  if (totals[`${key}_count`] > 0) {
    rep[`${key}_score`] = Math.round(totals[key] / totals[`${key}_count`]);
  } else {
    rep[`${key}_score`] = null; // أو 0 إذا كنت تريد عرض صفر
  }
  return rep;
}, {});

      // حساب الإجمالي الكلي والنسبة المئوية
      report.total_score = Object.values(report).reduce((sum, score) => sum + score, 0);
      report.percentage = Math.round((report.total_score / calculateMaxTotalScore()) * 100);

      // جمع ملاحظات المعلمين
      const allNotes = dailyAssessments
        .filter(a => a.teacher_notes)
        .map(a => a.teacher_notes);
      
      if (allNotes.length > 0) {
        report.teacher_notes = allNotes.join('\n\n');
      }

      return report;

    } catch (error) {
      console.error('Error generating weekly report:', error);
      return null;
    }
  },

  // حساب أكثر المهارات تحسناً بين آخر تقييمين
getMostImprovedSkill: async (studentId) => {
  try {
    const { data: assessments, error } = await supabase
      .from('daily_assessments')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .limit(2);

    if (error) throw error;
    if (!assessments || assessments.length < 2) return null;

    const [current, previous] = assessments;
    let mostImproved = { skill: null, improvement: 0 };

    Object.keys(MAX_SCORES).forEach(key => {
      const currentScore = current[key] || 0;
      const previousScore = previous[key] || 0;
      const improvement = currentScore - previousScore;
      
      if (improvement > mostImproved.improvement) {
        mostImproved = { skill: key, improvement };
      } else if (improvement === mostImproved.improvement && improvement > 0) {
        // في حالة التساوي، اختر الأعلى أولوية
        if (SKILL_PRIORITY[key] < SKILL_PRIORITY[mostImproved.skill]) {
          mostImproved = { skill: key, improvement };
        }
      }
    });

    return mostImproved.improvement > 0 ? mostImproved : null;
  } catch (error) {
    console.error('Error calculating improved skill:', error);
    return null;
  }
}
};