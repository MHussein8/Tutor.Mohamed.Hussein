// src/pages/TeacherWeeklyPlans.jsx
import React, { useState, useEffect } from 'react';
import WeeklyPlanInput from '../components/WeeklyPlanInput';
import WeeklyPlanArchive from '../components/WeeklyPlanArchive';
import { supabase } from '../services/supabase';

const TeacherWeeklyPlans = () => {
  const [activeTab, setActiveTab] = useState('input');
  const [teacherId, setTeacherId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherId();
  }, []);

  const fetchTeacherId = async () => {
    try {
      setLoading(true);
      
      // جلب الـ ID من localStorage أولاً
      const localTeacherId = localStorage.getItem('current_teacher_id');
      
      if (localTeacherId) {
        console.log('Found teacher ID in localStorage:', localTeacherId);
        setTeacherId(parseInt(localTeacherId));
        setLoading(false);
        return;
      }

      // إذا لم يوجد في localStorage، جلب من قاعدة البيانات
      console.log('No teacher ID in localStorage, fetching from database...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        setLoading(false);
        return;
      }
      
      if (user && user.email) {
        console.log('User found:', user.email);
        const { data, error } = await supabase
          .from('teachers')
          .select('id')
          .eq('email', user.email)
          .single();

        if (error) {
          console.error('Database error:', error);
        } else if (data) {
          console.log('Teacher data found:', data);
          setTeacherId(data.id);
          localStorage.setItem('current_teacher_id', data.id.toString());
        } else {
          console.log('No teacher record found for email:', user.email);
        }
      } else {
        console.log('No user logged in');
      }
    } catch (error) {
      console.error("Unexpected error fetching teacher ID:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToArchiveTab = () => {
    console.log('Switching to archive tab, teacherId:', teacherId);
    setActiveTab('archive');
  };
  
  const handleTabChange = (tabName) => {
    console.log('Changing tab to:', tabName, 'teacherId:', teacherId);
    setActiveTab(tabName);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        direction: 'rtl'
      }}>
        <div>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      {/* شريط التنقل */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginBottom: '20px', 
        padding: '20px', 
        background: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <button 
          onClick={() => handleTabChange('input')} 
          style={{ 
            padding: '12px 24px', 
            background: activeTab === 'input' ? '#667eea' : '#f5f5f5', 
            color: activeTab === 'input' ? 'white' : 'black',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1em',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
        >
          📝 إدخال خطة جديدة
        </button>
        <button 
          onClick={() => handleTabChange('archive')} 
          style={{ 
            padding: '12px 24px', 
            background: activeTab === 'archive' ? '#00b894' : '#f5f5f5', 
            color: activeTab === 'archive' ? 'white' : 'black',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1em',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
        >
          🗃️ الأرشيف والمراجعة
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div style={{ padding: '0 20px' }}>
        {activeTab === 'input' && (
          <WeeklyPlanInput 
            teacherId={teacherId} 
            onGoToArchive={goToArchiveTab} 
          />
        )} 
        {activeTab === 'archive' && (
          <WeeklyPlanArchive teacherId={teacherId} />
        )}
      </div>
    </div>
  );
};

export default TeacherWeeklyPlans;