// AddStudentModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import '../styles/AddStudentModal.css';

const AddStudentModal = ({ isOpen, onClose, onStudentAdded }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    education_type_id: '',
    grade_level_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [educationTypes, setEducationTypes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form on open
      setFormData({
        first_name: '',
        last_name: '',
        birth_date: '',
        education_type_id: '',
        grade_level_id: ''
      });
      setError('');
      setSuccess('');
      fetchDependencies();
    }
  }, [isOpen]);

  const fetchDependencies = async () => {
    try {
      // Fetch Grade Levels
      const { data: gradeData, error: gradeError } = await supabase
        .from('grade_levels')
        .select('id, name')
        .order('name');
      if (gradeError) throw gradeError;
      setGradeLevels(gradeData || []);

      // Fetch Education Types (using 'group_types' as per your original file)
      const { data: eduData, error: eduError } = await supabase
        .from('group_types')
        .select('id, name')
        .order('name');
      if (eduError) throw eduError;
      setEducationTypes(eduData || []);
    } catch (err) {
      console.error('Error fetching dependencies:', err.message);
      setError('فشل تحميل البيانات الأساسية.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Ensure required fields are filled
      if (!formData.first_name || !formData.last_name || !formData.education_type_id || !formData.grade_level_id) {
        setError('يرجى ملء جميع الحقول الإجبارية');
        setLoading(false);
        return;
      }
      
      const { data, error: insertError } = await supabase
        .from('students')
        .insert([{
          ...formData,
          birth_date: formData.birth_date || null
        }])
        .select(`*, grade_levels (name)`);

      if (insertError) {
        console.error('تفاصيل الخطأ:', insertError);
        throw insertError;
      }

      setSuccess('تم إضافة الطالب بنجاح!');
      if (onStudentAdded && data && data.length > 0) {
        onStudentAdded(data[0]);
      }
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error adding student:', err.message);
      setError(`خطأ في الإضافة: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay simple-style" onClick={onClose}>
      <div className="modal-content simple-style" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header simple-style">
          <h2>إضافة طالب جديد</h2>
          <button className="close-button simple-style" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="student-form simple-style">
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <div className="form-group simple-style">
            <label htmlFor="firstName">الاسم الأول *:</label>
            <input
              type="text"
              id="firstName"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group simple-style">
            <label htmlFor="lastName">الاسم الأخير *:</label>
            <input
              type="text"
              id="lastName"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group simple-style">
            <label htmlFor="birthDate">تاريخ الميلاد:</label>
            <input
              type="date"
              id="birthDate"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group simple-style">
            <label htmlFor="educationType">نوع التعليم *:</label>
            <select
              id="educationType"
              name="education_type_id"
              value={formData.education_type_id}
              onChange={handleChange}
              required
            >
              <option value="">اختر النوع</option>
              {educationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group simple-style">
            <label htmlFor="gradeLevel">المرحلة الدراسية *:</label>
            <select
              id="gradeLevel"
              name="grade_level_id"
              value={formData.grade_level_id}
              onChange={handleChange}
              required
            >
              <option value="">اختر المرحلة</option>
              {gradeLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions simple-style">
            <button type="button" className="btn-secondary simple-style" onClick={onClose} disabled={loading}>
              إلغاء
            </button>
            <button type="submit" className="btn-primary simple-style" disabled={loading}>
              {loading ? 'جاري الإضافة...' : 'إضافة طالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;