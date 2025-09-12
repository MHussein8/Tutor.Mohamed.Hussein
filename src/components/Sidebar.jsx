import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/TeacherDashboard.css';

const Sidebar = ({ activeTab, isSidebarOpen, setIsSidebarOpen }) => {
  const sidebarRef = useRef(null);
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊', path: '/' },
    { id: 'students', label: 'الطلاب', icon: '👨‍🎓', path: '/students' },
    { id: 'assessments', label: 'التقييمات', icon: '📝', path: '/assessments' },
    { id: 'classes', label: 'الحصص', icon: '🏫', path: '/lessons-management' },
    { id: 'reports', label: 'التقرير الاسبوعي', icon: '📋', path: '/weekly-report' },
    { id: 'daily-assessment', label: 'تقييم يومي', icon: '✍️', path: '/daily-assessment' },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // إغلاق السايدبار عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          !event.target.classList.contains('toggle-btn')) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  return (
    <>
      <div 
        ref={sidebarRef} 
        className={`sidebar-component ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
      >
        <div className="sidebar-logo">
          <span className="logo-text">نظام المعلم</span>
        </div>
        
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li 
                key={item.id} 
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <Link 
                  to={item.path} 
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '18px' }}
                  onClick={() => window.innerWidth <= 1024 && setIsSidebarOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      <button onClick={toggleSidebar} className="toggle-btn">
        {isSidebarOpen ? '◀' : '▶'}
      </button>
    </>
  );
};

export default Sidebar;