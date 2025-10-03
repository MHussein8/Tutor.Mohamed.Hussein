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
          grade_levels (name),
          teacher_id
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
const totalScoresAndMaxes = data.map(assessment => {
  const evaluatedKeys = Object.keys(MAX_SCORES).filter(key => assessment[key] !== null && assessment[key] !== undefined);
  const totalScore = evaluatedKeys.reduce((sum, key) => sum + assessment[key], 0);
  const maxTotalScore = calculateMaxTotalScore(evaluatedKeys);
  return { totalScore, maxTotalScore };
});

const total = totalScoresAndMaxes.reduce((sum, item) => sum + item.totalScore, 0);
const totalMax = totalScoresAndMaxes.reduce((sum, item) => sum + item.maxTotalScore, 0);

return totalMax > 0 ? Math.round((total / totalMax) * 100) : 0;
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
    
      // إنشاء التقرير بحساب متوسط كل فئة
const report = Object.keys(MAX_SCORES).reduce((rep, key) => {
  if (totals[`${key}_count`] > 0) {
    rep[`${key}_score`] = Math.round(totals[key] / totals[`${key}_count`]);
  } else {
    rep[`${key}_score`] = null; // أو 0 إذا كنت تريد عرض صفر
  }
  return rep;
}, {});

// تحديد العناصر التي تم تقييمها في التقرير الأسبوعي (المتوسطات غير الصفرية)
const evaluatedKeys = Object.keys(report).filter(key => key.endsWith('_score') && report[key] !== null);

// حساب الدرجة العظمى ديناميكياً بناءً على هذه العناصر
const maxTotalScore = calculateMaxTotalScore(evaluatedKeys);

// حساب الإجمالي الكلي والنسبة المئوية بناءً على الدرجة العظمى الديناميكية
report.total_score = Object.values(report).reduce((sum, score) => sum + score, 0);
report.percentage = maxTotalScore > 0 ? Math.round((report.total_score / maxTotalScore) * 100) : 0;

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
},

// دالة جديدة: جلب الخطة الأسبوعية للدروس (بما في ذلك الواجب)
getWeeklyLessons: async (studentId, weekStartDate) => {
  try {
    // 1. نجيب الطالب مع العلاقات
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        grade_levels(*),
        group_types(*)
      `)
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      // إرجاع مصفوفة فارغة إذا لم يتم العثور على الطالب
      console.warn(`Student with ID ${studentId} not found or error occurred:`, studentError);
      return [];
    }
    
    // **التعديل رقم 1: ضمان تنسيق التاريخ (YYYY-MM-DD)**
    // تحويل التاريخ المُمرر إلى تنسيق 'YYYY-MM-DD' ليتوافق مع عمود 'date' في قاعدة البيانات (يحل مشكلة 406).
    const formattedWeekStartDate = new Date(weekStartDate).toISOString().split('T')[0];

    // 2. ثم الخطة العامة
    // **التعديل رقم 2: استخدام maybeSingle()**
    // يسمح بإرجاع null بدلاً من إلقاء خطأ في حالة عدم العثور على نتيجة.
    const { data: weeklyPlan, error: weeklyPlanError } = await supabase 
      .from('weekly_plans')
      .select('plan_data')
      .eq('group_type_id', student.group_types.id)
      .eq('grade_level_id', student.grade_levels.id)
      .eq('week_start_date', formattedWeekStartDate) // استخدام التاريخ المُنظف
      .maybeSingle(); 

    if (weeklyPlanError) throw weeklyPlanError; // معالجة أخطاء الاتصال/الخادم الصريحة

    // **التعديل رقم 3: التحقق الشامل من القيمة الفارغة (لحل TypeError)**
    // يمنع انهيار التطبيق إذا كانت weeklyPlan هي null أو plan_data غير موجود.
    if (!weeklyPlan || !weeklyPlan.plan_data) {
        console.warn(`No weekly plan found for Grade ${student.grade_levels.id} starting ${formattedWeekStartDate}`);
        return []; // إرجاع آمن
    }

    // تحويل بيانات الخطة إلى تنسيق متوافق مع الواجهة
    const lessons = [];
    // استخدام التاريخ المُنظف لضمان دقة الحسابات
    const startDate = new Date(formattedWeekStartDate);
    const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    weekDays.forEach((dayName, index) => {
      const dayData = weeklyPlan.plan_data[dayName];
      if (dayData && dayData.lesson && dayData.lesson.trim() !== '') {
        const lessonDate = new Date(startDate);
        lessonDate.setDate(startDate.getDate() + index);
        
        lessons.push({
          id: `plan-${dayName}-${formattedWeekStartDate}`, // استخدام التاريخ المُنظف في الـ ID
          title: dayData.lesson,
          content: dayData.lesson,
          homework: dayData.homework,
          lesson_date: lessonDate.toISOString().split('T')[0],
          day_name: dayName,
          notes: dayData.notes,
          evaluations: dayData.evaluations || {}
        });
      }
    });

    return lessons;

  } catch (error) {
    console.error('Error fetching weekly lessons:', error);
    // إرجاع آمن في حال حدوث خطأ
    return [];
  }
}
};