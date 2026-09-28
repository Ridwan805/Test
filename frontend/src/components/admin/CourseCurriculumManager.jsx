import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import ContentRenderer from '../lesson/ContentRenderer';
import './CourseCurriculumManager.css';

export default function CourseCurriculumManager({ courseId, initialOpenAddModule = false, onBack, onCourseUpdated }) {
  // Main view modes: 'curriculum' (Modules List) | 'module' (Dedicated Module View) | 'lesson_builder' (Visual Lesson Editor)
  const [activeTab, setActiveTab] = useState('curriculum'); // 'overview' | 'curriculum' | 'students' | 'resources' | 'analytics' | 'settings'
  const [viewMode, setViewMode] = useState('curriculum');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [curriculumSummary, setCurriculumSummary] = useState(null);
  const [modules, setModules] = useState([]);

  // Active / Selected Module & Lessons
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedModuleDetail, setSelectedModuleDetail] = useState(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleLessons, setModuleLessons] = useState([]);

  // Action Menu Dropdown (Module ID currently open)
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Add / Edit Module Modal
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleModalMode, setModuleModalMode] = useState('create'); // 'create' | 'edit'
  const [moduleFormData, setModuleFormData] = useState({
    id: null,
    title: '',
    moduleNumber: 1,
    slug: '',
    description: '',
    status: 'draft',
    estimatedMinutes: 60,
    thumbnail: ''
  });
  const [moduleValidationErrors, setModuleValidationErrors] = useState(null);
  const [savingModule, setSavingModule] = useState(false);

  // Delete / Archive Module Modal
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState(null);
  const [deletingModule, setDeletingModule] = useState(false);

  // Lesson Builder State
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    slug: '',
    lessonNumber: 1,
    estimatedMinutes: 15,
    description: '',
    published: true,
    content: []
  });
  const [lessonDirty, setLessonDirty] = useState(false);
  const [lessonValidationErrors, setLessonValidationErrors] = useState(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonSaveStatus, setLessonSaveStatus] = useState(null);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Content Block Inserter
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [insertBlockIndex, setInsertBlockIndex] = useState(null);

  // Student Preview Modal State
  const [previewMode, setPreviewMode] = useState(null); // 'course' | 'module' | 'lesson' | null
  const [previewData, setPreviewData] = useState(null);

  // Drag & Drop State
  const [draggedModuleIndex, setDraggedModuleIndex] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper to generate slug from title
  const generateSlug = (text) => {
    return (text || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // 1. Fetch Course Modules & Summary
  const fetchCourseModules = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/admin/courses/${courseId}/modules`);
      if (!res.ok) throw new Error('We couldn\'t load the Course curriculum.');
      const data = await res.json();
      setCourseData(data.course);
      setCurriculumSummary(data.summary);
      setModules(data.modules || []);
    } catch (err) {
      console.error('Fetch Course Modules Error:', err);
      setError(err.message || 'Failed to load course modules.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseModules();
  }, [fetchCourseModules]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.module-card-actions')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // 2. Fetch Selected Module Detail & Lessons
  const fetchModuleDetail = useCallback(async (modId) => {
    if (!courseId || !modId) return;
    setModuleLoading(true);
    try {
      const res = await apiFetch(`/api/admin/courses/${courseId}/modules/${modId}`);
      if (!res.ok) throw new Error('Failed to load module details.');
      const data = await res.json();
      setSelectedModuleDetail(data.module);
      setModuleLessons(data.lessons || []);
    } catch (err) {
      console.error('Fetch Module Detail Error:', err);
      showToast('Could not load module lessons.', 'error');
    } finally {
      setModuleLoading(false);
    }
  }, [courseId]);

  // Navigate to Dedicated Module Manager
  const handleOpenManageModule = (mod) => {
    setSelectedModuleId(mod.id);
    setSelectedModuleDetail(mod);
    fetchModuleDetail(mod.id);
    setViewMode('module');
  };

  // ============================================================================
  // MODULE CRUD & ACTIONS
  // ============================================================================

  // Open Add Module Modal
  const handleOpenAddModule = () => {
    const nextNum = modules.length + 1;
    setModuleModalMode('create');
    setModuleFormData({
      id: null,
      title: '',
      moduleNumber: nextNum,
      slug: `module-${nextNum}`,
      description: '',
      status: 'draft',
      estimatedMinutes: 60,
      thumbnail: ''
    });
    setModuleValidationErrors(null);
    setShowModuleModal(true);
  };

  useEffect(() => {
    if (initialOpenAddModule && !loading) {
      handleOpenAddModule();
    }
  }, [initialOpenAddModule, loading]);

  // Open Edit Module Modal
  const handleOpenEditModule = (mod) => {
    setModuleModalMode('edit');
    setModuleFormData({
      id: mod.id,
      title: mod.title,
      moduleNumber: mod.moduleNumber,
      slug: mod.slug || `module-${mod.moduleNumber}`,
      description: mod.description || '',
      status: mod.status || (mod.published ? 'published' : 'draft'),
      estimatedMinutes: mod.estimatedMinutes || 60,
      thumbnail: mod.thumbnail || ''
    });
    setModuleValidationErrors(null);
    setShowModuleModal(true);
    setOpenActionMenuId(null);
  };

  // Submit Module Form (Create or Edit)
  const handleSaveModuleForm = async (e) => {
    e.preventDefault();
    setModuleValidationErrors(null);

    if (!moduleFormData.title.trim()) {
      setModuleValidationErrors(['Module Title is required.']);
      return;
    }

    setSavingModule(true);
    try {
      let res;
      if (moduleModalMode === 'create') {
        res = await apiFetch(`/api/admin/courses/${courseId}/modules`, {
          method: 'POST',
          body: JSON.stringify(moduleFormData)
        });
      } else {
        res = await apiFetch(`/api/admin/courses/${courseId}/modules/${moduleFormData.id}`, {
          method: 'PUT',
          body: JSON.stringify(moduleFormData)
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        if (resData.errors && Array.isArray(resData.errors)) {
          setModuleValidationErrors(resData.errors);
        } else {
          setModuleValidationErrors([resData.detail || 'Failed to save module.']);
        }
        setSavingModule(false);
        return;
      }

      showToast(moduleModalMode === 'create' ? 'Module created successfully!' : 'Module updated successfully!');
      setShowModuleModal(false);
      await fetchCourseModules();

      if (moduleModalMode === 'create' && resData.module) {
        // Redirect Admin directly to the new Module's manager
        handleOpenManageModule(resData.module);
      } else if (selectedModuleId && moduleFormData.id === selectedModuleId) {
        fetchModuleDetail(selectedModuleId);
      }
    } catch (err) {
      console.error('Save Module Error:', err);
      setModuleValidationErrors([err.message || 'An unexpected server error occurred.']);
    } finally {
      setSavingModule(false);
    }
  };

  // Toggle Publish / Unpublish Module directly
  const handleTogglePublishModule = async (mod) => {
    const isCurrentlyPublished = mod.status === 'published' || mod.published;
    const targetStatus = isCurrentlyPublished ? 'draft' : 'published';

    try {
      const res = await apiFetch(`/api/admin/courses/${courseId}/modules/${mod.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: targetStatus,
          published: !isCurrentlyPublished
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        if (resData.errors) {
          alert(`Cannot publish Module:\n• ${resData.errors.join('\n• ')}`);
        } else {
          alert(resData.detail || 'Failed to change module publication state.');
        }
        return;
      }

      showToast(isCurrentlyPublished ? 'Module unpublished (now Draft).' : 'Module published successfully!');
      await fetchCourseModules();
      if (selectedModuleId === mod.id) {
        fetchModuleDetail(mod.id);
      }
    } catch (err) {
      console.error('Toggle Publish Error:', err);
      alert('Network error updating publish state.');
    }
    setOpenActionMenuId(null);
  };

  // Duplicate Module
  const handleDuplicateModule = async (mod) => {
    try {
      const res = await apiFetch(`/api/admin/courses/${courseId}/modules/${mod.id}/duplicate`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to duplicate module.');
      showToast('Module duplicated as Draft (student progress omitted).');
      await fetchCourseModules();
    } catch (err) {
      console.error('Duplicate Module Error:', err);
      showToast(err.message, 'error');
    }
    setOpenActionMenuId(null);
  };

  // Move Module Up / Down
  const handleMoveModuleOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const reordered = [...modules];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setModules(reordered);

    try {
      const res = await apiFetch(`/api/admin/courses/${courseId}/modules-reorder`, {
        method: 'PUT',
        body: JSON.stringify({
          moduleIds: reordered.map((m) => m.id)
        })
      });
      if (!res.ok) throw new Error('Failed to persist module reordering.');
      showToast('Module order updated.');
      await fetchCourseModules();
    } catch (err) {
      console.error('Reorder Error:', err);
      showToast('Failed to save new order to database.', 'error');
      fetchCourseModules();
    }
    setOpenActionMenuId(null);
  };

  // HTML5 Drag and Drop Reordering
  const handleDragStart = (index) => {
    setDraggedModuleIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = async (index) => {
    if (draggedModuleIndex === null || draggedModuleIndex === index) return;

    const reordered = [...modules];
    const [moved] = reordered.splice(draggedModuleIndex, 1);
    reordered.splice(index, 0, moved);

    setModules(reordered);
    setDraggedModuleIndex(null);

    try {
      const res = await apiFetch(`/api/admin/courses/${courseId}/modules-reorder`, {
        method: 'PUT',
        body: JSON.stringify({
          moduleIds: reordered.map((m) => m.id)
        })
      });
      if (!res.ok) throw new Error('Failed to save drag order.');
      showToast('Modules reordered successfully.');
      await fetchCourseModules();
    } catch (err) {
      console.error('Drag Drop Error:', err);
      showToast('Could not save reorder.', 'error');
      fetchCourseModules();
    }
  };

  // Open Safe Delete / Archive Confirmation
  const handlePromptDeleteModule = (mod) => {
    setModuleToDelete(mod);
    const hasItems = (mod.lessonsCount && mod.lessonsCount > 0) || mod.hasStudentProgress;
    setDeleteWarning(
      hasItems
        ? {
            isSafe: false,
            message:
              'This module already contains lessons or scholar progress. Archiving is strongly recommended to preserve historical curriculum data.'
          }
        : {
            isSafe: true,
            message: 'This module is empty. Deleting it will permanently remove it from the course.'
          }
    );
    setOpenActionMenuId(null);
  };

  // Confirm Archive
  const handleConfirmArchiveModule = async () => {
    if (!moduleToDelete) return;
    setDeletingModule(true);
    try {
      const res = await apiFetch(
        `/api/admin/courses/${courseId}/modules/${moduleToDelete.id}?archive=true`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to archive module.');
      showToast('Module safely archived.');
      setModuleToDelete(null);
      await fetchCourseModules();
      if (viewMode === 'module' && selectedModuleId === moduleToDelete.id) {
        setViewMode('curriculum');
      }
    } catch (err) {
      console.error('Archive Error:', err);
      showToast(err.message, 'error');
    } finally {
      setDeletingModule(false);
    }
  };

  // Confirm Permanent Delete
  const handleConfirmPermanentDeleteModule = async () => {
    if (!moduleToDelete) return;
    setDeletingModule(true);
    try {
      const res = await apiFetch(
        `/api/admin/courses/${courseId}/modules/${moduleToDelete.id}?force=true`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete module.');
      showToast('Module permanently deleted.');
      setModuleToDelete(null);
      await fetchCourseModules();
      if (viewMode === 'module' && selectedModuleId === moduleToDelete.id) {
        setViewMode('curriculum');
      }
    } catch (err) {
      console.error('Delete Error:', err);
      showToast(err.message, 'error');
    } finally {
      setDeletingModule(false);
    }
  };

  // ============================================================================
  // LESSON MANAGEMENT INSIDE MODULE
  // ============================================================================

  // Open Lesson Builder for Creating a New Lesson
  const handleOpenAddLesson = () => {
    const nextNum = moduleLessons.length + 1;
    setEditingLessonId(null);
    setLessonFormData({
      title: '',
      slug: `lesson-${nextNum}`,
      lessonNumber: nextNum,
      estimatedMinutes: 15,
      description: '',
      published: true,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Core Theoretical Formulation'
        },
        {
          type: 'paragraph',
          text: 'Introduce the conceptual foundation and underlying economic intuition for this lesson.'
        }
      ]
    });
    setLessonDirty(false);
    setLessonValidationErrors(null);
    setViewMode('lesson_builder');
  };

  // Open Lesson Builder for Editing an Existing Lesson
  const handleOpenEditLesson = (lesson) => {
    setEditingLessonId(lesson.id);
    setLessonFormData({
      title: lesson.title,
      slug: lesson.slug,
      lessonNumber: lesson.lessonNumber,
      estimatedMinutes: lesson.estimatedMinutes || 15,
      description: lesson.description || '',
      published: Boolean(lesson.published),
      content: Array.isArray(lesson.content) ? JSON.parse(JSON.stringify(lesson.content)) : []
    });
    setLessonDirty(false);
    setLessonValidationErrors(null);
    setViewMode('lesson_builder');
  };

  // Block Content Mutators
  const updateBlockField = (index, field, value) => {
    setLessonFormData((prev) => {
      const copy = [...prev.content];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, content: copy };
    });
    setLessonDirty(true);
  };

  const moveBlock = (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= lessonFormData.content.length) return;

    setLessonFormData((prev) => {
      const copy = [...prev.content];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return { ...prev, content: copy };
    });
    setLessonDirty(true);
  };

  const duplicateBlock = (index) => {
    setLessonFormData((prev) => {
      const copy = [...prev.content];
      const clone = JSON.parse(JSON.stringify(copy[index]));
      copy.splice(index + 1, 0, clone);
      return { ...prev, content: copy };
    });
    setLessonDirty(true);
  };

  const deleteBlock = (index) => {
    setLessonFormData((prev) => ({
      ...prev,
      content: prev.content.filter((_, idx) => idx !== index)
    }));
    setLessonDirty(true);
  };

  // Insert Categorized Content Block
  const handleAddBlockSelected = (type) => {
    let newBlock = { type };

    switch (type) {
      // TEXT
      case 'heading':
        newBlock = { type: 'heading', level: 2, text: 'New Academic Section' };
        break;
      case 'paragraph':
        newBlock = { type: 'paragraph', text: 'Enter detailed explanations, empirical references, and commentary.' };
        break;
      case 'list':
        newBlock = { type: 'list', items: ['First key principle', 'Second key principle', 'Empirical implication'] };
        break;
      case 'table':
        newBlock = {
          type: 'table',
          title: 'Comparative Framework',
          headers: ['Construct', 'Notation', 'Economic Meaning'],
          rows: [
            ['Utility', 'U(x)', 'Satisfaction level from bundle x'],
            ['Marginal Utility', 'MU(x)', 'Change in utility per unit delta']
          ]
        };
        break;

      // ACADEMIC
      case 'equation':
        newBlock = {
          type: 'equation',
          title: 'First-Order Optimality Condition',
          formula: 'max_{x} U(x) \\quad \\text{s.t.} \\quad p \\cdot x \\le w',
          label: 'Eq. 1.1',
          explanation: 'Marginal rate of substitution equals price ratio at interior optimum.'
        };
        break;
      case 'definition':
        newBlock = {
          type: 'definition',
          title: 'Pareto Efficiency',
          term: 'Pareto Optimum',
          definition: 'An allocation where no consumer can be made better off without making another consumer worse off.'
        };
        break;
      case 'derivation':
        newBlock = {
          type: 'derivation',
          title: 'Derivation of Marshallian Demand',
          steps: [
            'Set up Lagrangian: L = U(x, y) - lambda * (p_x * x + p_y * y - w)',
            'Take first-order conditions with respect to x and y',
            'Equate MRS to price ratio: MU_x / MU_y = p_x / p_y',
            'Substitute back into budget constraint to solve for x*(p, w)'
          ]
        };
        break;
      case 'example':
        newBlock = {
          type: 'example',
          title: 'Application: Cobb-Douglas Utility',
          text: 'Given U(x, y) = x^alpha * y^(1 - alpha), expenditure share on good x is strictly equal to alpha.'
        };
        break;
      case 'summary':
        newBlock = {
          type: 'summary',
          title: 'Key Mathematical Takeaways',
          items: [
            'Demand is homogeneous of degree zero in prices and wealth.',
            'Walras Law holds with strictly monotonic preferences.',
            'Substitution effects are negative semi-definite.'
          ]
        };
        break;
      case 'note':
        newBlock = {
          type: 'note',
          title: 'Theoretical Insight',
          text: 'Notice that monotonic transformations preserve preference orderings and ordinal indifference curves.'
        };
        break;
      case 'warning':
        newBlock = {
          type: 'warning',
          title: 'Analytical Pitfall',
          text: 'Ensure non-satiation holds before applying the Kuhn-Tucker equality condition.'
        };
        break;

      // MEDIA
      case 'image':
        newBlock = {
          type: 'image',
          title: 'Consumer Equilibrium Diagram',
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
          caption: 'Figure 1: Tangency between highest attainable indifference curve and budget line.'
        };
        break;
      case 'video':
        newBlock = {
          type: 'video',
          title: 'Lecture Video: Microeconomic Foundations',
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        };
        break;
      case 'link':
        newBlock = {
          type: 'link',
          title: 'NBER Working Paper Series',
          text: 'Read foundational empirical estimates on consumer elasticity.',
          url: 'https://www.nber.org'
        };
        break;

      // INTERACTIVE
      case 'checkpoint': // Practice Activity / Knowledge Check
        newBlock = {
          type: 'checkpoint',
          title: 'Comprehension Check: Consumer Optimum',
          instructions: 'What happens to the Marshallian demand for good X if both prices and income double simultaneously?',
          code: '# Python verification:\ndef test_homogeneity(p, w, factor=2):\n    # Homogeneous of degree 0:\n    return (w / p) == (factor * w) / (factor * p)\n\nprint("Holds:", test_homogeneity(10, 100))',
          ungraded: true
        };
        break;
      default:
        newBlock = { type: 'paragraph', text: '' };
        break;
    }

    setLessonFormData((prev) => {
      const copy = [...prev.content];
      if (insertBlockIndex !== null && insertBlockIndex >= 0) {
        copy.splice(insertBlockIndex + 1, 0, newBlock);
      } else {
        copy.push(newBlock);
      }
      return { ...prev, content: copy };
    });

    setShowBlockMenu(false);
    setInsertBlockIndex(null);
    setLessonDirty(true);
  };

  // Save Lesson (Draft or Published)
  const handleSaveLesson = async (isPublishing = false) => {
    setLessonValidationErrors(null);

    if (!lessonFormData.title.trim()) {
      setLessonValidationErrors(['Lesson Title is required.']);
      return;
    }

    if (isPublishing && (!lessonFormData.content || lessonFormData.content.length === 0)) {
      setLessonValidationErrors(['At least one content block is required to publish a lesson.']);
      return;
    }

    setSavingLesson(true);
    setLessonSaveStatus('saving');

    const payload = {
      ...lessonFormData,
      published: isPublishing
    };

    try {
      let res;
      if (editingLessonId) {
        res = await apiFetch(`/api/admin/lessons/${editingLessonId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch(`/api/admin/modules/${selectedModuleId}/lessons`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        if (resData.errors) setLessonValidationErrors(resData.errors);
        else setLessonValidationErrors([resData.detail || 'Failed to save lesson.']);
        setLessonSaveStatus(null);
        return;
      }

      setLessonDirty(false);
      setLessonSaveStatus('saved');
      setLastSavedTime(new Date());
      showToast(isPublishing ? 'Lesson published successfully!' : 'Lesson draft saved.');

      // Refresh module lessons list
      await fetchModuleDetail(selectedModuleId);
      await fetchCourseModules();

      if (!editingLessonId && resData.lesson) {
        setEditingLessonId(resData.lesson._id || resData.lesson.id);
      }
    } catch (err) {
      console.error('Save Lesson Error:', err);
      setLessonValidationErrors([err.message || 'Server error saving lesson.']);
      setLessonSaveStatus(null);
    } finally {
      setSavingLesson(false);
    }
  };

  // Reorder Lessons Inside Module
  const handleMoveLessonOrder = async (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= moduleLessons.length) return;

    const reordered = [...moduleLessons];
    const temp = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = temp;

    setModuleLessons(reordered);

    try {
      const res = await apiFetch(`/api/admin/modules/${selectedModuleId}/lessons/reorder`, {
        method: 'PUT',
        body: JSON.stringify({
          lessonIds: reordered.map((l) => l.id)
        })
      });
      if (!res.ok) throw new Error('Failed to save lesson order.');
      showToast('Lessons reordered.');
      await fetchModuleDetail(selectedModuleId);
    } catch (err) {
      console.error('Reorder Lessons Error:', err);
      showToast('Could not save lesson order.', 'error');
      fetchModuleDetail(selectedModuleId);
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Delete this lesson permanently?')) return;
    try {
      const res = await apiFetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete lesson.');
      showToast('Lesson deleted.');
      await fetchModuleDetail(selectedModuleId);
      await fetchCourseModules();
    } catch (err) {
      console.error('Delete Lesson Error:', err);
      showToast(err.message, 'error');
    }
  };

  // Exit Guard when dirty
  const handleSafelyLeaveLessonBuilder = () => {
    if (lessonDirty) {
      if (!window.confirm('You have unsaved changes in this lesson. Leave without saving?')) {
        return;
      }
    }
    setViewMode('module');
  };

  // ============================================================================
  // STUDENT PREVIEWS
  // ============================================================================

  const handleOpenStudentPreview = (type, data) => {
    setPreviewMode(type);
    setPreviewData(data);
  };

  const handleCloseStudentPreview = () => {
    setPreviewMode(null);
    setPreviewData(null);
  };

  // Format relative saved time
  const formattedLastSaved = useMemo(() => {
    if (!lastSavedTime) return 'Not yet saved';
    return `Saved at ${lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [lastSavedTime]);

  // ============================================================================
  // RENDER: LOADING & ERROR STATES
  // ============================================================================

  if (loading && !courseData) {
    return (
      <div className="course-curriculum-manager">
        <div className="course-mgr-header-bar">
          <div className="course-mgr-breadcrumb">
            <button type="button" className="btn-back" onClick={onBack}>← Back to Courses</button>
            <span>/</span>
            <span className="crumb-title">Loading Course Curriculum...</span>
          </div>
        </div>
        <div className="skeleton-module-card">
          <div className="skeleton-shimmer" style={{ width: '40%', height: '24px' }} />
          <div className="skeleton-shimmer" style={{ width: '80%', height: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '25%', height: '20px' }} />
        </div>
        <div className="skeleton-module-card">
          <div className="skeleton-shimmer" style={{ width: '45%', height: '24px' }} />
          <div className="skeleton-shimmer" style={{ width: '70%', height: '16px' }} />
          <div className="skeleton-shimmer" style={{ width: '25%', height: '20px' }} />
        </div>
      </div>
    );
  }

  if (error && !courseData) {
    return (
      <div className="course-curriculum-manager">
        <div className="curriculum-empty-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <span className="empty-icon">⚠️</span>
          <h3 className="empty-title">We couldn't load the Course curriculum.</h3>
          <p className="empty-sub">{error}</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-admin-gold" onClick={fetchCourseModules}>
              Try Again
            </button>
            <button type="button" className="btn-admin-slate" onClick={onBack}>
              ← Back to Courses List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-curriculum-manager">
      {/* Toast Feedback */}
      {toast && (
        <div className={`admin-floating-toast ${toast.type}`}>
          {toast.type === 'error' ? '⚠️ ' : '✓ '} {toast.message}
        </div>
      )}

      {/* Course Header & Breadcrumbs */}
      <div className="course-mgr-header-bar">
        <div className="course-mgr-breadcrumb">
          <button type="button" className="btn-back" onClick={onBack}>
            ← Back to Courses
          </button>
          <span>/</span>
          <span className="crumb-title">{courseData?.title || 'Academic Course'}</span>
          {viewMode === 'module' && selectedModuleDetail && (
            <>
              <span>/</span>
              <span className="crumb-title">Module {selectedModuleDetail.moduleNumber} — {selectedModuleDetail.title}</span>
            </>
          )}
          {viewMode === 'lesson_builder' && (
            <>
              <span>/</span>
              <span className="crumb-title">
                {editingLessonId ? `Edit: ${lessonFormData.title || 'Lesson'}` : 'New Lesson'}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-admin-slate"
            onClick={() => handleOpenStudentPreview('course', { course: courseData, modules })}
            title="Preview how scholars see the syllabus"
          >
            👁️ Preview Course Syllabus ↗
          </button>
        </div>
      </div>

      {/* Course Title & Tagline */}
      <div className="course-mgr-title-row">
        <div>
          <h2 className="course-mgr-title">{courseData?.title}</h2>
          <p className="course-mgr-subtitle">
            Academic Course • {courseData?.level || 'Intermediate'} • Self-Paced Scholar Curriculum
          </p>
        </div>
      </div>

      {/* Course Management Tabs */}
      <div className="course-admin-tabs-nav" role="tablist">
        <button
          type="button"
          className={`course-admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => { setActiveTab('overview'); setViewMode('curriculum'); }}
        >
          <span>📊</span> Overview
        </button>
        <button
          type="button"
          className={`course-admin-tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
          onClick={() => { setActiveTab('curriculum'); setViewMode('curriculum'); }}
        >
          <span>📚</span> Curriculum
          <span className="tab-badge-pill">{curriculumSummary?.totalModules || modules.length}</span>
        </button>
        <button
          type="button"
          className={`course-admin-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => { setActiveTab('students'); setViewMode('curriculum'); }}
        >
          <span>👥</span> Students
        </button>
        <button
          type="button"
          className={`course-admin-tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => { setActiveTab('resources'); setViewMode('curriculum'); }}
        >
          <span>📑</span> Resources
        </button>
        <button
          type="button"
          className={`course-admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => { setActiveTab('analytics'); setViewMode('curriculum'); }}
        >
          <span>📈</span> Analytics
        </button>
        <button
          type="button"
          className={`course-admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); setViewMode('curriculum'); }}
        >
          <span>⚙️</span> Settings
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB: OVERVIEW */}
      {/* ==================================================================== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="curriculum-summary-banner">
            <div className="curriculum-metrics-grid">
              <div className="curriculum-metric-item">
                <span className="metric-label">Course Status</span>
                <span className={`metric-val ${courseData?.published ? 'published' : 'draft'}`}>
                  {courseData?.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="curriculum-metric-item">
                <span className="metric-label">Academic Level</span>
                <span className="metric-val">{courseData?.level || 'Intermediate'}</span>
              </div>
              <div className="curriculum-metric-item">
                <span className="metric-label">Access Model</span>
                <span className="metric-val" style={{ color: '#34d399' }}>Free Access</span>
              </div>
              <div className="curriculum-metric-item">
                <span className="metric-label">Total Modules</span>
                <span className="metric-val">{modules.length}</span>
              </div>
              <div className="curriculum-metric-item">
                <span className="metric-label">Total Lessons</span>
                <span className="metric-val">{curriculumSummary?.totalLessons || 0}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn-add-module"
              onClick={() => { setActiveTab('curriculum'); setViewMode('curriculum'); }}
            >
              Manage Curriculum Modules →
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: STUDENTS, RESOURCES, ANALYTICS, SETTINGS PLACEHOLDERS */}
      {/* ==================================================================== */}
      {activeTab === 'students' && (
        <div className="curriculum-empty-card">
          <span className="empty-icon">👥</span>
          <h3 className="empty-title">Course Scholars & Enrollment Directory</h3>
          <p className="empty-sub">
            11 active scholars are currently enrolled in {courseData?.title}. Scholar progress is updated as lessons are completed.
          </p>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="curriculum-empty-card">
          <span className="empty-icon">📑</span>
          <h3 className="empty-title">Course Handouts & Reading Lists</h3>
          <p className="empty-sub">
            Attach academic papers, downloadable PDF syllabi, and reference datasets to this course.
          </p>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="curriculum-empty-card">
          <span className="empty-icon">📈</span>
          <h3 className="empty-title">Course Completion Analytics</h3>
          <p className="empty-sub">
            Average lesson completion rate is 68%. Self-paced progress tracks completion of required lessons.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="module-lessons-section">
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Course Settings</h3>
          <div className="admin-form-group">
            <label className="admin-form-label">Course Title</label>
            <input className="admin-form-input" value={courseData?.title || ''} readOnly />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Course Slug</label>
            <input className="admin-form-input" value={courseData?.slug || ''} readOnly />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Grading & Progression Rule</label>
            <p className="admin-form-hint" style={{ color: '#94a3b8' }}>
              Standard Academic Course: Completed lessons count directly towards course completion. Bootcamp assessment gates (80% homework/quiz weighting) are NOT applied to this course.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: CURRICULUM — VIEW 1: MODULES LIST */}
      {/* ==================================================================== */}
      {activeTab === 'curriculum' && viewMode === 'curriculum' && (
        <>
          {/* Curriculum KPI Summary Bar */}
          <div className="curriculum-summary-banner">
            <div className="curriculum-metrics-grid">
              <div className="curriculum-metric-item">
                <span className="metric-label">Modules</span>
                <span className="metric-val">{curriculumSummary?.totalModules || modules.length}</span>
              </div>
              <div className="curriculum-metric-item">
                <span className="metric-label">Published</span>
                <span className="metric-val published">{curriculumSummary?.publishedModules || 0}</span>
              </div>
              <div className="curriculum-metric-item">
                <span className="metric-label">Draft</span>
                <span className="metric-val draft">{curriculumSummary?.draftModules || 0}</span>
              </div>
              <div className="curriculum-metric-item">
                <span className="metric-label">Lessons</span>
                <span className="metric-val">{curriculumSummary?.totalLessons || 0}</span>
              </div>
              <div className="curriculum-metric-item">
                <span className="metric-label">Estimated Duration</span>
                <span className="metric-val">
                  {curriculumSummary?.estimatedDurationHours
                    ? `~${curriculumSummary.estimatedDurationHours} hrs`
                    : '—'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-add-module"
              onClick={handleOpenAddModule}
            >
              <span>+</span> Add Module
            </button>
          </div>

          {/* Empty State */}
          {modules.length === 0 ? (
            <div className="curriculum-empty-card">
              <span className="empty-icon">📖</span>
              <h3 className="empty-title">No modules yet.</h3>
              <p className="empty-sub">
                Build the Course curriculum by creating the first Module. Add lessons, academic derivations, and knowledge checks.
              </p>
              <button
                type="button"
                className="btn-add-module"
                style={{ marginTop: '0.5rem' }}
                onClick={handleOpenAddModule}
              >
                + Add First Module
              </button>
            </div>
          ) : (
            /* Module Cards Deck */
            <div className="modules-deck-container">
              {modules.map((mod, idx) => {
                const isPublished = mod.status === 'published' || mod.published;
                const isArchived = mod.status === 'archived';
                const statusLabel = isArchived ? 'Archived' : (isPublished ? 'Published' : 'Draft');
                const statusClass = isArchived ? 'archived' : (isPublished ? 'published' : 'draft');
                const isFirst = idx === 0;
                const isLast = idx === modules.length - 1;

                return (
                  <div
                    key={mod.id || idx}
                    className="course-module-admin-card"
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                  >
                    <div className="module-card-header-row">
                      <div className="module-header-left">
                        <span className="drag-handle-grip" title="Drag to reorder">≡</span>
                        <span className="module-number-pill">MODULE {mod.moduleNumber || idx + 1}</span>
                        <span className={`module-status-pill ${statusClass}`}>{statusLabel}</span>
                      </div>

                      <div className="module-card-actions">
                        <button
                          type="button"
                          className="btn-mod-action"
                          onClick={() => handleOpenStudentPreview('module', mod)}
                          title="Preview module syllabus as student"
                        >
                          👁️ Preview
                        </button>
                        <button
                          type="button"
                          className="btn-mod-action primary"
                          onClick={() => handleOpenManageModule(mod)}
                        >
                          Manage Module →
                        </button>
                        <button
                          type="button"
                          className="btn-mod-menu"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenuId(openActionMenuId === mod.id ? null : mod.id);
                          }}
                          aria-label="Module options"
                        >
                          •••
                        </button>

                        {/* Dropdown Menu */}
                        {openActionMenuId === mod.id && (
                          <div className="module-dropdown-menu">
                            <button
                              type="button"
                              className="menu-item-btn"
                              onClick={() => handleOpenEditModule(mod)}
                            >
                              ✏️ Edit Module
                            </button>
                            <button
                              type="button"
                              className="menu-item-btn"
                              onClick={() => {
                                handleOpenStudentPreview('module', mod);
                                setOpenActionMenuId(null);
                              }}
                            >
                              👁️ Preview as Student
                            </button>
                            <button
                              type="button"
                              className="menu-item-btn"
                              onClick={() => handleDuplicateModule(mod)}
                            >
                              📋 Duplicate Module
                            </button>

                            <div className="menu-divider" />

                            <button
                              type="button"
                              className="menu-item-btn"
                              disabled={isFirst}
                              onClick={() => handleMoveModuleOrder(idx, 'up')}
                              style={isFirst ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                            >
                              ↑ Move Up
                            </button>
                            <button
                              type="button"
                              className="menu-item-btn"
                              disabled={isLast}
                              onClick={() => handleMoveModuleOrder(idx, 'down')}
                              style={isLast ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                            >
                              ↓ Move Down
                            </button>

                            <div className="menu-divider" />

                            <button
                              type="button"
                              className="menu-item-btn"
                              onClick={() => handleTogglePublishModule(mod)}
                            >
                              {isPublished ? '⏸️ Unpublish (Draft)' : '🚀 Publish Module'}
                            </button>
                            <button
                              type="button"
                              className="menu-item-btn"
                              onClick={() => handlePromptDeleteModule(mod)}
                            >
                              📦 Archive Module
                            </button>
                            <button
                              type="button"
                              className="menu-item-btn destructive"
                              onClick={() => handlePromptDeleteModule(mod)}
                            >
                              🗑️ Delete Module
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="module-card-body">
                      <h3 className="module-card-title">{mod.title}</h3>
                      {mod.description ? (
                        <p className="module-card-desc">{mod.description}</p>
                      ) : (
                        <p className="module-card-desc" style={{ fontStyle: 'italic', opacity: 0.6 }}>
                          No description provided.
                        </p>
                      )}
                    </div>

                    <div className="module-card-footer-row">
                      <div className="module-meta-info">
                        <span className="module-meta-item">
                          📚 {mod.lessonsCount || 0} Lessons
                        </span>
                        <span>•</span>
                        <span className="module-meta-item">
                          ⏱️ {mod.estimatedMinutes ? `~${Math.round(mod.estimatedMinutes / 60 * 10) / 10}h (${mod.estimatedMinutes}m)` : 'Flexible self-paced'}
                        </span>
                        {mod.hasStudentProgress && (
                          <>
                            <span>•</span>
                            <span className="module-meta-item" style={{ color: '#38bdf8' }}>
                              👥 {mod.studentProgressCount} Scholar Completions
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================================================================== */}
      {/* TAB: CURRICULUM — VIEW 2: DEDICATED MODULE MANAGEMENT SCREEN */}
      {/* ==================================================================== */}
      {activeTab === 'curriculum' && viewMode === 'module' && selectedModuleDetail && (
        <div className="dedicated-module-manager">
          <div className="module-mgr-top-bar">
            <div className="module-mgr-meta-block">
              <div className="module-mgr-meta-pills">
                <span className="module-number-pill">MODULE {selectedModuleDetail.moduleNumber}</span>
                <span className={`module-status-pill ${selectedModuleDetail.published ? 'published' : 'draft'}`}>
                  {selectedModuleDetail.published ? 'Published' : 'Draft'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {moduleLessons.length} Lessons • {selectedModuleDetail.estimatedMinutes ? `~${selectedModuleDetail.estimatedMinutes} mins` : '—'}
                </span>
              </div>
              <h3 style={{ margin: '0.35rem 0 0 0', color: '#fff', fontSize: '1.4rem' }}>
                {selectedModuleDetail.title}
              </h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                {selectedModuleDetail.description || 'No module description set.'}
              </p>
            </div>

            <div className="module-mgr-actions-row">
              <button
                type="button"
                className="btn-admin-slate"
                onClick={() => setViewMode('curriculum')}
              >
                ← Back to Curriculum
              </button>
              <button
                type="button"
                className="btn-admin-slate"
                onClick={() => handleOpenEditModule(selectedModuleDetail)}
              >
                ✏️ Edit Metadata
              </button>
              <button
                type="button"
                className="btn-admin-slate"
                onClick={() => handleOpenStudentPreview('module', selectedModuleDetail)}
              >
                👁️ Preview as Student
              </button>
              <button
                type="button"
                className={selectedModuleDetail.published ? 'btn-admin-slate' : 'btn-admin-emerald'}
                onClick={() => handleTogglePublishModule(selectedModuleDetail)}
              >
                {selectedModuleDetail.published ? 'Unpublish' : '🚀 Publish Module'}
              </button>
            </div>
          </div>

          {/* Module Lessons Directory */}
          <div className="module-lessons-section">
            <div className="module-lessons-header">
              <h4 className="lessons-title">
                <span>📖</span> LESSONS ({moduleLessons.length})
              </h4>
              <button
                type="button"
                className="btn-add-module"
                onClick={handleOpenAddLesson}
              >
                <span>+</span> Add Lesson
              </button>
            </div>

            {moduleLoading ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Loading module lessons...</p>
            ) : moduleLessons.length === 0 ? (
              <div className="curriculum-empty-card" style={{ padding: '3rem 1.5rem' }}>
                <span className="empty-icon">📝</span>
                <h4 className="empty-title">No lessons yet.</h4>
                <p className="empty-sub">
                  Start building this module by adding the first lesson with academic formulas, explanations, and practice activities.
                </p>
                <button
                  type="button"
                  className="btn-add-module"
                  style={{ marginTop: '0.5rem' }}
                  onClick={handleOpenAddLesson}
                >
                  + Add Lesson
                </button>
              </div>
            ) : (
              <div className="lessons-list-deck">
                {moduleLessons.map((l, lIdx) => {
                  const isFirst = lIdx === 0;
                  const isLast = lIdx === moduleLessons.length - 1;

                  return (
                    <div key={l.id || lIdx} className="lesson-admin-row-card">
                      <div className="lesson-row-left">
                        <span className="drag-handle-grip">≡</span>
                        <span className="lesson-num-tag">Lesson {l.lessonNumber || lIdx + 1}</span>
                        <div>
                          <div className="lesson-title-text">{l.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {l.blocksCount || l.content?.length || 0} Content Blocks • slug: {l.slug}
                          </div>
                        </div>
                      </div>

                      <div className="lesson-row-right">
                        <span className={`module-status-pill ${l.published ? 'published' : 'draft'}`}>
                          {l.published ? 'Published' : 'Draft'}
                        </span>
                        <span className="lesson-duration-tag">{l.estimatedMinutes || 15} min</span>

                        <div className="lesson-row-actions">
                          <button
                            type="button"
                            className="btn-icon-reorder"
                            disabled={isFirst}
                            onClick={() => handleMoveLessonOrder(lIdx, 'up')}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="btn-icon-reorder"
                            disabled={isLast}
                            onClick={() => handleMoveLessonOrder(lIdx, 'down')}
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="btn-mod-action primary"
                            style={{ padding: '0.35rem 0.75rem' }}
                            onClick={() => handleOpenEditLesson(l)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-icon-reorder"
                            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                            onClick={() => handleDeleteLesson(l.id)}
                            title="Delete Lesson"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: CURRICULUM — VIEW 3: DEDICATED VISUAL LESSON BUILDER */}
      {/* ==================================================================== */}
      {activeTab === 'curriculum' && viewMode === 'lesson_builder' && (
        <div className="dedicated-module-manager">
          {/* Builder Top Bar */}
          <div className="module-mgr-top-bar">
            <div className="module-mgr-meta-block">
              <div className="module-mgr-meta-pills">
                <span className="module-number-pill">
                  Module {selectedModuleDetail?.moduleNumber} • Lesson {lessonFormData.lessonNumber}
                </span>
                <span className={`module-status-pill ${lessonFormData.published ? 'published' : 'draft'}`}>
                  {lessonFormData.published ? 'Published' : 'Draft'}
                </span>
                {lessonDirty && (
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                    • Unsaved Changes
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {formattedLastSaved}
                </span>
              </div>
              <h3 style={{ margin: '0.35rem 0 0 0', color: '#fff', fontSize: '1.35rem' }}>
                {lessonFormData.title || 'Untitled Academic Lesson'}
              </h3>
            </div>

            <div className="module-mgr-actions-row">
              <button
                type="button"
                className="btn-admin-slate"
                onClick={handleSafelyLeaveLessonBuilder}
              >
                ← Back to Module
              </button>
              <button
                type="button"
                className="btn-admin-slate"
                onClick={() => handleOpenStudentPreview('lesson', { lesson: lessonFormData, module: selectedModuleDetail })}
              >
                👁️ Preview as Student
              </button>
              <button
                type="button"
                className="btn-admin-slate"
                disabled={savingLesson}
                onClick={() => handleSaveLesson(false)}
              >
                {savingLesson ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                className="btn-admin-gold"
                disabled={savingLesson}
                onClick={() => handleSaveLesson(true)}
              >
                🚀 {savingLesson ? 'Publishing...' : 'Publish Lesson'}
              </button>
            </div>
          </div>

          {/* Validation Alert */}
          {lessonValidationErrors && (
            <div className="validation-alert-box">
              <div className="validation-alert-title">Cannot save / publish lesson:</div>
              <ul className="validation-alert-list">
                {lessonValidationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Lesson Metadata Form */}
          <div className="module-lessons-section" style={{ padding: '1.25rem' }}>
            <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Lesson Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">Lesson Title *</label>
                <input
                  className="admin-form-input"
                  placeholder="e.g. Competitive Markets & Welfare Analysis"
                  value={lessonFormData.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLessonFormData((prev) => ({
                      ...prev,
                      title: val,
                      slug: prev.slug === generateSlug(prev.title) || !prev.slug ? generateSlug(val) : prev.slug
                    }));
                    setLessonDirty(true);
                  }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Slug</label>
                <input
                  className="admin-form-input"
                  value={lessonFormData.slug}
                  onChange={(e) => {
                    setLessonFormData((prev) => ({ ...prev, slug: generateSlug(e.target.value) }));
                    setLessonDirty(true);
                  }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Estimated Time (Minutes)</label>
                <input
                  type="number"
                  className="admin-form-input"
                  value={lessonFormData.estimatedMinutes}
                  onChange={(e) => {
                    setLessonFormData((prev) => ({ ...prev, estimatedMinutes: Number(e.target.value) }));
                    setLessonDirty(true);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Content Blocks Editor */}
          <div className="module-lessons-section">
            <div className="module-lessons-header">
              <h4 className="lessons-title">
                <span>🧱</span> CONTENT BLOCKS ({lessonFormData.content?.length || 0})
              </h4>
              <button
                type="button"
                className="btn-add-module"
                onClick={() => {
                  setInsertBlockIndex(lessonFormData.content.length - 1);
                  setShowBlockMenu(true);
                }}
              >
                <span>+</span> Add Content Block
              </button>
            </div>

            {/* Blocks List */}
            {(!lessonFormData.content || lessonFormData.content.length === 0) ? (
              <div className="curriculum-empty-card" style={{ padding: '2.5rem 1.5rem' }}>
                <span className="empty-icon">📄</span>
                <h4 className="empty-title">No content blocks yet.</h4>
                <p className="empty-sub">
                  Build this lesson using modular blocks: Headings, Academic Equations, Definitions, Empirical Derivations, Code, and Practice checks.
                </p>
                <button
                  type="button"
                  className="btn-add-module"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => {
                    setInsertBlockIndex(-1);
                    setShowBlockMenu(true);
                  }}
                >
                  + Add First Block
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {lessonFormData.content.map((block, bIdx) => {
                  const isFirst = bIdx === 0;
                  const isLast = bIdx === lessonFormData.content.length - 1;

                  return (
                    <div
                      key={bIdx}
                      style={{
                        background: '#14213d',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem'
                      }}
                    >
                      {/* Block Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: '4px', letterSpacing: '0.04em' }}>
                            {block.type}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Block #{bIdx + 1}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn-icon-reorder"
                            disabled={isFirst}
                            onClick={() => moveBlock(bIdx, 'up')}
                            title="Move block up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="btn-icon-reorder"
                            disabled={isLast}
                            onClick={() => moveBlock(bIdx, 'down')}
                            title="Move block down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="btn-icon-reorder"
                            onClick={() => duplicateBlock(bIdx)}
                            title="Duplicate block"
                          >
                            📋
                          </button>
                          <button
                            type="button"
                            className="btn-icon-reorder"
                            style={{ color: '#f87171' }}
                            onClick={() => deleteBlock(bIdx)}
                            title="Delete block"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Block Specific Form Inputs */}
                      {block.type === 'heading' && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <select
                            className="admin-form-select"
                            style={{ width: '120px' }}
                            value={block.level || 2}
                            onChange={(e) => updateBlockField(bIdx, 'level', Number(e.target.value))}
                          >
                            <option value={2}>Heading 2</option>
                            <option value={3}>Heading 3</option>
                          </select>
                          <input
                            className="admin-form-input"
                            style={{ flex: 1 }}
                            placeholder="Heading Text..."
                            value={block.text || ''}
                            onChange={(e) => updateBlockField(bIdx, 'text', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'paragraph' && (
                        <textarea
                          className="admin-form-textarea"
                          rows={3}
                          placeholder="Write paragraph text, academic concepts, or explanations..."
                          value={block.text || ''}
                          onChange={(e) => updateBlockField(bIdx, 'text', e.target.value)}
                        />
                      )}

                      {block.type === 'equation' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                              className="admin-form-input"
                              placeholder="Title (e.g. Slutsky Equation)"
                              style={{ flex: 1 }}
                              value={block.title || ''}
                              onChange={(e) => updateBlockField(bIdx, 'title', e.target.value)}
                            />
                            <input
                              className="admin-form-input"
                              placeholder="Eq. Label (e.g. Eq. 2.1)"
                              style={{ width: '150px' }}
                              value={block.label || ''}
                              onChange={(e) => updateBlockField(bIdx, 'label', e.target.value)}
                            />
                          </div>
                          <textarea
                            className="admin-form-textarea"
                            rows={2}
                            style={{ fontFamily: 'monospace' }}
                            placeholder="LaTeX / Formula representation (e.g. \\frac{\\partial x_i}{\\partial p_j} = ...)"
                            value={block.formula || block.code || block.text || ''}
                            onChange={(e) => updateBlockField(bIdx, 'formula', e.target.value)}
                          />
                          <input
                            className="admin-form-input"
                            placeholder="Brief economic intuition / explanation..."
                            value={block.explanation || ''}
                            onChange={(e) => updateBlockField(bIdx, 'explanation', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'definition' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <input
                            className="admin-form-input"
                            placeholder="Term / Concept Name (e.g. Compensated Demand)"
                            value={block.title || block.term || ''}
                            onChange={(e) => updateBlockField(bIdx, 'title', e.target.value)}
                          />
                          <textarea
                            className="admin-form-textarea"
                            rows={2}
                            placeholder="Formal definition text..."
                            value={block.text || block.definition || ''}
                            onChange={(e) => updateBlockField(bIdx, 'text', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'derivation' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <input
                            className="admin-form-input"
                            placeholder="Derivation Title"
                            value={block.title || ''}
                            onChange={(e) => updateBlockField(bIdx, 'title', e.target.value)}
                          />
                          <textarea
                            className="admin-form-textarea"
                            rows={4}
                            placeholder="Enter step-by-step derivation (one step per line)..."
                            value={Array.isArray(block.steps) ? block.steps.join('\n') : (block.text || '')}
                            onChange={(e) => updateBlockField(bIdx, 'steps', e.target.value.split('\n'))}
                          />
                        </div>
                      )}

                      {block.type === 'example' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <input
                            className="admin-form-input"
                            placeholder="Example Title (e.g. Market Equilibrium in Energy Markets)"
                            value={block.title || ''}
                            onChange={(e) => updateBlockField(bIdx, 'title', e.target.value)}
                          />
                          <textarea
                            className="admin-form-textarea"
                            rows={3}
                            placeholder="Applied scenario or numerical example..."
                            value={block.text || ''}
                            onChange={(e) => updateBlockField(bIdx, 'text', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'summary' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <input
                            className="admin-form-input"
                            placeholder="Summary Title"
                            value={block.title || ''}
                            onChange={(e) => updateBlockField(bIdx, 'title', e.target.value)}
                          />
                          <textarea
                            className="admin-form-textarea"
                            rows={3}
                            placeholder="Key takeaways (one item per line)..."
                            value={Array.isArray(block.items) ? block.items.join('\n') : (block.text || '')}
                            onChange={(e) => updateBlockField(bIdx, 'items', e.target.value.split('\n'))}
                          />
                        </div>
                      )}

                      {(block.type === 'note' || block.type === 'warning') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <input
                            className="admin-form-input"
                            placeholder="Card Title"
                            value={block.title || ''}
                            onChange={(e) => updateBlockField(bIdx, 'title', e.target.value)}
                          />
                          <textarea
                            className="admin-form-textarea"
                            rows={2}
                            placeholder="Note or Warning text..."
                            value={block.text || ''}
                            onChange={(e) => updateBlockField(bIdx, 'text', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'image' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <input
                            className="admin-form-input"
                            placeholder="Image URL..."
                            value={block.url || ''}
                            onChange={(e) => updateBlockField(bIdx, 'url', e.target.value)}
                          />
                          <input
                            className="admin-form-input"
                            placeholder="Caption / Subtitle..."
                            value={block.caption || block.title || ''}
                            onChange={(e) => updateBlockField(bIdx, 'caption', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'video' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <input
                            className="admin-form-input"
                            placeholder="Video Title..."
                            value={block.title || ''}
                            onChange={(e) => updateBlockField(bIdx, 'title', e.target.value)}
                          />
                          <input
                            className="admin-form-input"
                            placeholder="Embed URL (e.g. YouTube embed)..."
                            value={block.url || ''}
                            onChange={(e) => updateBlockField(bIdx, 'url', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'checkpoint' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <input
                            className="admin-form-input"
                            placeholder="Knowledge Check Title"
                            value={block.title || ''}
                            onChange={(e) => updateBlockField(bIdx, 'title', e.target.value)}
                          />
                          <textarea
                            className="admin-form-textarea"
                            rows={2}
                            placeholder="Prompt or question for the scholar..."
                            value={block.instructions || ''}
                            onChange={(e) => updateBlockField(bIdx, 'instructions', e.target.value)}
                          />
                          <textarea
                            className="admin-form-textarea"
                            rows={3}
                            style={{ fontFamily: 'monospace' }}
                            placeholder="Optional interactive code or solution check..."
                            value={block.code || ''}
                            onChange={(e) => updateBlockField(bIdx, 'code', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD / EDIT COURSE MODULE */}
      {/* ==================================================================== */}
      {showModuleModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowModuleModal(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{moduleModalMode === 'create' ? '+ Add New Course Module' : 'Edit Course Module'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModuleModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModuleForm}>
              <div className="admin-modal-body">
                {moduleValidationErrors && (
                  <div className="validation-alert-box">
                    <div className="validation-alert-title">Please correct the following:</div>
                    <ul className="validation-alert-list">
                      {moduleValidationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="admin-form-group">
                  <label className="admin-form-label">Module Title *</label>
                  <input
                    className="admin-form-input"
                    placeholder="e.g. Competitive Markets & Welfare Analysis"
                    value={moduleFormData.title}
                    required
                    onChange={(e) => {
                      const val = e.target.value;
                      setModuleFormData((prev) => ({
                        ...prev,
                        title: val,
                        slug: prev.slug === generateSlug(prev.title) || !prev.slug ? generateSlug(val) : prev.slug
                      }));
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Module Number</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={moduleFormData.moduleNumber}
                      onChange={(e) =>
                        setModuleFormData((prev) => ({
                          ...prev,
                          moduleNumber: Number(e.target.value)
                        }))
                      }
                    />
                    <span className="admin-form-hint">Display/ordering metadata</span>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Slug</label>
                    <input
                      className="admin-form-input"
                      value={moduleFormData.slug}
                      onChange={(e) =>
                        setModuleFormData((prev) => ({
                          ...prev,
                          slug: generateSlug(e.target.value)
                        }))
                      }
                    />
                    <span className="admin-form-hint">URL identifier</span>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Short Description</label>
                  <textarea
                    className="admin-form-textarea"
                    rows={3}
                    placeholder="Brief description of the theoretical foundations covered in this module..."
                    value={moduleFormData.description}
                    onChange={(e) =>
                      setModuleFormData((prev) => ({
                        ...prev,
                        description: e.target.value
                      }))
                    }
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Publish Status</label>
                    <select
                      className="admin-form-select"
                      value={moduleFormData.status}
                      onChange={(e) =>
                        setModuleFormData((prev) => ({
                          ...prev,
                          status: e.target.value
                        }))
                      }
                    >
                      <option value="draft">Draft (Admin only)</option>
                      <option value="published">Published (Visible to scholars)</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Estimated Learning Time (Minutes)</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={moduleFormData.estimatedMinutes}
                      onChange={(e) =>
                        setModuleFormData((prev) => ({
                          ...prev,
                          estimatedMinutes: Number(e.target.value)
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Thumbnail / Cover (Optional)</label>
                  <input
                    className="admin-form-input"
                    placeholder="https://... cover image URL"
                    value={moduleFormData.thumbnail}
                    onChange={(e) =>
                      setModuleFormData((prev) => ({
                        ...prev,
                        thumbnail: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-admin-slate"
                  onClick={() => setShowModuleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-gold"
                  disabled={savingModule}
                >
                  {savingModule
                    ? 'Saving...'
                    : moduleModalMode === 'create'
                    ? 'Create Module'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: SAFE DELETE / ARCHIVE CONFIRMATION */}
      {/* ==================================================================== */}
      {moduleToDelete && deleteWarning && (
        <div className="admin-modal-backdrop" onClick={() => setModuleToDelete(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 style={{ color: deleteWarning.isSafe ? '#ffffff' : '#fbbf24' }}>
                {deleteWarning.isSafe ? 'Delete Module?' : 'Archive Recommended'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModuleToDelete(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>
                Module {moduleToDelete.moduleNumber} — {moduleToDelete.title}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', lineHeight: 1.5 }}>
                {deleteWarning.message}
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn-admin-slate"
                onClick={() => setModuleToDelete(null)}
              >
                Cancel
              </button>

              {!deleteWarning.isSafe ? (
                <>
                  <button
                    type="button"
                    className="btn-admin-gold"
                    disabled={deletingModule}
                    onClick={handleConfirmArchiveModule}
                  >
                    {deletingModule ? 'Archiving...' : 'Archive Module'}
                  </button>
                  <button
                    type="button"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '0.55rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                    disabled={deletingModule}
                    onClick={handleConfirmPermanentDeleteModule}
                    title="Force delete (removes historical lessons)"
                  >
                    Force Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                  disabled={deletingModule}
                  onClick={handleConfirmPermanentDeleteModule}
                >
                  {deletingModule ? 'Deleting...' : 'Delete Module'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CATEGORIZED ADD CONTENT BLOCK CATALOG */}
      {/* ==================================================================== */}
      {showBlockMenu && (
        <div className="admin-modal-backdrop" onClick={() => setShowBlockMenu(false)}>
          <div className="admin-modal-box large" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>+ Select Academic Content Block</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowBlockMenu(false)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body" style={{ gap: '1.5rem' }}>
              {/* Category: TEXT */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  TEXT & STRUCTURE
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('heading')}>
                    <span style={{ fontSize: '1.1rem' }}>H2</span> Section Heading
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('paragraph')}>
                    <span style={{ fontSize: '1.1rem' }}>¶</span> Paragraph Text
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('list')}>
                    <span style={{ fontSize: '1.1rem' }}>•</span> Bulleted Points
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('table')}>
                    <span style={{ fontSize: '1.1rem' }}>⊞</span> Structured Table
                  </button>
                </div>
              </div>

              {/* Category: ACADEMIC */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  ACADEMIC & THEORETICAL FORMULATIONS
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('equation')}>
                    <span style={{ fontSize: '1.1rem' }}>📐</span> Mathematical Equation
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('definition')}>
                    <span style={{ fontSize: '1.1rem' }}>📖</span> Formal Definition
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('derivation')}>
                    <span style={{ fontSize: '1.1rem' }}>∫</span> Proof & Derivation
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('example')}>
                    <span style={{ fontSize: '1.1rem' }}>💡</span> Empirical Example
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('summary')}>
                    <span style={{ fontSize: '1.1rem' }}>🎯</span> Core Takeaways
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('note')}>
                    <span style={{ fontSize: '1.1rem' }}>📌</span> Key Concept Note
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('warning')}>
                    <span style={{ fontSize: '1.1rem' }}>⚠️</span> Analytical Warning
                  </button>
                </div>
              </div>

              {/* Category: MEDIA */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  MEDIA & CITATIONS
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('image')}>
                    <span style={{ fontSize: '1.1rem' }}>🖼️</span> Chart / Diagram
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('video')}>
                    <span style={{ fontSize: '1.1rem' }}>🎥</span> Embedded Video
                  </button>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('link')}>
                    <span style={{ fontSize: '1.1rem' }}>🔗</span> Academic Resource Link
                  </button>
                </div>
              </div>

              {/* Category: INTERACTIVE */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  INTERACTIVE & PRACTICE
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn-admin-slate" style={{ justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => handleAddBlockSelected('checkpoint')}>
                    <span style={{ fontSize: '1.1rem' }}>⚡</span> Knowledge Check / Practice
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn-admin-slate"
                onClick={() => setShowBlockMenu(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: STUDENT PREVIEW */}
      {/* ==================================================================== */}
      {previewMode && (
        <div className="admin-modal-backdrop" onClick={handleCloseStudentPreview}>
          <div className="admin-modal-box large" style={{ maxWidth: '980px', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="student-preview-header-banner">
              <span>👁️ STUDENT PERSPECTIVE PREVIEW</span>
              <button
                type="button"
                className="modal-close-btn"
                style={{ color: '#fff' }}
                onClick={handleCloseStudentPreview}
              >
                ✕ Close Preview
              </button>
            </div>

            <div className="student-preview-body" style={{ overflowY: 'auto' }}>
              {previewMode === 'lesson' && previewData?.lesson && (
                <div>
                  <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      Module {previewData.module?.moduleNumber} • Lesson {previewData.lesson?.lessonNumber}
                    </span>
                    <h1 style={{ fontSize: '1.75rem', color: '#ffffff', margin: '0.35rem 0' }}>
                      {previewData.lesson.title || 'Untitled Lesson'}
                    </h1>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      Estimated reading time: {previewData.lesson.estimatedMinutes || 15} minutes
                    </span>
                  </div>

                  <ContentRenderer content={previewData.lesson.content || []} />
                </div>
              )}

              {previewMode === 'module' && previewData && (
                <div>
                  <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      Academic Module {previewData.moduleNumber}
                    </span>
                    <h1 style={{ fontSize: '1.75rem', color: '#ffffff', margin: '0.35rem 0' }}>
                      {previewData.title}
                    </h1>
                    <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0.35rem 0 0 0' }}>
                      {previewData.description || 'Module overview and syllabus.'}
                    </p>
                  </div>

                  <h3 style={{ color: '#ffffff', fontSize: '1.15rem', marginBottom: '1rem' }}>
                    Module Lessons
                  </h3>

                  {(moduleLessons.length > 0 ? moduleLessons : previewData.lessons || []).map((l, idx) => (
                    <div
                      key={l.id || idx}
                      style={{
                        background: '#0f182c',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '1rem 1.25rem',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>
                          Lesson {l.lessonNumber || idx + 1}: {l.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          ~{l.estimatedMinutes || 15} minutes • Self-paced reading
                        </div>
                      </div>
                      <span style={{ fontSize: '0.825rem', color: '#38bdf8', fontWeight: 600 }}>
                        Start Lesson →
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {previewMode === 'course' && (
                <div>
                  <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h1 style={{ fontSize: '1.85rem', color: '#ffffff', margin: '0.25rem 0' }}>
                      {courseData?.title}
                    </h1>
                    <p style={{ color: '#94a3b8', margin: 0 }}>
                      Comprehensive Syllabus • {modules.length} Modules Available
                    </p>
                  </div>

                  {modules.map((m, mIdx) => (
                    <div
                      key={m.id || mIdx}
                      style={{
                        background: '#0f182c',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        marginBottom: '1rem'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase' }}>
                        Module {m.moduleNumber || mIdx + 1}
                      </div>
                      <h3 style={{ margin: '0.25rem 0', color: '#fff', fontSize: '1.2rem' }}>{m.title}</h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>{m.description}</p>
                      <span style={{ fontSize: '0.8rem', color: '#34d399' }}>
                        {m.lessonsCount || 0} Lessons • Self-Paced
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn-admin-slate"
                onClick={handleCloseStudentPreview}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
