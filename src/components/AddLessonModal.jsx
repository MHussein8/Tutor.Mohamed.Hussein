// AddLessonModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getCurrentTeacherId } from '../services/teacherService';
import '../styles/AddLessonModal.css';

const AddLessonModal = ({ isOpen, onClose, onLessonAdded, lesson }) => {
  const [gradeLevels, setGradeLevels] = useState([]);
  const [educationTypes, setEducationTypes] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    homework: '',
    content: '',
    lesson_date: new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    education_type_id: '',
    grade_level_id: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (lesson) {
        setFormData({
          ...lesson,
          homework: lesson.homework || '',
          start_time: lesson.start_time.slice(0, 5),
          end_time: lesson.end_time.slice(0, 5)
        });
      } else {
        setFormData({
          title: '',
          content: '',
          homework: '',
          lesson_date: new Date().toISOString().slice(0, 10),
          start_time: '',
          end_time: '',
          education_type_id: '',
          grade_level_id: ''
        });
      }
    }
  }, [isOpen, lesson]);

  const fetchInitialData = async () => {
    try {
      const { data: gradesData } = await supabase
        .from('grade_levels')
        .select('id, name')
        .order('name');
  
      const { data: typesData } = await supabase
        .from('group_types')
        .select('id, name')
        .order('name');
  
      setGradeLevels(gradesData || []);
      setEducationTypes(typesData || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentTeacherId = await getCurrentTeacherId();
      if (!currentTeacherId) {
        alert('خطأ في تحديد هوية المدرس');
        return;
      }

      const lessonData = {
        ...formData,
        lesson_date: formData.lesson_date,
        start_time: formData.start_time + ':00',
        end_time: formData.end_time + ':00',
        teacher_id: currentTeacherId
      };

      if (lesson) {
        // التحقق من أن الحصة تخص المدرس الحالي قبل التعديل
        const { data: existingLesson, error: checkError } = await supabase
          .from('lessons')
          .select('teacher_id')
          .eq('id', lesson.id)
          .single();

        if (checkError || existingLesson.teacher_id !== currentTeacherId) {
          alert('غير مصرح بتعديل هذه الحصة');
          return;
        }

        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', lesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lessons')
          .insert(lessonData);
        if (error) throw error;
      }
      onLessonAdded();
      onClose();
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('حدث خطأ أثناء حفظ الحصة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <h2>{lesson ? 'تعديل الحصة' : 'إضافة حصة جديدة'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>عنوان الحصة</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>وصف الحصة</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows="3"
            />
          </div>
          {/* 💥 التعديل رقم 4: إضافة حقل الواجب */}
          <div className="form-group">
            <label>الواجب المطلوب</label>
            <textarea
              value={formData.homework}
              onChange={(e) => setFormData({...formData, homework: e.target.value})}
              rows="3"
              placeholder="اكتب تفاصيل الواجب هنا..."
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>تاريخ الحصة</label>
              <input
                type="date"
                value={formData.lesson_date}
                onChange={(e) => setFormData({...formData, lesson_date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>بداية الحصة</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>نهاية الحصة</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>المستوى الدراسي</label>
              <select
                value={formData.grade_level_id}
                onChange={(e) => setFormData({...formData, grade_level_id: e.target.value})}
                required
              >
                <option value="">اختر المستوى</option>
                {gradeLevels.map(grade => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>نوع التعليم</label>
              <select
                value={formData.education_type_id}
                onChange={(e) => setFormData({...formData, education_type_id: e.target.value})}
                required
              >
                <option value="">اختر النوع</option>
                {educationTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الحفظ...' : (lesson ? 'تحديث' : 'إضافة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLessonModal;