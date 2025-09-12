// DailyAssessmentPage.jsx
import React, { useState } from 'react';
import DailyAssessmentForm from '../components/DailyAssessmentForm';
import Sidebar from '../components/Sidebar';
import '../styles/TeacherDashboard.css';

const DailyAssessmentPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab="daily-assessment" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="main-content">
        <div className="dashboard-header centered-header">
          <h1>صفحة التقييم اليومي</h1>
          <p>قيم طلابك بعد الحصة مباشرة</p>
        </div>
        <DailyAssessmentForm />
      </div>
    </div>
  );
};

export default DailyAssessmentPage;