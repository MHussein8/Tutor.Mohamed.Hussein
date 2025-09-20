// src/config/assessmentConfig.js

/**
 * الدرجات القصوى لكل عنصر تقييم.
 * يمكنك تعديل هذه القيم في أي وقت دون الحاجة لتغيير الكود في مكان آخر.
 */
export const MAX_SCORES = {
  homework_score: 10,
  grammar_score: 5,
  vocabulary_score: 5,
  memorization_score: 15,
  attendance_score: 10,
  writing_score: 5,
  interaction_score: 5,
  quiz_score: 35,
};

export const SKILL_PRIORITY = {
  memorization_score: 1,    // أعلى أولوية
  grammar_score: 2,
  vocabulary_score: 3, 
  writing_score: 4,
  homework_score: 5,
  interaction_score: 6,
  attendance_score: 7,      // أقل أولوية
  quiz_score: 8
};

/**
 * دالة تحسب المجموع الأقصى للدرجات بناءً على القيم المحددة أعلاه.
 * هذا يجعل النظام ديناميكياً ويتكيف مع أي تغيير في الدرجات.
 */
export const calculateMaxTotalScore = () => {
  return Object.values(MAX_SCORES).reduce((total, score) => total + score, 0);
};