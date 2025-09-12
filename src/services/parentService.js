import { supabase } from './supabase';

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
      .order('created_at', { ascending: false })
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
        return (
          (assessment.grammar_score || 0) +
          (assessment.vocabulary_score || 0) +
          (assessment.writing_score || 0) +
          (assessment.homework_score || 0) +
          (assessment.memorization_score || 0) +
          (assessment.interaction_score || 0) +
          (assessment.attendance_score || 0)
        );
      });
      
      const total = totalScores.reduce((sum, score) => sum + score, 0);
      return Math.round((total / totalScores.length) * 100 / 70);
    }
    
    return 0;
  },

// دالة جديدة: جمع التقرير الأسبوعي من التقييمات اليومية (مطابقة للوحة المعلم)
getWeeklyReportFromDaily: async (studentId, weekStartDate) => {
  try {
    // استخدام نفس منطق حساب الأسبوع كما في teacherService
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

    // استخدام نفس طريقة الحساب كما في teacherService
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
}
};