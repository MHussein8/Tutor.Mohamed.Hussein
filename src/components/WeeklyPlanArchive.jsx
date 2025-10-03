// src/components/WeeklyPlanArchive.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const WeeklyPlanArchive = ({ teacherId }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [groupTypes, setGroupTypes] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);

  console.log('WeeklyPlanArchive - teacherId:', teacherId);

  // دالة جلب الخيارات
  const fetchOptions = useCallback(async () => {
    try {
      const { data: groupTypesData } = await supabase.from('group_types').select();
      const { data: gradeLevelsData } = await supabase.from('grade_levels').select();
      setGroupTypes(groupTypesData || []);
      setGradeLevels(gradeLevelsData || []);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  }, []);

  // دالة جلب الخطط
  const fetchPlans = useCallback(async () => {
    if (!teacherId) {
      console.log('No teacherId provided, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching plans for teacherId:', teacherId);
      const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching plans:", error);
        setPlans([]);
      } else {
        console.log('Plans fetched successfully:', data?.length || 0);
        setPlans(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  // useEffect
  useEffect(() => {
    if (teacherId) {
      fetchPlans();
      fetchOptions();
    } else {
      setLoading(false);
    }
  }, [teacherId, fetchPlans, fetchOptions]);

  // باقي الدوال كما هي...
  const deletePlan = async (planId) => {
    if (window.confirm('هل تريد حذف هذه الخطة؟')) {
      const { error } = await supabase.from('weekly_plans').delete().eq('id', planId);
      if (!error) {
        fetchPlans();
        alert('تم حذف الخطة بنجاح');
      } else {
        alert('حدث خطأ أثناء الحذف');
      }
    }
  };

  const copyPlan = async (plan) => {
    const newPlan = {
      group_type_id: plan.group_type_id,
      grade_level_id: plan.grade_level_id,
      teacher_id: plan.teacher_id,
      week_start_date: new Date().toISOString().split('T')[0],
      plan_data: plan.plan_data,
      status: 'Published'
    };

    const { error } = await supabase.from('weekly_plans').insert(newPlan);
    if (!error) {
      fetchPlans();
      alert('تم نسخ الخطة بنجاح');
    } else {
      alert('حدث خطأ أثناء النسخ');
    }
  };

  const getGroupTypeName = (groupTypeId) => {
    const groupType = groupTypes.find(g => g.id === groupTypeId);
    return groupType ? groupType.name : `نوع المجموعة ${groupTypeId}`;
  };

  const getGradeLevelName = (gradeLevelId) => {
    const gradeLevel = gradeLevels.find(g => g.id === gradeLevelId);
    return gradeLevel ? gradeLevel.name : `المرحلة ${gradeLevelId}`;
  };

  const getEvaluationName = (evalType) => {
    const evaluationNames = {
      'grammar': '📝 القواعد',
      'vocab': '🔤 المفردات', 
      'writing': '✍️ الكتابة',
      'recitation': '🎯 تسميع الكلمات',
      'tests': '📊 الاختبارات'
    };
    return evaluationNames[evalType] || evalType;
  };
  
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
      <div>جاري تحميل الخطط...</div>
    </div>
  );

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh', direction: 'rtl' }}>
      {/* الرأس */}
      <div style={{ 
        background: 'linear-gradient(135deg, #00b894, #00a085)', 
        color: 'white', 
        padding: '25px', 
        borderRadius: '10px', 
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2.2em', marginBottom: '10px' }}>📁 الأرشيف والمراجعة</h1>
        <p style={{ fontSize: '1.1em', opacity: '0.9' }}>عرض ومراجعة الخطط الأسبوعية السابقة</p>
        <p style={{ fontSize: '0.9em', opacity: '0.7', marginTop: '10px' }}>
          teacherId: {teacherId || 'غير محدد'}
        </p>
      </div>

      {!teacherId ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
          <h3>⚠️ لم يتم تحديد هوية المعلم</h3>
          <p>يرجى التأكد من تسجيل الدخول بشكل صحيح</p>
        </div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
          <h3>لا توجد خطط محفوظة</h3>
          <p>انتقل إلى صفحة الإدخال لإنشاء خطة جديدة</p>
        </div>
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px', color: '#666', textAlign: 'center' }}>
            تم العثور على {plans.length} خطة
          </div>
          {plans.map((plan) => (
            <div key={plan.id} style={{ 
              background: 'white', 
              padding: '20px', 
              marginBottom: '15px', 
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
<h4 style={{ margin: 0, color: '#2d3436', fontSize: '1.3em' }}>
    📅 خطة أسبوعية - {new Date(plan.week_start_date).toLocaleDateString('en-GB')}
</h4>
                  <p style={{ margin: '8px 0', color: '#666' }}>
                    <strong>المرحلة:</strong> {getGradeLevelName(plan.grade_level_id)} | 
                    <strong> النوع:</strong> {getGroupTypeName(plan.group_type_id)}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <button 
                    onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#3498db', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer'
                    }}
                  >
                    {selectedPlan?.id === plan.id ? 'إخفاء' : 'عرض'}
                  </button>
                  <button 
                    onClick={() => copyPlan(plan)}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#f39c12', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer'
                    }}
                  >
                    نسخ
                  </button>
                  <button 
                    onClick={() => deletePlan(plan.id)}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#e74c3c', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer'
                    }}
                  >
                    حذف
                  </button>
                </div>
              </div>

{selectedPlan?.id === plan.id && (
  <div style={{ 
    marginTop: '20px', 
    padding: '25px', 
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    borderRadius: '12px',
    border: '2px solid #e0e0e0',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #00b894'
    }}>
      <h5 style={{ color: '#2d3436', margin: 0, fontSize: '1.3em' }}>
        📋 تفاصيل الخطة الأسبوعية
      </h5>
      <button 
        onClick={() => setSelectedPlan(null)}
        style={{
          padding: '6px 12px',
          background: '#e74c3c',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.8em'
        }}
      >
        إغلاق
      </button>
    </div>
    
    <div style={{
      display: 'grid',
      gap: '15px',
      maxHeight: '500px',
      overflowY: 'auto',
      padding: '10px'
    }}>
      {plan.plan_data && Object.entries(plan.plan_data).map(([day, data]) => (
        <div key={day} style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          border: '1px solid #ddd',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* عنوان اليوم */}
          <div style={{
            background: 'linear-gradient(135deg, #e17055, #d63031)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '15px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1.1em'
          }}>
            {day}
          </div>
          
          {/* محتوى الخطة */}
          <div style={{ display: 'grid', gap: '15px' }}>
            {/* الدرس */}
            <div style={{
              padding: '15px',
              background: '#e3f2fd',
              borderRadius: '8px',
              borderRight: '4px solid #2196f3'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '10px',
                color: '#1976d2',
                fontWeight: 'bold'
              }}>
                <span style={{ marginLeft: '8px' }}>📖</span>
                <span>الدرس</span>
              </div>
              <div 
                style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  minHeight: '60px',
                  border: '1px solid #bbdefb',
                  lineHeight: '1.6'
                }}
                dangerouslySetInnerHTML={{ __html: data.lesson || '<div style="color: #999; text-align: center; padding: 20px;">لا يوجد محتوى</div>' }}
              />
            </div>
            
            {/* الواجب */}
            <div style={{
              padding: '15px',
              background: '#e8f5e9',
              borderRadius: '8px',
              borderRight: '4px solid #4caf50'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '10px',
                color: '#388e3c',
                fontWeight: 'bold'
              }}>
                <span style={{ marginLeft: '8px' }}>✏️</span>
                <span>الواجب</span>
              </div>
              <div 
                style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  minHeight: '60px',
                  border: '1px solid #c8e6c9',
                  lineHeight: '1.6'
                }}
                dangerouslySetInnerHTML={{ __html: data.homework || '<div style="color: #999; text-align: center; padding: 20px;">لا يوجد محتوى</div>' }}
              />
            </div>
            
            {/* الملاحظات */}
            <div style={{
              padding: '15px',
              background: '#fff3e0',
              borderRadius: '8px',
              borderRight: '4px solid #ff9800'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '10px',
                color: '#f57c00',
                fontWeight: 'bold'
              }}>
                <span style={{ marginLeft: '8px' }}>💡</span>
                <span>ملاحظات المعلم</span>
              </div>
              <div 
                style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  minHeight: '60px',
                  border: '1px solid #ffe0b2',
                  lineHeight: '1.6'
                }}
                dangerouslySetInnerHTML={{ __html: data.notes || '<div style="color: #999; text-align: center; padding: 20px;">لا يوجد محتوى</div>' }}
              />
            </div>
            
            {/* التقييمات إذا وجدت */}
            {data.evaluations && Object.entries(data.evaluations).some(([_, evalData]) => evalData.active) && (
              <div style={{
                padding: '15px',
                background: '#f3e5f5',
                borderRadius: '8px',
                borderRight: '4px solid #9c27b0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '10px',
                  color: '#7b1fa2',
                  fontWeight: 'bold'
                }}>
                  <span style={{ marginLeft: '8px' }}>⭐</span>
                  <span>التقييمات</span>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e1bee7'
                }}>
                  {Object.entries(data.evaluations).map(([evalType, evalData]) => (
                    evalData.active && (
                      <div key={evalType} style={{
                        padding: '10px',
                        marginBottom: '8px',
                        background: '#fafafa',
                        borderRadius: '6px',
                        borderLeft: '3px solid #9c27b0',
                        lineHeight: '1.5'
                      }}>
                        <strong style={{ color: '#7b1fa2' }}>{getEvaluationName(evalType)}:</strong> 
                        <div style={{ marginTop: '5px', color: '#555' }}>{evalData.details}</div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanArchive;