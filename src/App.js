import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import TeacherDashboard from './pages/TeacherDashboard';
import DailyAssessmentPage from './pages/DailyAssessmentPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import LessonsManagementPage from './pages/LessonsManagementPage';
import StudentsPage from './pages/StudentsPage';
import DailyAssessmentReportPage from './pages/DailyAssessmentReportPage';
import StudentAssessmentsPage from './pages/StudentAssessmentsPage';
import ParentDashboard from './pages/ParentDashboard';
import ParentLogin from './pages/ParentLogin';
import AddParentPage from './pages/AddParentPage';
import './App.css';

function App() {
  const [parentUser, setParentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من وجود مستخدم مسجل مسبقاً
    const savedUser = localStorage.getItem('parentUser');
    if (savedUser) {
      setParentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleParentLogin = (userData) => {
    setParentUser(userData);
    localStorage.setItem('parentUser', JSON.stringify(userData));
  };

  const handleParentLogout = () => {
    localStorage.removeItem('parentUser');
    setParentUser(null);
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="App">
      <Routes>
        {/* مسارات المعلم (الواجهة الأساسية) */}
        <Route path="/" element={<TeacherDashboard />} />
        <Route path="/assessments" element={<DailyAssessmentReportPage />} /> 
        <Route path="/daily-assessment" element={<DailyAssessmentPage />} />
        <Route path="/weekly-report" element={<WeeklyReportPage />} />
        <Route path="/lessons-management" element={<LessonsManagementPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/student-assessments/:studentId" element={<StudentAssessmentsPage />} />
        <Route path="/add-parent-student" element={<AddParentPage />} />

        {/* مسارات ولي الأمر */}
        <Route 
          path="/parent" 
          element={
            parentUser ? 
            <ParentDashboard parentUser={parentUser} parentId={parentUser.id} onLogout={handleParentLogout} /> : 
            <ParentLogin onLogin={handleParentLogin} />
          } 
        />
        
        {/* مسار منفصل لتسجيل أولياء الأمور الجدد */}
        <Route path="/parent-registration" element={<AddParentPage />} />
        
        {/* مسار تسجيل الدخول لأولياء الأمور مع إمكانية تمرير البيانات */}
        <Route 
          path="/parent-login" 
          element={<ParentLogin onLogin={handleParentLogin} />} 
        />
      </Routes>
    </div>
  );
}

export default App;