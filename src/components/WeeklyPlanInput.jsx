// src/components/WeeklyPlanInput.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase'; 

// --------------------------------------------------------------------------------
// البيانات الثابتة وتوليد الأيام (بدون تغيير)
// --------------------------------------------------------------------------------
const generateWeekDays = (startDate) => {
    const days = [];
    const start = new Date(startDate + 'T00:00:00');
    
    const dayNames = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    
    for (let i = 0; i < 6; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);

        const yyyy = day.getFullYear();
        const mm = String(day.getMonth() + 1).padStart(2, '0');
        const dd = String(day.getDate()).padStart(2, '0');
        
        days.push({
            id: dayNames[i], 
            name: dayNames[i], 
            date: `${yyyy}-${mm}-${dd}`
        });
    }
    return days;
};

// ==============================================================================
// Component: EditorToolbar (مبسط)
// ==============================================================================
const EditorToolbar = ({ editorRef }) => {
  const [savedSelection, setSavedSelection] = useState(null);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (editorRef.current && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      setSavedSelection(selection.getRangeAt(0));
    } else {
      setSavedSelection(null); 
    }
  };

  const formatText = (command, value = null) => {
    const editor = editorRef.current;
    
    if (editor) {
        editor.focus();
    }
    
    const selection = window.getSelection();
    if (editor && savedSelection) {
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    } 
    
    try {
        if (command === 'foreColor') {
            document.execCommand('styleWithCSS', false, true); 
            document.execCommand(command, false, value);
            document.execCommand('styleWithCSS', false, false); 
        } else {
            document.execCommand(command, false, value);
        }
    } catch (e) {
      console.error("Formatting error:", e);
    }
  };

  return (
    <div 
      style={{
        background: '#f0f4f7',
        padding: '10px',
        borderRadius: '8px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginBottom: '10px',
        border: '1px solid #e0e0e0'
      }}
      onMouseDown={(e) => {
        if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
          e.preventDefault();
          saveSelection(); 
        }
      }}
    >
      <button 
        onClick={() => formatText('bold')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer', fontWeight: 'bold' }}
      ><b>B</b></button>
      <button 
        onClick={() => formatText('italic')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer', fontStyle: 'italic' }}
      ><i>I</i></button>
      <button 
        onClick={() => formatText('underline')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer', textDecoration: 'underline' }}
      ><u>U</u></button>
      
      {/* أزرار المحاذاة */}
      <button 
        onClick={() => formatText('justifyLeft')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
      >⬅️</button>
      <button 
        onClick={() => formatText('justifyCenter')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
      >⏺️</button>
      <button 
        onClick={() => formatText('justifyRight')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
      >➡️</button>
      
      <button 
        onClick={() => formatText('insertUnorderedList')}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
      >• List</button>
      
      {/* القائمة المنسدلة للألوان */}
      <select 
        onChange={(e) => formatText('foreColor', e.target.value)}
        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
        defaultValue=""
        onMouseUp={saveSelection} 
        onFocus={saveSelection}
      >
        <option value="" disabled>لون النص</option>
        <option value="#e17055">أحمر</option>
        <option value="#74b9ff">أزرق</option>
        <option value="#00b894">أخضر</option>
        <option value="#2d3436">أسود</option>
      </select>
    </div>
  );
};

// ==============================================================================
// Component: WeeklyPlanInput (المكون الرئيسي)
// ==============================================================================
const WeeklyPlanInput = ({ teacherId: propTeacherId }) => { 
    const [activeDay, setActiveDay] = useState('السبت');
    const [planData, setPlanData] = useState({});
    const [tempPlanData, setTempPlanData] = useState({});
    const [groupTypes, setGroupTypes] = useState([]);
    const [gradeLevels, setGradeLevels] = useState([]);
    const [selectedGroupType, setSelectedGroupType] = useState('');
    const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
    const [saveStatus, setSaveStatus] = useState('جاري التحقق من حالة تسجيل الدخول...');
    const [loading, setLoading] = useState(false);
    const [teacherId, setTeacherId] = useState(propTeacherId || null); 
    const [weekDays, setWeekDays] = useState([]); 
    const [selectedWeek, setSelectedWeek] = useState(new Date().toISOString().split('T')[0]);
    const lessonEditorRef = useRef(null);
    const homeworkEditorRef = useRef(null);
    const notesEditorRef = useRef(null);

    // -----------------------------------------------------------
    // دالة جلب الخطة الموجودة
    // -----------------------------------------------------------
    const fetchExistingPlan = useCallback(async (group, grade, teacher) => {
      if (!group || !grade || !teacher) return;

      setLoading(true);
      setSaveStatus('جاري تحميل الخطة السابقة...');

      try {
        const weekStartDate = selectedWeek;

        const { data, error } = await supabase
          .from('weekly_plans')
          .select('plan_data')
          .eq('group_type_id', group)
          .eq('grade_level_id', grade)
          .eq('teacher_id', teacher)
          .eq('week_start_date', weekStartDate)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching existing plan:", error);
          setPlanData({});
          setSaveStatus('❌ فشل تحميل الخطة السابقة.');
        } else if (data) {
          setPlanData(data.plan_data || {});
          setTempPlanData(data.plan_data || {});
          setSaveStatus('✅ تم تحميل الخطة السابقة بنجاح.');
        } else {
          setPlanData(tempPlanData);
          setSaveStatus('📝 ابدأ بكتابة الخطة الجديدة');
        }
      } catch (error) {
        console.error("Unexpected error fetching plan:", error);
        setSaveStatus(`❌ خطأ غير متوقع أثناء التحميل: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, [selectedWeek, tempPlanData]);

    // -----------------------------------------------------------
    // دالة جلب الخيارات
    // -----------------------------------------------------------
    const fetchOptions = useCallback(async () => {
      try {
        const { data: groupTypesData } = await supabase.from('group_types').select();
        const { data: gradeLevelsData } = await supabase.from('grade_levels').select();
        setGroupTypes(groupTypesData || []);
        setGradeLevels(gradeLevelsData || []);
      } catch (error) {
        console.error("Error fetching options:", error);
        setSaveStatus('❌ فشل جلب الخيارات (أنواع المجموعات والمراحل).');
      }
    }, []);

    // -----------------------------------------------------------
    // الدالة الحاسمة: جلب الـ ID والتحقق من المصادقة
    // -----------------------------------------------------------
    const fetchTeacherId = useCallback(async () => {
      try {
        const localTeacherId = localStorage.getItem('current_teacher_id');
        
        if (localTeacherId) {
          setTeacherId(parseInt(localTeacherId));
          setSaveStatus('✅ تم جلب هوية المعلم من الجلسة المحلية بنجاح. يمكنك الآن الحفظ.');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user && user.email) {
          const { data, error } = await supabase
            .from('teachers')
            .select('id')
            .eq('email', user.email)
            .single();

          if (error && error.code !== 'PGRST116') {
            setSaveStatus('❌ خطأ في قاعدة البيانات أثناء جلب سجل المعلم.');
          } else if (data) {
            setTeacherId(data.id);
            localStorage.setItem('current_teacher_id', data.id.toString());
            setSaveStatus('✅ تم جلب هوية المعلم بنجاح. يمكنك الآن الحفظ.');
          } else {
            setSaveStatus('⚠️ بريدك مُسجل دخوله لكن لا يوجد سجل له كمعلم في جدول teachers.');
          }
        } else {
          setSaveStatus('⚠️ لا يوجد جلسة مستخدم. يرجى تسجيل الدخول لاستخدام لوحة التخطيط.');
          setTeacherId(null);
        }
      } catch (e) {
        setSaveStatus(`❌ خطأ غير متوقع: ${e.message}`);
      }
    }, []);

    useEffect(() => {
        const dynamicDays = generateWeekDays(selectedWeek);
        setWeekDays(dynamicDays);
        if (dynamicDays.length > 0) {
            setActiveDay(dynamicDays[0].name);
        }
        fetchOptions();
        if (!propTeacherId) {
            fetchTeacherId();
        } else {
            setSaveStatus('✅ تم تحديد هوية المعلم من الصفحة الرئيسية.');
        }
    }, [propTeacherId, selectedWeek, fetchOptions, fetchTeacherId]);
    
    // -----------------------------------------------------------
    // useEffect لتحميل الخطة عندما تكون الفلاتر والمعلم جاهزة
    // -----------------------------------------------------------
    useEffect(() => {
        if (selectedGroupType && selectedGradeLevel && teacherId) {
            fetchExistingPlan(selectedGroupType, selectedGradeLevel, teacherId);
        }
    }, [selectedGroupType, selectedGradeLevel, teacherId, fetchExistingPlan]);

    // باقي الدوال والواجهة كما هي...
    const handleContentChange = (day, field, value) => {
        const newPlanData = {
            ...planData,
            [day.name]: {
                ...planData[day.name],
                [field]: value
            }
        };
        setPlanData(newPlanData);
        setTempPlanData(newPlanData);
    };

    const handleEvaluationChange = (evalType, checked, details) => {
        const newPlanData = {
            ...planData,
            [activeDay]: {
                ...planData[activeDay],
                evaluations: {
                    ...planData[activeDay]?.evaluations,
                    [evalType]: {
                        active: checked,
                        details: details
                    }
                }
            }
        };
        setPlanData(newPlanData);
        setTempPlanData(newPlanData);
    };

    // -----------------------------------------------------------
    // دالة حفظ الخطة
    // -----------------------------------------------------------
    const saveWeekPlan = async () => {
        if (!selectedGroupType || !selectedGradeLevel) {
            setSaveStatus('⚠️ يرجى اختيار نوع التعلم والمرحلة أولاً');
            return;
        }

        if (!teacherId) {
            setSaveStatus('⚠️ لا يمكن الحفظ. لم يتم تحديد هوية المعلم.');
            return;
        }

        setLoading(true);
        setSaveStatus('جاري الحفظ...');

        try {
            const weekStartDate = weekDays[0]?.date || new Date().toISOString().split('T')[0];

            const planToSave = {
                group_type_id: Number(selectedGroupType),
                grade_level_id: Number(selectedGradeLevel),
                teacher_id: teacherId, 
                week_start_date: weekStartDate, // يجب أن تكون بالتنسيق YYYY-MM-DD
                plan_data: planData,
                status: 'Published',
            };

            // 1. حذف الخطة القديمة لنفس المعلم والأسبوع (للتأكد من عدم تكرار الخطة)
            const { error: deleteError } = await supabase
                .from('weekly_plans')
                .delete()
                .eq('group_type_id', selectedGroupType)
                .eq('grade_level_id', selectedGradeLevel)
                .eq('teacher_id', teacherId) 
                .eq('week_start_date', planToSave.week_start_date);

            if (deleteError) {
                console.error("Delete Error:", deleteError);
                // لا نفشل بالضرورة، قد يكون السجل غير موجود
            }


            // 2. إدخال الخطة الجديدة
            const { error: insertError } = await supabase.from('weekly_plans').insert(planToSave);
            
            if (insertError) throw insertError;
            setSaveStatus('✅ تم حفظ الخطة بنجاح!');
        } catch (error) {
            console.error("Error during save:", error);
            setSaveStatus(`❌ حدث خطأ أثناء الحفظ. السبب: ${error.message || 'خطأ غير محدد'}`);
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------------------------------------
    // الـ JSX
    // -----------------------------------------------------------
    return (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh', direction: 'rtl', fontFamily: 'Inter, sans-serif' }}>
            
            {/* الفلاتر */}
            <div style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap'
            }}>
                <div>
                    <label style={{ fontWeight: '600', marginLeft: '10px' }}>نوع التعلم: </label>
                    <select 
                        value={selectedGroupType} 
                        onChange={(e) => setSelectedGroupType(e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                        <option value="">اختر نوع التعلم</option>
                        {groupTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label style={{ fontWeight: '600', marginLeft: '10px' }}>المرحلة: </label>
                    <select 
                        value={selectedGradeLevel} 
                        onChange={(e) => setSelectedGradeLevel(e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                        <option value="">اختر المرحلة</option>
                        {gradeLevels.map(level => (
                            <option key={level.id} value={level.id}>{level.name}</option>
                        ))}
                    </select>
                </div>
            </div>
{/* محدد الأسبوع */}
<div style={{
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center'
}}>
    <div>
        <label style={{ fontWeight: '600', marginLeft: '10px' }}>اختر أسبوع: </label>
        <input 
            type="date" 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{ 
                padding: '8px', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                fontSize: '16px'
            }}
        />
    </div>
    
    {/* أزرار التنقل بين الأسابيع */}
    <div style={{ display: 'flex', gap: '10px' }}>
        <button 
            onClick={() => {
                const prevWeek = new Date(selectedWeek);
                prevWeek.setDate(prevWeek.getDate() - 7);
                setSelectedWeek(prevWeek.toISOString().split('T')[0]);
            }}
        >
            ⬅️ الأسبوع السابق
        </button>
        
        <button 
            onClick={() => {
                const nextWeek = new Date(selectedWeek);
                nextWeek.setDate(nextWeek.getDate() + 7);
                setSelectedWeek(nextWeek.toISOString().split('T')[0]);
            }}
        >
            الأسبوع التالي ➡️
        </button>
        
        <button 
            onClick={() => setSelectedWeek(new Date().toISOString().split('T')[0])}
        >
            هذا الأسبوع
        </button>
    </div>
</div>            

{/* تبويبات الأيام */}
            <div style={{
                display: 'flex',
                background: '#2d3436',
                padding: '0 25px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                borderRadius: '10px',
                marginBottom: '20px'
            }}>
                {weekDays.map(day => (
                    <div
                        key={day.name}
                        onClick={() => setActiveDay(day.name)}
                        style={{
                            padding: '18px 30px',
                            color: 'white',
                            cursor: 'pointer',
                            borderBottom: activeDay === day.name ? '4px solid #fd79a8' : '4px solid transparent',
                            background: activeDay === day.name ? '#e17055' : 'transparent',
                            transition: 'all 0.3s ease',
                            fontWeight: '600',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        {day.name}
                        <div style={{ fontSize: '0.9em', opacity: '0.8' }}>{day.date}</div>
                    </div>
                ))}
            </div>

            {/* محتوى اليوم النشط */}
            <div style={{ display: 'grid', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* قسم الدرس */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                    borderLeft: '6px solid #74b9ff'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '2em', marginLeft: '15px' }}>📖</div>
                        <h3 style={{ color: '#2d3436', fontSize: '1.5em' }}>الدرس</h3>
                    </div>
                    
                    {/* شريط الأدوات الخاص بالدرس */}
                    <EditorToolbar editorRef={lessonEditorRef} />
                    
                    <div
                        ref={lessonEditorRef} // ربط الـ ref بالحقل
                        contentEditable
                        className="content-editor"
                        onBlur={(e) => handleContentChange(weekDays.find(d => d.name === activeDay), 'lesson', e.target.innerHTML)}
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '20px',
                            border: '2px solid #bdc3c7',
                            borderRadius: '10px',
                            fontSize: '16px',
                            lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{ 
                            __html: planData[activeDay]?.lesson || '• اللغة الإنجليزية - Unit 3<br>• أزمنة الأفعال<br>• المفردات الجديدة' 
                        }}
                    />
                </div>

                {/* قسم الواجب */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                    borderLeft: '6px solid #55efc4'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '2em', marginLeft: '15px' }}>✏️</div>
                        <h3 style={{ color: '#2d3436', fontSize: '1.5em' }}>الواجب</h3>
                    </div>
                    
                    {/* شريط الأدوات الخاص بالواجب */}
                    <EditorToolbar editorRef={homeworkEditorRef} />

                    <div
                        ref={homeworkEditorRef} // ربط الـ ref بالحقل
                        contentEditable
                        className="content-editor"
                        onBlur={(e) => handleContentChange(weekDays.find(d => d.name === activeDay), 'homework', e.target.innerHTML)}
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '20px',
                            border: '2px solid #bdc3c7',
                            borderRadius: '10px',
                            fontSize: '16px',
                            lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{ 
                            __html: planData[activeDay]?.homework || '• حل التمارين من الصفحة 45 إلى 48<br>• كتابة فقرة<br>• مراجعة المفردات' 
                        }}
                    />
                </div>

                {/* قسم التقييمات */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                    borderLeft: '6px solid #fdcb6e'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '2em', marginLeft: '15px' }}>⭐</div>
                        <h3 style={{ color: '#2d3436', fontSize: '1.5em' }}>التقييمات المخطط لها</h3>
                    </div>

                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ color: '#2d3436', marginBottom: '15px', paddingBottom: '8px', borderBottom: '2px solid #00b894' }}>🔄 التقييمات الثابتة</h4>
                            
                            <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '15px',
                            padding: '15px',
                            background: 'rgba(0, 184, 148, 0.05)',
                            borderRadius: '10px',
                            marginBottom: '10px',
                            borderRight: '3px solid #00b894'
                            }}>
                            <input type="checkbox" checked disabled style={{ marginTop: '3px' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#2d3436', marginBottom: '8px' }}>✅ الحضور</div>
                                <textarea 
                                value="حضور الحصة كاملة"
                                readOnly
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    minHeight: '60px',
                                    background: '#f8f9fa'
                                }}
                                />
                            </div>
                            </div>

                            <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '15px',
                            padding: '15px',
                            background: 'rgba(0, 184, 148, 0.05)',
                            borderRadius: '10px',
                            marginBottom: '10px',
                            borderRight: '3px solid #00b894'
                            }}>
                            <input type="checkbox" checked disabled style={{ marginTop: '3px' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#2d3436', marginBottom: '8px' }}>💬 التفاعل والمشاركة</div>
                                <textarea 
                                value="المشاركة في الأنشطة الصفية والمناقشات"
                                readOnly
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    minHeight: '60px',
                                    background: '#f8f9fa'
                                }}
                                />
                            </div>
                            </div>
                        </div>

                        {/* التقييمات المتغيرة */}
                        <div>
                            <h4 style={{ color: '#2d3436', marginBottom: '15px', paddingBottom: '8px', borderBottom: '2px solid #74b9ff' }}>📊 التقييمات المتغيرة</h4>
                            
                            {[
                            { id: 'grammar', name: '📝 القواعد', placeholder: 'تفاصيل تقييم القواعد...' },
                            { id: 'vocab', name: '🔤 المفردات', placeholder: 'تفاصيل تقييم المفردات...' },
                            { id: 'writing', name: '✍️ الكتابة', placeholder: 'تفاصيل تقييم الكتابة...' },
                            { id: 'recitation', name: '🎯 تسميع الكلمات', placeholder: 'تفاصيل تسميع الكلمات...' },
                              { id: 'homework', name: '📚 الواجب', placeholder: 'تفاصيل تقييم الواجب...' },
                            { id: 'tests', name: '📊 الاختبارات', placeholder: 'تفاصيل الاختبارات...' }
                            ].map(evalItem => (
                            <div key={evalItem.id} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '15px',
                                padding: '15px',
                                background: 'rgba(116, 185, 255, 0.05)',
                                borderRadius: '10px',
                                marginBottom: '10px',
                                borderRight: '3px solid #74b9ff'
                            }}>
                                <input 
                                type="checkbox" 
                                checked={planData[activeDay]?.evaluations?.[evalItem.id]?.active || false}
                                onChange={(e) => handleEvaluationChange(evalItem.id, e.target.checked, planData[activeDay]?.evaluations?.[evalItem.id]?.details || '')}
                                style={{ marginTop: '3px' }} 
                                />
                                <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#2d3436', marginBottom: '8px' }}>{evalItem.name}</div>
                                <textarea 
                                    value={planData[activeDay]?.evaluations?.[evalItem.id]?.details || ''}
                                    onChange={(e) => handleEvaluationChange(evalItem.id, planData[activeDay]?.evaluations?.[evalItem.id]?.active || false, e.target.value)}
                                    placeholder={evalItem.placeholder}
                                    disabled={!planData[activeDay]?.evaluations?.[evalItem.id]?.active}
                                    style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    minHeight: '60px',
                                    background: planData[activeDay]?.evaluations?.[evalItem.id]?.active ? 'white' : '#f8f9fa'
                                    }}
                                />
                                </div>
                            </div>
                            ))}
                        </div>
                </div>


                {/* قسم الملاحظات */}
                <div style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '30px',
                    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                    borderLeft: '6px solid #fd79a8'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '2em', marginLeft: '15px' }}>💡</div>
                        <h3 style={{ color: '#2d3436', fontSize: '1.5em' }}>ملاحظات المعلم</h3>
                    </div>
                    
                    {/* شريط الأدوات الخاص بالملاحظات */}
                    <EditorToolbar editorRef={notesEditorRef} />
                    
                    <div
                        ref={notesEditorRef} // ربط الـ ref بالحقل
                        contentEditable
                        className="content-editor"
                        onBlur={(e) => handleContentChange(weekDays.find(d => d.name === activeDay), 'notes', e.target.innerHTML)}
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '20px',
                            border: '2px solid #bdc3c7',
                            borderRadius: '10px',
                            fontSize: '16px',
                            lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{ 
                            __html: planData[activeDay]?.notes || '• أداء ممتاز في نشاط المحادثة<br>• يحتاج بعض الطلاب إلى تدريب على النطق<br>• الواجب القادم تقييمي' 
                        }}
                    />
                </div>
            </div>

            {/* زر الحفظ */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <p style={{ color: saveStatus.startsWith('✅') ? '#00b894' : saveStatus.startsWith('❌') ? '#d63031' : '#e17055', fontWeight: 'bold', marginBottom: '15px' }}>
                    {saveStatus}
                </p>
                <button 
                    onClick={saveWeekPlan}
                    disabled={loading || !teacherId}
                    style={{
                        padding: '15px 40px',
                        background: loading ? '#ccc' : 'linear-gradient(135deg, #00b894, #00a085)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '1.2em',
                        fontWeight: '600',
                        cursor: loading || !teacherId ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {loading ? 'جاري الحفظ...' : '💾 حفظ الخطة الأسبوعية'}
                </button>
            </div>
        </div>
    );
};

// ==============================================================================
// ملاحظة: تم تعديل هذا الجزء ليتناسب مع استخدام المكون داخل TeacherWeeklyPlans
// ==============================================================================
// const App = () => <WeeklyPlanInput />;
// export default App; 
// إذا كان هذا الملف هو WeeklyPlanInput.jsx، فقم بتصدير المكون مباشرة
export default WeeklyPlanInput;