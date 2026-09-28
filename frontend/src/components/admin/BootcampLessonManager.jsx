import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import ContentRenderer from '../lesson/ContentRenderer';
import './BootcampLessonManager.css';

export default function BootcampLessonManager({ bootcampSlug = 'intro-to-python', onBack }) {
  // Navigation / View state: 'list' (Lesson Directory) | 'builder' (Lesson Content Editor)
  const [viewMode, setViewMode] = useState('list');

  // Bootcamp & Module state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bootcampData, setBootcampData] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);

  // Lessons list for active module
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // Lesson Builder state (for Add or Edit)
  const [editingLessonId, setEditingLessonId] = useState(null); // null if creating new
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    slug: '',
    lessonNumber: 1,
    estimatedMinutes: 10,
    published: true,
    content: []
  });
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | null
  const [lastSaved, setLastSaved] = useState(null);

  // Categorized Add Content Block Menu state
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [insertBlockIndex, setInsertBlockIndex] = useState(null);

  // Modals
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [blockToDeleteIndex, setBlockToDeleteIndex] = useState(null);
  const [validationErrors, setValidationErrors] = useState(null);
  const [showStudentPreview, setShowStudentPreview] = useState(false);

  // 1. Fetch Bootcamp and Modules list
  useEffect(() => {
    let isMounted = true;
    async function loadBootcamp() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/admin/bootcamps/${bootcampSlug}`);
        if (!res.ok) throw new Error('Failed to load bootcamp modules.');
        const data = await res.json();
        if (isMounted) {
          setBootcampData(data);
          const firstMod = data.modules?.[0];
          if (firstMod) {
            setSelectedModuleId(firstMod.id);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadBootcamp();
    return () => { isMounted = false; };
  }, [bootcampSlug]);

  // Current active module object
  const activeModule = useMemo(() => {
    if (!bootcampData?.modules || !selectedModuleId) return null;
    return bootcampData.modules.find((m) => String(m.id) === String(selectedModuleId)) || null;
  }, [bootcampData, selectedModuleId]);

  // 2. Fetch Lessons whenever selectedModuleId changes
  useEffect(() => {
    let isMounted = true;
    async function loadModuleLessons() {
      if (!selectedModuleId) return;
      setLessonsLoading(true);
      try {
        const res = await apiFetch(`/api/admin/modules/${selectedModuleId}/lessons`);
        if (!res.ok) throw new Error('Failed to load lessons for module.');
        const data = await res.json();
        if (isMounted) {
          setLessons(data.lessons || []);
        }
      } catch (err) {
        console.error('Error fetching lessons:', err);
      } finally {
        if (isMounted) setLessonsLoading(false);
      }
    }
    loadModuleLessons();
    return () => { isMounted = false; };
  }, [selectedModuleId]);

  // Open Lesson Builder for Creating a New Lesson
  const handleOpenCreateLesson = () => {
    const nextNumber = lessons.length + 1;
    setEditingLessonId(null);
    setLessonFormData({
      title: '',
      slug: '',
      lessonNumber: nextNumber,
      estimatedMinutes: 10,
      published: true,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Introduction to Topic'
        },
        {
          type: 'paragraph',
          text: 'Enter lesson overview and conceptual foundations here.'
        }
      ]
    });
    setDirty(false);
    setViewMode('builder');
  };

  // Open Lesson Builder for Editing an Existing Lesson
  const handleOpenEditLesson = async (lessonStub) => {
    try {
      const res = await apiFetch(`/api/admin/lessons/${lessonStub.id}`);
      if (!res.ok) throw new Error('Failed to fetch full lesson content.');
      const data = await res.json();
      const l = data.lesson;
      setEditingLessonId(l._id || l.id);
      setLessonFormData({
        title: l.title || '',
        slug: l.slug || '',
        lessonNumber: l.lessonNumber || 1,
        estimatedMinutes: l.estimatedMinutes || 10,
        published: l.published !== false,
        content: Array.isArray(l.content) ? l.content : []
      });
      setDirty(false);
      setViewMode('builder');
    } catch (err) {
      alert(`Could not load lesson: ${err.message}`);
    }
  };

  // Reorder Lessons (in list view)
  const handleMoveLessonInList = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const copy = [...lessons];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const renumbered = copy.map((l, i) => ({ ...l, lessonNumber: i + 1, order: i + 1 }));
    setLessons(renumbered);

    try {
      await apiFetch(`/api/admin/modules/${selectedModuleId}/lessons/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ lessonIds: renumbered.map((l) => l.id) })
      });
    } catch (err) {
      console.error('Failed to persist lesson order:', err);
    }
  };

  // Duplicate Lesson
  const handleDuplicateLesson = async (lessonStub) => {
    try {
      const res = await apiFetch(`/api/admin/lessons/${lessonStub.id}`);
      if (!res.ok) throw new Error('Failed to load lesson for duplication.');
      const data = await res.json();
      const l = data.lesson;

      const newTitle = `${l.title} (Copy)`;
      const newSlug = `${l.slug}-copy-${Date.now()}`;

      const createRes = await apiFetch(`/api/admin/modules/${selectedModuleId}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug,
          estimatedMinutes: l.estimatedMinutes,
          published: false,
          content: l.content || []
        })
      });

      if (!createRes.ok) throw new Error('Failed to duplicate lesson.');
      const created = await createRes.json();
      setLessons((prev) => [...prev, created.lesson]);
    } catch (err) {
      alert(`Error duplicating lesson: ${err.message}`);
    }
  };

  // Toggle Publish Status in List
  const handleTogglePublishLesson = async (lessonStub) => {
    const updatedStatus = !lessonStub.published;
    try {
      const res = await apiFetch(`/api/admin/lessons/${lessonStub.id}`, {
        method: 'PUT',
        body: JSON.stringify({ published: updatedStatus })
      });
      if (!res.ok) throw new Error('Failed to update status.');
      setLessons((prev) =>
        prev.map((l) => (l.id === lessonStub.id ? { ...l, published: updatedStatus } : l))
      );
    } catch (err) {
      alert(`Error updating publish status: ${err.message}`);
    }
  };

  // Delete Lesson
  const handleConfirmDeleteLesson = async () => {
    if (!lessonToDelete) return;
    try {
      const res = await apiFetch(`/api/admin/lessons/${lessonToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete lesson.');
      setLessons((prev) => prev.filter((l) => l.id !== lessonToDelete.id));
      setLessonToDelete(null);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // --------------------------------------------------------------------------
  // LESSON BUILDER ACTIONS & CONTENT BLOCK MANAGEMENT
  // --------------------------------------------------------------------------

  const updateFormMetadata = (field, value) => {
    setLessonFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'title' && !editingLessonId) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return updated;
    });
    setDirty(true);
  };

  const updateBlockField = (index, field, value) => {
    setLessonFormData((prev) => {
      const copy = [...prev.content];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, content: copy };
    });
    setDirty(true);
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
    setDirty(true);
  };

  const duplicateBlock = (index) => {
    setLessonFormData((prev) => {
      const copy = [...prev.content];
      const clone = JSON.parse(JSON.stringify(copy[index]));
      copy.splice(index + 1, 0, clone);
      return { ...prev, content: copy };
    });
    setDirty(true);
  };

  const confirmDeleteBlock = () => {
    if (blockToDeleteIndex === null) return;
    setLessonFormData((prev) => {
      const copy = prev.content.filter((_, idx) => idx !== blockToDeleteIndex);
      return { ...prev, content: copy };
    });
    setBlockToDeleteIndex(null);
    setDirty(true);
  };

  // Add New Content Block by Type
  const handleAddBlockSelected = (type) => {
    let newBlock = { type };

    switch (type) {
      case 'heading':
        newBlock = { type: 'heading', level: 2, text: 'New Section Heading' };
        break;
      case 'paragraph':
        newBlock = { type: 'paragraph', text: 'Write explanations and academic concepts here.' };
        break;
      case 'list':
        newBlock = { type: 'list', items: ['First key point', 'Second key point', 'Third key point'] };
        break;
      case 'table':
        newBlock = {
          type: 'table',
          title: 'Comparison Table',
          headers: ['Parameter', 'Type', 'Description'],
          rows: [['param1', 'int', 'Integer value'], ['param2', 'str', 'String label']]
        };
        break;
      case 'code':
        newBlock = {
          type: 'code',
          title: 'Code Example',
          language: 'python',
          code: 'numbers = [1, 2, 3]\nfor n in numbers:\n    print(n)',
          output: '1\n2\n3',
          instructions: 'Iterate over list elements using a for loop.'
        };
        break;
      case 'output':
        newBlock = { type: 'output', text: '42\nExecution finished successfully.' };
        break;
      case 'note':
        newBlock = { type: 'note', title: 'Key Concept', text: 'Notice how Python handles dynamic scoping.' };
        break;
      case 'warning':
        newBlock = { type: 'warning', title: 'Syntax Trap', text: 'Avoid modifying lists while iterating over them.' };
        break;
      case 'checkpoint': // Practice Task
        newBlock = {
          type: 'checkpoint',
          title: 'Practice Task: List Slicing',
          instructions: 'Extract the first three elements of the array without mutating the original list.',
          code: 'items = [10, 20, 30, 40, 50]\n# Extract first three items:\nfirst_three = items[:3]\nprint(first_three)',
          difficulty: 'Beginner',
          ungraded: true
        };
        break;
      case 'jupyter': // Python IDE Exercise
        newBlock = {
          type: 'jupyter',
          title: 'Interactive Python IDE Exercise',
          instructions: 'Run this exercise live in your browser to inspect runtime behavior.',
          starterCode: 'fruits = ["apple", "banana", "cherry"]\nprint("Length:", len(fruits))\nprint("First item:", fruits[0])',
          mode: 'repl',
          height: 380,
          readOnly: false,
          ungraded: true
        };
        break;
      case 'link':
        newBlock = { type: 'link', title: 'Official Documentation', text: 'Explore official Python references.', url: 'https://docs.python.org/3/' };
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
    setDirty(true);
  };

  // Save Draft (does not require strict validation)
  const handleSaveLessonDraft = async () => {
    if (!lessonFormData.title.trim()) {
      alert('Lesson title is required to save.');
      return;
    }
    setSaveStatus('saving');
    try {
      let res;
      if (editingLessonId) {
        res = await apiFetch(`/api/admin/lessons/${editingLessonId}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...lessonFormData,
            published: false
          })
        });
      } else {
        res = await apiFetch(`/api/admin/modules/${selectedModuleId}/lessons`, {
          method: 'POST',
          body: JSON.stringify({
            ...lessonFormData,
            published: false
          })
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save lesson draft.');
      }

      const data = await res.json();
      if (!editingLessonId && data.lesson?._id) {
        setEditingLessonId(data.lesson._id);
      }

      setDirty(false);
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString());
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      alert(`Save Draft Failed: ${err.message}`);
      setSaveStatus(null);
    }
  };

  // Publish Lesson (validates all rules)
  const handlePublishLesson = async () => {
    const errors = [];
    if (!lessonFormData.title.trim()) errors.push('Lesson title cannot be empty.');
    if (!lessonFormData.content || lessonFormData.content.length === 0) {
      errors.push('At least one content block is required to publish a lesson.');
    }
    lessonFormData.content.forEach((b, i) => {
      const bNum = i + 1;
      if (b.type === 'heading' && !b.text?.trim()) errors.push(`Block ${bNum} (Heading) is missing heading text.`);
      if (b.type === 'code' && !b.code?.trim()) errors.push(`Block ${bNum} (Code Example) has no code content.`);
      if (b.type === 'jupyter' && !b.starterCode?.trim()) errors.push(`Block ${bNum} (Python IDE) has no starter code.`);
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaveStatus('saving');
    try {
      let res;
      if (editingLessonId) {
        res = await apiFetch(`/api/admin/lessons/${editingLessonId}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...lessonFormData,
            published: true
          })
        });
      } else {
        res = await apiFetch(`/api/admin/modules/${selectedModuleId}/lessons`, {
          method: 'POST',
          body: JSON.stringify({
            ...lessonFormData,
            published: true
          })
        });
      }

      if (!res.ok) {
        const err = await res.json();
        if (err.errors) {
          setValidationErrors(err.errors);
          setSaveStatus(null);
          return;
        }
        throw new Error(err.detail || 'Failed to publish lesson.');
      }

      setLessonFormData((prev) => ({ ...prev, published: true }));
      setDirty(false);
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString());
      alert('✓ Lesson successfully validated and published live to students!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      alert(`Publish Failed: ${err.message}`);
      setSaveStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-assessment-manager-loading">
        <div className="admin-spinner" />
        <p>Loading Bootcamp Lessons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-assessment-manager-error">
        <h3>Could not load lessons</h3>
        <p>{error}</p>
        <button type="button" className="btn-admin-primary" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 1: LESSON MANAGEMENT DIRECTORY (LIST OF LESSONS IN MODULE)
  // ==========================================================================
  if (viewMode === 'list') {
    return (
      <div className="bootcamp-lessons-manager">
        {/* HEADER & MODULE SELECTOR */}
        <header className="lessons-mgmt-header">
          <div className="header-info">
            {onBack && (
              <button type="button" className="btn-back-link" onClick={onBack}>
                ← Back to Bootcamp Overview
              </button>
            )}
            <h2 className="section-main-title">Bootcamp Lessons</h2>
            <p className="section-subtitle">
              Create, edit, organize and publish lessons within each Bootcamp module.
            </p>
          </div>

          <div className="header-actions-row">
            <div className="module-selector-box">
              <label>Module</label>
              <select
                value={selectedModuleId || ''}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="admin-select"
              >
                {bootcampData?.modules?.map((m) => (
                  <option key={m.id} value={m.id}>
                    Module {m.moduleNumber}: {m.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-admin-primary"
              onClick={handleOpenCreateLesson}
            >
              + Add New Lesson
            </button>
          </div>
        </header>

        {/* LESSONS DIRECTORY LIST */}
        <section className="lessons-list-card">
          <div className="list-card-header">
            <h3>Lessons in Module {activeModule?.moduleNumber}: {activeModule?.title}</h3>
            <span className="lesson-count-badge">{lessons.length} Lessons</span>
          </div>

          {lessonsLoading ? (
            <div className="lessons-inner-loader">
              <div className="admin-spinner" />
              <p>Loading module lessons...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="empty-lessons-box">
              <h4>No lessons in this module yet</h4>
              <p>Create your first structured lesson to get started.</p>
              <button
                type="button"
                className="btn-admin-primary"
                onClick={handleOpenCreateLesson}
              >
                + Add First Lesson
              </button>
            </div>
          ) : (
            <div className="lessons-grid">
              {lessons.map((lesson, index) => (
                <div key={lesson.id} className="lesson-row-card">
                  <div className="lesson-row-left">
                    <span className="row-drag-handle" title="Lesson position handle">≡</span>
                    <div className="lesson-num-badge">Lesson {lesson.lessonNumber || index + 1}</div>
                    <div className="lesson-main-meta">
                      <h4 className="lesson-row-title">{lesson.title}</h4>
                      <div className="lesson-row-subtext">
                        <span>⏱️ {lesson.estimatedMinutes || 10} min</span>
                        <span>•</span>
                        <span>📦 {lesson.blocksCount || lesson.content?.length || 0} Content Blocks</span>
                        <span>•</span>
                        <span className={`pill-publish ${lesson.published ? 'published' : 'draft'}`}>
                          {lesson.published ? '● Published' : '○ Draft'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lesson-row-actions">
                    <button
                      type="button"
                      className="btn-admin-secondary btn-sm"
                      onClick={() => handleTogglePublishLesson(lesson)}
                      title={lesson.published ? 'Unpublish lesson' : 'Publish lesson live'}
                    >
                      {lesson.published ? 'Unpublish' : 'Publish'}
                    </button>

                    <button
                      type="button"
                      className="btn-admin-primary btn-sm"
                      onClick={() => handleOpenEditLesson(lesson)}
                      title="Edit lesson content in visual builder"
                    >
                      ✎ Edit Lesson
                    </button>

                    <div className="row-toolbar-btns">
                      <button
                        type="button"
                        className="btn-tool"
                        disabled={index === 0}
                        onClick={() => handleMoveLessonInList(index, 'up')}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn-tool"
                        disabled={index === lessons.length - 1}
                        onClick={() => handleMoveLessonInList(index, 'down')}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="btn-tool"
                        onClick={() => handleDuplicateLesson(lesson)}
                        title="Duplicate Lesson"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="btn-tool text-destructive"
                        onClick={() => setLessonToDelete(lesson)}
                        title="Delete Lesson"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DELETE LESSON CONFIRMATION MODAL */}
        {lessonToDelete && (
          <div className="admin-modal-overlay">
            <div className="admin-modal-box confirmation-box">
              <div className="modal-header">
                <h3 className="text-destructive">Delete Lesson?</h3>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setLessonToDelete(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body-padded">
                <p>
                  Are you sure you want to permanently delete <strong>{lessonToDelete.title}</strong>?
                </p>
                <p className="text-muted">
                  This will remove all content blocks, code examples, and practice exercises for this lesson.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setLessonToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-admin-destructive"
                  onClick={handleConfirmDeleteLesson}
                >
                  Delete Lesson
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: VISUAL LESSON BUILDER (ADD & EDIT)
  // ==========================================================================
  return (
    <div className="lesson-builder-view">
      {/* 1. STICKY TOP BUILDER TOOLBAR */}
      <header className="builder-sticky-header">
        <div className="header-left">
          <div className="builder-breadcrumbs">
            <button
              type="button"
              className="btn-back-link"
              onClick={() => setViewMode('list')}
            >
              ← Back to Lessons Directory
            </button>
            <span className="bc-sep">›</span>
            <span>Module {activeModule?.moduleNumber}</span>
            <span className="bc-sep">›</span>
            <span className="bc-active">{lessonFormData.title || 'Untitled Lesson'}</span>
          </div>

          <div className="builder-title-row">
            <h2 className="builder-heading">
              {editingLessonId ? `Edit Lesson ${lessonFormData.lessonNumber}` : 'Create New Lesson'}
            </h2>
            <span className={`badge-status ${lessonFormData.published ? 'published' : 'draft'}`}>
              {lessonFormData.published ? '● PUBLISHED' : '○ DRAFT'}
            </span>
            {dirty && <span className="dirty-indicator">● Unsaved edits</span>}
            {saveStatus === 'saving' && <span className="status-indicator">Saving...</span>}
            {saveStatus === 'saved' && <span className="status-indicator saved">✓ Saved ({lastSaved})</span>}
          </div>
        </div>

        <div className="header-right-actions">
          <button
            type="button"
            className="btn-admin-secondary btn-sm"
            onClick={() => {
              setShowBlockMenu(true);
              setInsertBlockIndex(null);
            }}
          >
            + Add Content Block
          </button>
          <button
            type="button"
            className="btn-admin-preview btn-sm"
            onClick={() => setShowStudentPreview(true)}
          >
            👁 Preview as Student
          </button>
          <button
            type="button"
            className="btn-admin-save btn-sm"
            onClick={handleSaveLessonDraft}
            disabled={saveStatus === 'saving'}
          >
            💾 Save Draft
          </button>
          <button
            type="button"
            className="btn-admin-publish btn-sm"
            onClick={handlePublishLesson}
            disabled={saveStatus === 'saving'}
          >
            🚀 Publish Lesson
          </button>
        </div>
      </header>

      {/* 2. LESSON METADATA CARD */}
      <section className="builder-metadata-card">
        <h3 className="subcard-title">Lesson Information</h3>
        <div className="metadata-form-grid">
          <div className="form-group span-2">
            <label>Lesson Title *</label>
            <input
              type="text"
              value={lessonFormData.title}
              onChange={(e) => updateFormMetadata('title', e.target.value)}
              placeholder="e.g. Variable Naming Conventions & Scope"
              className="admin-input-full"
            />
          </div>

          <div className="form-group">
            <label>Lesson Number</label>
            <input
              type="number"
              min="1"
              value={lessonFormData.lessonNumber}
              onChange={(e) => updateFormMetadata('lessonNumber', Number(e.target.value))}
              className="admin-input-full"
            />
          </div>

          <div className="form-group">
            <label>Estimated Time (Minutes)</label>
            <input
              type="number"
              min="1"
              max="180"
              value={lessonFormData.estimatedMinutes}
              onChange={(e) => updateFormMetadata('estimatedMinutes', Number(e.target.value))}
              className="admin-input-full"
            />
          </div>

          <div className="form-group span-2">
            <label>URL Slug</label>
            <input
              type="text"
              value={lessonFormData.slug}
              onChange={(e) => updateFormMetadata('slug', e.target.value)}
              placeholder="auto-generated-slug"
              className="admin-input-full"
            />
          </div>
        </div>
      </section>

      {/* 3. VISUAL CONTENT BLOCKS LIST */}
      <section className="builder-blocks-card">
        <div className="blocks-card-top">
          <div>
            <h3 className="subcard-title">Lesson Content Blocks</h3>
            <p className="subcard-hint">
              Build your lesson sequentially using text, interactive code, exercises, and teaching callouts.
            </p>
          </div>
          <button
            type="button"
            className="btn-admin-primary btn-sm"
            onClick={() => {
              setShowBlockMenu(true);
              setInsertBlockIndex(null);
            }}
          >
            + Add Content Block
          </button>
        </div>

        {lessonFormData.content.length === 0 ? (
          <div className="empty-blocks-placeholder">
            <h4>No content blocks yet</h4>
            <p>Add your first heading, explanation paragraph, or interactive Python exercise.</p>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => {
                setShowBlockMenu(true);
                setInsertBlockIndex(null);
              }}
            >
              + Add First Block
            </button>
          </div>
        ) : (
          <div className="blocks-list">
            {lessonFormData.content.map((block, idx) => (
              <article key={idx} className="content-block-item-card">
                {/* BLOCK CARD HEADER */}
                <header className="block-item-header">
                  <div className="block-header-left">
                    <span className="block-drag-handle">≡</span>
                    <span className="block-index-label">Block {idx + 1}</span>
                    <span className={`block-badge tag-${block.type}`}>
                      {block.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="block-header-right">
                    <button
                      type="button"
                      className="btn-block-student-preview"
                      onClick={() => setShowStudentPreview(true)}
                      title="Instant Student Preview: see exactly what students see right now without saving or publishing"
                    >
                      <span className="preview-btn-icon">👁</span>
                      <span className="preview-btn-text">Preview as Student</span>
                    </button>

                    <div className="block-header-toolbar">
                      <button
                        type="button"
                        className="btn-tool"
                        disabled={idx === 0}
                        onClick={() => moveBlock(idx, 'up')}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn-tool"
                        disabled={idx === lessonFormData.content.length - 1}
                        onClick={() => moveBlock(idx, 'down')}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="btn-tool"
                        onClick={() => duplicateBlock(idx)}
                        title="Duplicate Block"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="btn-tool text-destructive"
                        onClick={() => setBlockToDeleteIndex(idx)}
                        title="Delete Block"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </header>

                {/* BLOCK CARD BODY DEPENDING ON TYPE */}
                <div className="block-item-body">
                  {/* HEADING BLOCK */}
                  {block.type === 'heading' && (
                    <div className="block-fields-col">
                      <div className="heading-row">
                        <div className="level-select">
                          <label>Level</label>
                          <select
                            value={block.level || 2}
                            onChange={(e) => updateBlockField(idx, 'level', Number(e.target.value))}
                            className="admin-select"
                          >
                            <option value={2}>H2 (Major Section)</option>
                            <option value={3}>H3 (Sub-Section)</option>
                          </select>
                        </div>
                        <div className="heading-text-input">
                          <label>Heading Text</label>
                          <input
                            type="text"
                            value={block.text || ''}
                            onChange={(e) => updateBlockField(idx, 'text', e.target.value)}
                            placeholder="Enter section title..."
                            className="admin-input-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PARAGRAPH BLOCK */}
                  {block.type === 'paragraph' && (
                    <div className="block-fields-col">
                      <label>Paragraph Content (Markdown supported)</label>
                      <textarea
                        rows={Math.max(4, (block.text || '').split('\n').length + 2)}
                        value={block.text || ''}
                        onChange={(e) => updateBlockField(idx, 'text', e.target.value)}
                        placeholder="Write detailed explanations, examples, and academic theory..."
                        className="full-textarea"
                      />
                    </div>
                  )}

                  {/* LIST BLOCK */}
                  {block.type === 'list' && (
                    <div className="block-fields-col">
                      <label>List Items (one item per line)</label>
                      <textarea
                        rows={Math.max(4, (block.items || []).length + 2)}
                        value={(block.items || []).join('\n')}
                        onChange={(e) =>
                          updateBlockField(
                            idx,
                            'items',
                            e.target.value.split('\n').filter((item) => item.trim() !== '')
                          )
                        }
                        placeholder="First bullet point&#10;Second bullet point&#10;Third bullet point"
                        className="full-textarea"
                      />
                    </div>
                  )}

                  {/* CODE EXAMPLE BLOCK */}
                  {block.type === 'code' && (
                    <div className="block-fields-col">
                      <div className="code-block-meta-row">
                        <div className="form-group flex-2">
                          <label>Example Title</label>
                          <input
                            type="text"
                            value={block.title || ''}
                            onChange={(e) => updateBlockField(idx, 'title', e.target.value)}
                            placeholder="e.g. List Slicing Syntax"
                            className="admin-input-full"
                          />
                        </div>
                        <div className="form-group flex-1">
                          <label>Language</label>
                          <select
                            value={block.language || 'python'}
                            onChange={(e) => updateBlockField(idx, 'language', e.target.value)}
                            className="admin-select"
                          >
                            <option value="python">Python</option>
                            <option value="r">R</option>
                          </select>
                        </div>
                      </div>

                      <label>Python Code (Executable by Pyodide)</label>
                      <div className="editor-code-box">
                        <textarea
                          rows={Math.max(5, (block.code || '').split('\n').length + 1)}
                          value={block.code || ''}
                          onChange={(e) => updateBlockField(idx, 'code', e.target.value)}
                          placeholder="# Enter python code here..."
                          className="code-textarea"
                          spellCheck="false"
                        />
                      </div>

                      <div className="code-block-bottom-row">
                        <div className="form-group flex-1">
                          <label>Expected Output (Optional)</label>
                          <textarea
                            rows={3}
                            value={block.output || ''}
                            onChange={(e) => updateBlockField(idx, 'output', e.target.value)}
                            placeholder="Console output..."
                            className="code-textarea output-area"
                            spellCheck="false"
                          />
                        </div>
                        <div className="form-group flex-1">
                          <label>Explanation / Walkthrough</label>
                          <textarea
                            rows={3}
                            value={block.instructions || ''}
                            onChange={(e) => updateBlockField(idx, 'instructions', e.target.value)}
                            placeholder="Explain what the code demonstrates..."
                            className="full-textarea"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PYTHON IDE EXERCISE BLOCK (JUPYTER / INLINE IDE) */}
                  {block.type === 'jupyter' && (
                    <div className="block-fields-col interactive-exercise-col">
                      <div className="ide-meta-banner">
                        <span className="ide-badge">⚡ PYTHON BROWSER IDE EXERCISE</span>
                        <div className="ide-mode-pills">
                          <label className="radio-pill">
                            <input
                              type="radio"
                              name={`ide-mode-${idx}`}
                              checked={block.ungraded !== false}
                              onChange={() => updateBlockField(idx, 'ungraded', true)}
                            />
                            Ungraded Practice
                          </label>
                          <label className="radio-pill">
                            <input
                              type="radio"
                              name={`ide-mode-${idx}`}
                              checked={block.ungraded === false}
                              onChange={() => {
                                updateBlockField(idx, 'ungraded', false);
                                if (!block.points) updateBlockField(idx, 'points', 10);
                              }}
                            />
                            Graded Exercise
                          </label>
                        </div>
                      </div>

                      {/* Configurable Marks / Points for Graded Mode */}
                      {block.ungraded === false && (
                        <div className="graded-points-config-box" style={{ background: '#1e1b4b', padding: '0.75rem 1.15rem', borderRadius: '8px', border: '1px solid #4338ca', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          <div>
                            <strong style={{ color: '#e0e7ff', fontSize: '0.9rem' }}>🏆 Maximum Marks (Graded Exercise)</strong>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#a5b4fc' }}>Assign how many marks this exercise is worth on student submissions.</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c7d2fe' }}>Marks:</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={block.points || 10}
                              onChange={(e) => updateBlockField(idx, 'points', Number(e.target.value) || 1)}
                              className="admin-input-full"
                              style={{ width: '85px', textAlign: 'center', fontWeight: 800, color: '#a5f3fc' }}
                            />
                            <span style={{ color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 600 }}>pts</span>
                          </div>
                        </div>
                      )}

                      <div className="form-group">
                        <label>Exercise Title</label>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) => updateBlockField(idx, 'title', e.target.value)}
                          placeholder="e.g. Try List Indexing Yourself"
                          className="admin-input-full"
                        />
                      </div>

                      <div className="form-group">
                        <label>Instructions & Hints</label>
                        <textarea
                          rows={3}
                          value={block.instructions || ''}
                          onChange={(e) => updateBlockField(idx, 'instructions', e.target.value)}
                          placeholder="Change the index to 1 and observe the output..."
                          className="full-textarea"
                        />
                      </div>

                      <div className="form-group">
                        <label>Starter Code (Student Workspace)</label>
                        <div className="editor-code-box">
                          <textarea
                            rows={Math.max(5, (block.starterCode || '').split('\n').length + 1)}
                            value={block.starterCode || ''}
                            onChange={(e) => updateBlockField(idx, 'starterCode', e.target.value)}
                            placeholder="# Starter code that students can edit and run..."
                            className="code-textarea"
                            spellCheck="false"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PRACTICE TASK BLOCK (CHECKPOINT) */}
                  {block.type === 'checkpoint' && (
                    <div className="block-fields-col checkpoint-task-col">
                      <div className="task-header-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="task-badge">📝 {block.ungraded === false ? 'GRADED TASK' : 'PRACTICE TASK'}</span>
                          <span className="task-subtag">{block.ungraded === false ? `Graded Assessment (${block.points || 5} pts)` : 'Ungraded • Self-Check'}</span>
                        </div>
                        <div className="ide-mode-pills">
                          <label className="radio-pill">
                            <input
                              type="radio"
                              name={`task-mode-${idx}`}
                              checked={block.ungraded !== false}
                              onChange={() => updateBlockField(idx, 'ungraded', true)}
                            />
                            Ungraded
                          </label>
                          <label className="radio-pill">
                            <input
                              type="radio"
                              name={`task-mode-${idx}`}
                              checked={block.ungraded === false}
                              onChange={() => {
                                updateBlockField(idx, 'ungraded', false);
                                if (!block.points) updateBlockField(idx, 'points', 5);
                              }}
                            />
                            Graded
                          </label>
                        </div>
                      </div>

                      {block.ungraded === false && (
                        <div className="graded-points-config-box" style={{ background: '#0e241c', padding: '0.75rem 1.15rem', borderRadius: '8px', border: '1px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          <div>
                            <strong style={{ color: '#6ee7b7', fontSize: '0.9rem' }}>📝 Task Maximum Marks</strong>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#a7f3d0' }}>Points awarded for completing this practice task.</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7' }}>Marks:</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={block.points || 5}
                              onChange={(e) => updateBlockField(idx, 'points', Number(e.target.value) || 1)}
                              className="admin-input-full"
                              style={{ width: '85px', textAlign: 'center', fontWeight: 800, color: '#6ee7b7' }}
                            />
                            <span style={{ color: '#6ee7b7', fontSize: '0.85rem', fontWeight: 600 }}>pts</span>
                          </div>
                        </div>
                      )}

                      <div className="form-row-2">
                        <div className="form-group">
                          <label>Task Title</label>
                          <input
                            type="text"
                            value={block.title || ''}
                            onChange={(e) => updateBlockField(idx, 'title', e.target.value)}
                            placeholder="e.g. Task 2.1: Assign and compute GDP growth percentage"
                            className="admin-input-full"
                          />
                        </div>
                        <div className="form-group">
                          <label>Difficulty</label>
                          <select
                            value={block.difficulty || 'Beginner'}
                            onChange={(e) => updateBlockField(idx, 'difficulty', e.target.value)}
                            className="admin-select"
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Task Instructions</label>
                        <textarea
                          rows={3}
                          value={block.instructions || ''}
                          onChange={(e) => updateBlockField(idx, 'instructions', e.target.value)}
                          placeholder="Describe the challenge for the student to solve..."
                          className="full-textarea"
                        />
                      </div>

                      <div className="form-group">
                        <label>Optional Starter Code</label>
                        <div className="editor-code-box">
                          <textarea
                            rows={4}
                            value={block.code || ''}
                            onChange={(e) => updateBlockField(idx, 'code', e.target.value)}
                            placeholder="# Starter code..."
                            className="code-textarea"
                            spellCheck="false"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NOTE BLOCK */}
                  {block.type === 'note' && (
                    <div className="block-fields-col note-edit-col">
                      <div className="form-group">
                        <label>Note Title (e.g. KEY CONCEPT)</label>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) => updateBlockField(idx, 'title', e.target.value)}
                          placeholder="Key Concept"
                          className="admin-input-full"
                        />
                      </div>
                      <div className="form-group">
                        <label>Note Explanation</label>
                        <textarea
                          rows={3}
                          value={block.text || ''}
                          onChange={(e) => updateBlockField(idx, 'text', e.target.value)}
                          placeholder="Enter key concept note..."
                          className="full-textarea"
                        />
                      </div>
                    </div>
                  )}

                  {/* WARNING BLOCK */}
                  {block.type === 'warning' && (
                    <div className="block-fields-col warning-edit-col">
                      <div className="form-group">
                        <label>Warning Title (e.g. SYNTAX WARNING)</label>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) => updateBlockField(idx, 'title', e.target.value)}
                          placeholder="Syntax Error Notice"
                          className="admin-input-full"
                        />
                      </div>
                      <div className="form-group">
                        <label>Warning Text</label>
                        <textarea
                          rows={3}
                          value={block.text || ''}
                          onChange={(e) => updateBlockField(idx, 'text', e.target.value)}
                          placeholder="Describe the common mistake to avoid..."
                          className="full-textarea"
                        />
                      </div>
                    </div>
                  )}

                  {/* OUTPUT BLOCK */}
                  {block.type === 'output' && (
                    <div className="block-fields-col">
                      <label>Console Output</label>
                      <textarea
                        rows={3}
                        value={block.text || ''}
                        onChange={(e) => updateBlockField(idx, 'text', e.target.value)}
                        placeholder="Expected terminal output..."
                        className="code-textarea output-area"
                        spellCheck="false"
                      />
                    </div>
                  )}

                  {/* TABLE BLOCK */}
                  {block.type === 'table' && (
                    <div className="block-fields-col">
                      <div className="form-group">
                        <label>Table Title</label>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) => updateBlockField(idx, 'title', e.target.value)}
                          placeholder="Table Title"
                          className="admin-input-full"
                        />
                      </div>
                      <div className="form-group">
                        <label>Table Headers (comma-separated)</label>
                        <input
                          type="text"
                          value={(block.headers || []).join(', ')}
                          onChange={(e) =>
                            updateBlockField(
                              idx,
                              'headers',
                              e.target.value.split(',').map((h) => h.trim())
                            )
                          }
                          placeholder="Column 1, Column 2, Column 3"
                          className="admin-input-full"
                        />
                      </div>
                      <div className="form-group">
                        <label>Table Rows (one row per line, comma-separated columns)</label>
                        <textarea
                          rows={4}
                          value={(block.rows || []).map((r) => r.join(', ')).join('\n')}
                          onChange={(e) =>
                            updateBlockField(
                              idx,
                              'rows',
                              e.target.value
                                .split('\n')
                                .filter((line) => line.trim() !== '')
                                .map((line) => line.split(',').map((c) => c.trim()))
                            )
                          }
                          placeholder="row1 col1, row1 col2, row1 col3&#10;row2 col1, row2 col2, row2 col3"
                          className="full-textarea"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* INSERT BLOCK BELOW BUTTON */}
                <div className="insert-block-divider">
                  <button
                    type="button"
                    className="btn-insert-inline"
                    onClick={() => {
                      setInsertBlockIndex(idx);
                      setShowBlockMenu(true);
                    }}
                  >
                    + Insert Block Here
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="bottom-add-block-bar">
          <button
            type="button"
            className="btn-admin-primary"
            onClick={() => {
              setShowBlockMenu(true);
              setInsertBlockIndex(null);
            }}
          >
            + Add Content Block
          </button>
        </div>
      </section>

      {/* 4. CATEGORIZED ADD CONTENT BLOCK MENU (MODAL) */}
      {showBlockMenu && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box block-catalog-box">
            <div className="modal-header">
              <h3>Choose Content Block Type</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowBlockMenu(false)}
              >
                ✕
              </button>
            </div>

            <div className="catalog-content-categories">
              {/* Category 1: Text */}
              <div className="catalog-category-group">
                <span className="category-title">TEXT & STRUCTURE</span>
                <div className="catalog-grid">
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('heading')}
                  >
                    <span className="cat-icon">H#</span>
                    <div>
                      <strong>Heading</strong>
                      <p>Section or sub-section header (H2/H3)</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('paragraph')}
                  >
                    <span className="cat-icon">¶</span>
                    <div>
                      <strong>Paragraph</strong>
                      <p>Full-width academic explanatory text</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('list')}
                  >
                    <span className="cat-icon">•</span>
                    <div>
                      <strong>Bullet List</strong>
                      <p>Key bulleted takeaways & properties</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('table')}
                  >
                    <span className="cat-icon">⊞</span>
                    <div>
                      <strong>Data Table</strong>
                      <p>Comparison grid or parameter matrix</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category 2: Teaching */}
              <div className="catalog-category-group">
                <span className="category-title">TEACHING & CODE EXAMPLES</span>
                <div className="catalog-grid">
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('code')}
                  >
                    <span className="cat-icon">{'</>'}</span>
                    <div>
                      <strong>Code Example</strong>
                      <p>Executable code with expected output</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('output')}
                  >
                    <span className="cat-icon">🖥️</span>
                    <div>
                      <strong>Console Output</strong>
                      <p>Formatted terminal output block</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('note')}
                  >
                    <span className="cat-icon">💡</span>
                    <div>
                      <strong>Key Concept Note</strong>
                      <p>Highlighted pedagogical callout box</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('warning')}
                  >
                    <span className="cat-icon">⚠️</span>
                    <div>
                      <strong>Syntax Warning</strong>
                      <p>Alert for common beginner mistakes</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category 3: Interactive */}
              <div className="catalog-category-group">
                <span className="category-title">INTERACTIVE PRACTICE</span>
                <div className="catalog-grid">
                  <button
                    type="button"
                    className="catalog-btn featured"
                    onClick={() => handleAddBlockSelected('jupyter')}
                  >
                    <span className="cat-icon">⚡</span>
                    <div>
                      <strong>Python IDE Exercise</strong>
                      <p>Live in-browser Pyodide playground</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('checkpoint')}
                  >
                    <span className="cat-icon">📝</span>
                    <div>
                      <strong>Practice Task</strong>
                      <p>Ungraded self-check problem</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddBlockSelected('link')}
                  >
                    <span className="cat-icon">🔗</span>
                    <div>
                      <strong>Resource Link</strong>
                      <p>External documentation / notebook</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-admin-secondary"
                onClick={() => setShowBlockMenu(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DELETE BLOCK CONFIRMATION MODAL */}
      {blockToDeleteIndex !== null && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box confirmation-box">
            <div className="modal-header">
              <h3 className="text-destructive">Delete Content Block?</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setBlockToDeleteIndex(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-padded">
              <p>
                Are you sure you want to delete Block {blockToDeleteIndex + 1} (
                <strong>
                  {lessonFormData.content[blockToDeleteIndex]?.type?.toUpperCase()}
                </strong>
                )?
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-admin-secondary"
                onClick={() => setBlockToDeleteIndex(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-admin-destructive"
                onClick={confirmDeleteBlock}
              >
                Delete Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PUBLISH VALIDATION MODAL */}
      {validationErrors && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box validation-box">
            <div className="modal-header">
              <h3 className="text-destructive">Cannot Publish Lesson Yet</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setValidationErrors(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-padded">
              <p className="mb-2">The following items must be resolved before publishing live:</p>
              <ul className="validation-error-list">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-admin-primary"
                onClick={() => setValidationErrors(null)}
              >
                Fix Issues
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PREVIEW AS STUDENT MODAL (USES REAL ContentRenderer) */}
      {showStudentPreview && (
        <div className="student-preview-overlay">
          <div className="student-preview-container">
            <header className="preview-top-bar">
              <div className="preview-title-block">
                <span className="preview-super-tag">STUDENT PERSPECTIVE SIMULATOR</span>
                <h2>{lessonFormData.title || 'Lesson Title'}</h2>
                <span className="preview-meta">
                  Module {activeModule?.moduleNumber} • {lessonFormData.estimatedMinutes} min • Real ContentRenderer
                </span>
              </div>
              <button
                type="button"
                className="btn-exit-preview"
                onClick={() => setShowStudentPreview(false)}
              >
                ✕ Exit Preview
              </button>
            </header>

            <div className="lesson-preview-body-card">
              <ContentRenderer content={lessonFormData.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
