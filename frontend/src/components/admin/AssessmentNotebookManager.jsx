import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { getPyodide } from '../../utils/pyodideRunner';
import './AssessmentNotebookManager.css';

export default function AssessmentNotebookManager({ bootcampSlug = 'intro-to-python', onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bootcampData, setBootcampData] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('homework');
  const [assessment, setAssessment] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | null
  const [lastSaved, setLastSaved] = useState(null);

  // Card collapse state: Map<questionId, boolean>
  const [collapsedMap, setCollapsedMap] = useState({});

  // Question delete confirmation modal
  const [questionToDelete, setQuestionToDelete] = useState(null);

  // Add Question modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestionData, setNewQuestionData] = useState({
    title: '',
    maxPoints: 5,
    instructions: '',
    starterCode: '# Your code here:\n',
    hiddenTests: '# Automated assertions:\nassert True\n',
    referenceSolution: ''
  });

  // Student Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewActiveQuestionIndex, setPreviewActiveQuestionIndex] = useState(0);
  const [previewCodeMap, setPreviewCodeMap] = useState({});
  const [previewOutputs, setPreviewOutputs] = useState({});
  const [previewRunning, setPreviewRunning] = useState(false);

  // Validation modal / alert
  const [validationErrors, setValidationErrors] = useState(null);

  // Live Pyodide grader test state: Map<questionId, { running: boolean, result: any, error: string }>
  const [graderTestState, setGraderTestState] = useState({});

  // 1. Fetch Bootcamp assessment structure
  useEffect(() => {
    let isMounted = true;
    async function loadBootcampAssessments() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/admin/bootcamps/${bootcampSlug}/assessments`);
        if (!res.ok) throw new Error('Failed to load bootcamp assessments.');
        const data = await res.json();
        if (isMounted) {
          setBootcampData(data);
          // Auto select first module with assessments (typically Module 2 or 4)
          const modWithAssessments = data.modules?.find((m) => m.assessments?.length > 0) || data.modules?.[0];
          if (modWithAssessments) {
            setSelectedModuleId(modWithAssessments.moduleId);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadBootcampAssessments();
    return () => { isMounted = false; };
  }, [bootcampSlug]);

  // Current active module from bootcampData
  const activeModule = useMemo(() => {
    if (!bootcampData || !selectedModuleId) return null;
    return bootcampData.modules?.find((m) => String(m.moduleId) === String(selectedModuleId)) || null;
  }, [bootcampData, selectedModuleId]);

  // Current assessment from activeModule matching selectedAssessmentType
  const currentAssessmentStub = useMemo(() => {
    if (!activeModule) return null;
    return activeModule.assessments?.find((a) => a.type === selectedAssessmentType) || null;
  }, [activeModule, selectedAssessmentType]);

  // 2. Fetch full Assessment Template whenever active assessment changes
  useEffect(() => {
    let isMounted = true;
    async function loadAssessmentTemplate() {
      if (!currentAssessmentStub?.id) {
        setAssessment(null);
        return;
      }
      try {
        const res = await apiFetch(`/api/admin/assessments/${currentAssessmentStub.id}`);
        if (!res.ok) throw new Error('Failed to load assessment template details.');
        const data = await res.json();
        if (isMounted) {
          // If questions don't have starterCode, populate sensible starter templates
          const enrichedQuestions = (data.assessment?.questions || []).map((q, idx) => ({
            ...q,
            order: idx + 1,
            title: q.title || `Question ${idx + 1}`,
            instructions: q.instructions || '',
            maxPoints: q.maxPoints !== undefined ? q.maxPoints : 5,
            starterCode: q.starterCode || generateDefaultStarter(q.id, q.title, activeModule?.moduleNumber),
            hiddenTests: q.hiddenTests || generateDefaultHiddenTest(q.id, q.title, q.targetVariables),
            referenceSolution: q.referenceSolution || '',
            studentCanEdit: q.studentCanEdit !== false,
            studentCanDelete: Boolean(q.studentCanDelete)
          }));

          setAssessment({
            ...data.assessment,
            questions: enrichedQuestions
          });
          setDirty(false);
        }
      } catch (err) {
        console.error('Error fetching template:', err);
      }
    }
    loadAssessmentTemplate();
    return () => { isMounted = false; };
  }, [currentAssessmentStub?.id, activeModule?.moduleNumber]);

  // Calculate live total marks
  const totalConfiguredMarks = useMemo(() => {
    if (!assessment?.questions) return 0;
    return assessment.questions.reduce((sum, q) => sum + (Number(q.maxPoints) || 0), 0);
  }, [assessment?.questions]);

  const marksMismatch = assessment ? totalConfiguredMarks !== assessment.maxPoints : false;

  // Handle Question Field Changes
  const updateQuestionField = (qId, field, value) => {
    setAssessment((prev) => {
      if (!prev) return prev;
      const updated = prev.questions.map((q) => {
        if (q.id === qId) {
          return { ...q, [field]: value };
        }
        return q;
      });
      return { ...prev, questions: updated };
    });
    setDirty(true);
  };

  // Reorder Questions (Move Up / Down)
  const moveQuestion = (index, direction) => {
    setAssessment((prev) => {
      if (!prev) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.questions.length) return prev;

      const questionsCopy = [...prev.questions];
      const temp = questionsCopy[index];
      questionsCopy[index] = questionsCopy[newIndex];
      questionsCopy[newIndex] = temp;

      // Renumber orders
      const renumbered = questionsCopy.map((q, i) => ({ ...q, order: i + 1 }));
      return { ...prev, questions: renumbered };
    });
    setDirty(true);
  };

  // Duplicate Question
  const duplicateQuestion = (index) => {
    setAssessment((prev) => {
      if (!prev) return prev;
      const target = prev.questions[index];
      const copy = {
        ...target,
        id: `q-copy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: `${target.title} (Copy)`,
        order: index + 2
      };
      const questionsCopy = [...prev.questions];
      questionsCopy.splice(index + 1, 0, copy);
      const renumbered = questionsCopy.map((q, i) => ({ ...q, order: i + 1 }));
      return { ...prev, questions: renumbered };
    });
    setDirty(true);
  };

  // Delete Question
  const confirmDeleteQuestion = () => {
    if (!questionToDelete) return;
    setAssessment((prev) => {
      if (!prev) return prev;
      const filtered = prev.questions.filter((q) => q.id !== questionToDelete.id);
      const renumbered = filtered.map((q, i) => ({ ...q, order: i + 1 }));
      return { ...prev, questions: renumbered };
    });
    setQuestionToDelete(null);
    setDirty(true);
  };

  // Add Question
  const handleAddQuestionSubmit = (e) => {
    e.preventDefault();
    if (!newQuestionData.title.trim()) return;

    setAssessment((prev) => {
      if (!prev) return prev;
      const newQ = {
        id: `q-${Date.now()}`,
        order: prev.questions.length + 1,
        title: newQuestionData.title.trim(),
        type: 'coding',
        maxPoints: Number(newQuestionData.maxPoints) || 5,
        instructions: newQuestionData.instructions,
        starterCode: newQuestionData.starterCode,
        hiddenTests: newQuestionData.hiddenTests,
        referenceSolution: newQuestionData.referenceSolution || '',
        studentCanEdit: true,
        studentCanDelete: false
      };
      return { ...prev, questions: [...prev.questions, newQ] };
    });

    setShowAddModal(false);
    setNewQuestionData({
      title: '',
      maxPoints: 5,
      instructions: '',
      starterCode: '# Your code here:\n',
      hiddenTests: '# Automated assertions:\nassert True\n',
      referenceSolution: ''
    });
    setDirty(true);
  };

  // Toggle Collapse
  const toggleCollapse = (qId) => {
    setCollapsedMap((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const collapseAll = () => {
    const next = {};
    assessment?.questions?.forEach((q) => { next[q.id] = true; });
    setCollapsedMap(next);
  };

  const expandAll = () => {
    setCollapsedMap({});
  };

  // Save Draft (does not require strict mark matching)
  const handleSaveDraft = async () => {
    if (!assessment) return;
    setSaveStatus('saving');
    try {
      const res = await apiFetch(`/api/admin/assessments/${assessment._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: assessment.title,
          description: assessment.description,
          maxPoints: assessment.maxPoints,
          weight: assessment.weight,
          published: false,
          timeLimitMinutes: assessment.timeLimitMinutes,
          questions: assessment.questions
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to save assessment draft.');
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

  // Publish Assessment (validates all rules strictly)
  const handlePublish = async () => {
    if (!assessment) return;

    // Client-side pre-validation
    const errors = [];
    if (!assessment.title?.trim()) errors.push('Assessment title cannot be empty.');
    if (!assessment.questions || assessment.questions.length === 0) {
      errors.push('At least one question is required.');
    } else {
      if (totalConfiguredMarks !== assessment.maxPoints) {
        errors.push(`Total question marks (${totalConfiguredMarks}) must equal assessment max marks (${assessment.maxPoints}).`);
      }
      assessment.questions.forEach((q, idx) => {
        const num = idx + 1;
        if (!q.title?.trim()) errors.push(`Question ${num} is missing a title.`);
        if (Number(q.maxPoints) <= 0) errors.push(`Question ${num} has 0 or invalid marks.`);
        if (!q.hiddenTests?.trim()) errors.push(`Question ${num} has no automated hidden test assertions.`);
      });
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaveStatus('saving');
    try {
      const res = await apiFetch(`/api/admin/assessments/${assessment._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: assessment.title,
          description: assessment.description,
          maxPoints: assessment.maxPoints,
          weight: assessment.weight,
          published: true,
          timeLimitMinutes: assessment.timeLimitMinutes,
          questions: assessment.questions
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.errors) {
          setValidationErrors(errData.errors);
          setSaveStatus(null);
          return;
        }
        throw new Error(errData.detail || 'Failed to publish assessment.');
      }

      setAssessment((prev) => ({ ...prev, published: true }));
      setDirty(false);
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString());
      alert('✓ Assessment successfully validated and published to students!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      alert(`Publish Failed: ${err.message}`);
      setSaveStatus(null);
    }
  };

  // Live Pyodide Grader Test
  const handleRunGraderTest = async (q, targetCodeType = 'starter') => {
    const qId = q.id;
    const testCode = targetCodeType === 'solution'
      ? (q.referenceSolution || q.starterCode)
      : q.starterCode;

    setGraderTestState((prev) => ({
      ...prev,
      [qId]: { running: true, result: null, error: null }
    }));

    try {
      const py = await getPyodide();
      let stdout = '';
      let stderr = '';

      py.setStdout({ batched: (msg) => { stdout += msg + '\n'; } });
      py.setStderr({ batched: (msg) => { stderr += msg + '\n'; } });

      // Clean global state
      await py.runPythonAsync(`
import sys
# Clear previous test namespace if possible
for key in list(globals().keys()):
    if not key.startswith('__') and key not in ['sys', 'os']:
        del globals()[key]
`);

      // 1. Run target code
      await py.runPythonAsync(testCode);

      // 2. Run hidden tests
      await py.runPythonAsync(q.hiddenTests || 'assert True');

      setGraderTestState((prev) => ({
        ...prev,
        [qId]: {
          running: false,
          result: {
            success: true,
            message: 'All test assertions passed successfully!',
            output: stdout.trim()
          },
          error: null
        }
      }));
    } catch (err) {
      setGraderTestState((prev) => ({
        ...prev,
        [qId]: {
          running: false,
          result: null,
          error: err.message
        }
      }));
    }
  };

  // Launch Preview as Student
  const handleOpenPreview = () => {
    if (!assessment?.questions) return;
    const initialMap = {};
    assessment.questions.forEach((q) => {
      initialMap[q.id] = q.starterCode;
    });
    setPreviewCodeMap(initialMap);
    setPreviewOutputs({});
    setPreviewActiveQuestionIndex(0);
    setShowPreviewModal(true);
  };

  // Run code inside Student Preview
  const handleRunPreviewCode = async (qId) => {
    const codeToRun = previewCodeMap[qId] || '';
    setPreviewRunning(true);
    try {
      const py = await getPyodide();
      let stdout = '';
      let stderr = '';

      py.setStdout({ batched: (msg) => { stdout += msg + '\n'; } });
      py.setStderr({ batched: (msg) => { stderr += msg + '\n'; } });

      await py.runPythonAsync(codeToRun);
      setPreviewOutputs((prev) => ({
        ...prev,
        [qId]: {
          output: stdout.trim() || '(Executed with no printed output)',
          error: stderr.trim() || null
        }
      }));
    } catch (err) {
      setPreviewOutputs((prev) => ({
        ...prev,
        [qId]: {
          output: '',
          error: err.message
        }
      }));
    } finally {
      setPreviewRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-assessment-manager-loading">
        <div className="admin-spinner" />
        <p>Loading assessment authoring template...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-assessment-manager-error">
        <h3>Could not load assessment</h3>
        <p>{error}</p>
        <button type="button" className="btn-admin-primary" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="assessment-authoring-container">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <header className="authoring-header">
        <div className="header-left">
          <div className="breadcrumb-trail">
            {onBack && (
              <button type="button" className="btn-back-link" onClick={onBack}>
                ← Back to Bootcamp
              </button>
            )}
            <span className="bc-item">Introduction to Python</span>
            <span className="bc-separator">›</span>
            <span className="bc-item">Module {activeModule?.moduleNumber} — {activeModule?.moduleTitle}</span>
            <span className="bc-separator">›</span>
            <span className="bc-active">{assessment?.title || 'Assessment Template'}</span>
          </div>

          <div className="title-row">
            <h1 className="assessment-main-title">{assessment?.title || 'Assessment Notebook'}</h1>
            <div className="title-badges">
              <span className={`badge-type ${selectedAssessmentType}`}>
                {selectedAssessmentType === 'homework' ? 'HOMEWORK' : 'QUIZ'}
              </span>
              <span className="badge-weight">
                {selectedAssessmentType === 'homework' ? '40% Module Weight' : '60% Module Weight'}
              </span>
              <span className={`badge-status ${assessment?.published ? 'published' : 'draft'}`}>
                {assessment?.published ? '● PUBLISHED' : '○ DRAFT'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Selector Controls */}
        <div className="header-selectors">
          <div className="selector-group">
            <label>Module</label>
            <select
              value={selectedModuleId || ''}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="admin-select"
            >
              {bootcampData?.modules?.map((m) => (
                <option key={m.moduleId} value={m.moduleId}>
                  Module {m.moduleNumber}: {m.moduleTitle}
                </option>
              ))}
            </select>
          </div>

          <div className="selector-group">
            <label>Assessment Type</label>
            <div className="pill-toggle-group">
              <button
                type="button"
                className={`pill-toggle ${selectedAssessmentType === 'homework' ? 'active' : ''}`}
                onClick={() => setSelectedAssessmentType('homework')}
              >
                Homework (40m)
              </button>
              <button
                type="button"
                className={`pill-toggle ${selectedAssessmentType === 'quiz' ? 'active' : ''}`}
                onClick={() => setSelectedAssessmentType('quiz')}
              >
                Final Quiz (20m)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. STICKY ACTION & TOTAL MARKS TOOLBAR */}
      <section className="sticky-action-bar">
        <div className="bar-left">
          <div className="metric-pill">
            <span className="metric-label">Questions</span>
            <span className="metric-val">{assessment?.questions?.length || 0}</span>
          </div>

          <div className={`metric-pill ${marksMismatch ? 'mismatch' : 'match'}`}>
            <span className="metric-label">Total Marks</span>
            <span className="metric-val">
              {totalConfiguredMarks} / {assessment?.maxPoints || 0}
            </span>
            {marksMismatch ? (
              <span className="marks-warn-icon" title="Question marks do not equal assessment max marks">⚠️</span>
            ) : (
              <span className="marks-match-icon">✓</span>
            )}
          </div>

          {dirty && <span className="dirty-indicator">● Unsaved changes</span>}
          {saveStatus === 'saving' && <span className="status-indicator saving">Saving...</span>}
          {saveStatus === 'saved' && <span className="status-indicator saved">✓ Saved ({lastSaved})</span>}
        </div>

        <div className="bar-actions">
          <button
            type="button"
            className="btn-admin-secondary btn-sm"
            onClick={expandAll}
            title="Expand all questions"
          >
            ⊞ Expand All
          </button>
          <button
            type="button"
            className="btn-admin-secondary btn-sm"
            onClick={collapseAll}
            title="Collapse all questions"
          >
            ⊟ Collapse All
          </button>

          <button
            type="button"
            className="btn-admin-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            + Add Question
          </button>

          <button
            type="button"
            className="btn-admin-preview btn-sm"
            onClick={handleOpenPreview}
          >
            👁 Preview as Student
          </button>

          <button
            type="button"
            className="btn-admin-save btn-sm"
            onClick={handleSaveDraft}
            disabled={saveStatus === 'saving'}
          >
            💾 Save Draft
          </button>

          <button
            type="button"
            className="btn-admin-publish btn-sm"
            onClick={handlePublish}
            disabled={saveStatus === 'saving'}
          >
            🚀 Publish Assessment
          </button>
        </div>
      </section>

      {/* 3. MARKS MISMATCH ALERT BANNER */}
      {marksMismatch && (
        <div className="marks-alert-banner">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <strong>Marks Configuration Mismatch:</strong> Total question marks equal{' '}
            <strong>{totalConfiguredMarks}</strong>, but this assessment is configured for{' '}
            <strong>{assessment?.maxPoints} marks</strong>. You may save drafts, but publishing is blocked
            until question marks match the configured maximum.
          </div>
        </div>
      )}

      {/* 4. QUESTIONS CARD LIST */}
      <main className="questions-container">
        {(!assessment?.questions || assessment.questions.length === 0) ? (
          <div className="empty-questions-card">
            <h3>No questions yet</h3>
            <p>Create your first structured coding problem for this assessment notebook.</p>
            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => setShowAddModal(true)}
            >
              + Add First Question
            </button>
          </div>
        ) : (
          assessment.questions.map((q, idx) => {
            const isCollapsed = Boolean(collapsedMap[q.id]);
            const testState = graderTestState[q.id] || {};

            return (
              <article key={q.id} className={`question-author-card ${isCollapsed ? 'collapsed' : ''}`}>
                {/* QUESTION CARD HEADER */}
                <header className="q-card-header">
                  <div className="q-header-left" onClick={() => toggleCollapse(q.id)}>
                    <span className="drag-handle" title="Question order handle">≡</span>
                    <button
                      type="button"
                      className="collapse-toggle-btn"
                      aria-label={isCollapsed ? 'Expand Question' : 'Collapse Question'}
                    >
                      {isCollapsed ? '▶' : '▼'}
                    </button>
                    <div className="q-title-group">
                      <span className="q-num-label">Question {idx + 1}</span>
                      <span className="q-title-text">{q.title || 'Untitled Question'}</span>
                      <span className="q-type-badge">Python Coding Question</span>
                    </div>
                  </div>

                  <div className="q-header-right">
                    <div className="q-marks-input-wrapper">
                      <label>Marks:</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={q.maxPoints}
                        onChange={(e) => updateQuestionField(q.id, 'maxPoints', Number(e.target.value))}
                        className="marks-num-input"
                        aria-label={`Marks for question ${idx + 1}`}
                      />
                    </div>

                    <div className="q-card-toolbar">
                      <button
                        type="button"
                        className="btn-tool"
                        disabled={idx === 0}
                        onClick={() => moveQuestion(idx, 'up')}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn-tool"
                        disabled={idx === assessment.questions.length - 1}
                        onClick={() => moveQuestion(idx, 'down')}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="btn-tool"
                        onClick={() => duplicateQuestion(idx)}
                        title="Duplicate Question"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="btn-tool text-destructive"
                        onClick={() => setQuestionToDelete(q)}
                        title="Delete Question"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </header>

                {/* EXPANDED CONTENT SECTIONS */}
                {!isCollapsed && (
                  <div className="q-card-body">
                    {/* TITLE EDIT ROW */}
                    <div className="editor-subfield">
                      <label className="field-label">Question Title</label>
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => updateQuestionField(q.id, 'title', e.target.value)}
                        placeholder="e.g. Duplicate Removal in List"
                        className="admin-input-full"
                      />
                    </div>

                    {/* SECTION 1: QUESTION INSTRUCTIONS (MARKDOWN) */}
                    <div className="editor-subfield">
                      <div className="subfield-header">
                        <label className="field-label">Question Instructions (Markdown • Read-only for students)</label>
                        <span className="subfield-hint">Supports Markdown syntax and formatting</span>
                      </div>
                      <textarea
                        className="instructions-textarea"
                        rows={Math.max(5, (q.instructions || '').split('\n').length + 2)}
                        value={q.instructions}
                        onChange={(e) => updateQuestionField(q.id, 'instructions', e.target.value)}
                        placeholder="Provide clear problem instructions, expected outputs, variable names, and constraints..."
                      />
                    </div>

                    {/* SECTION 2: STUDENT ANSWER CELL (STARTER CODE) */}
                    <div className="editor-subfield">
                      <div className="subfield-header">
                        <label className="field-label">Student Answer Cell (Starter Code)</label>
                        <div className="cell-options-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={q.studentCanEdit !== false}
                              onChange={(e) => updateQuestionField(q.id, 'studentCanEdit', e.target.checked)}
                            />
                            Student can edit
                          </label>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={Boolean(q.studentCanDelete)}
                              onChange={(e) => updateQuestionField(q.id, 'studentCanDelete', e.target.checked)}
                            />
                            Student can delete (fixed = false)
                          </label>
                        </div>
                      </div>

                      <div className="code-editor-wrapper">
                        <div className="code-editor-header">
                          <span className="lang-tag">PYTHON 3 · STARTER TEMPLATE</span>
                          <span className="readiness-tag">Delivered to student workspace</span>
                        </div>
                        <div className="editor-body-with-linenums">
                          <div className="line-numbers">
                            {(q.starterCode || '\n').split('\n').map((_, i) => (
                              <span key={i}>{i + 1}</span>
                            ))}
                          </div>
                          <textarea
                            className="code-textarea"
                            value={q.starterCode}
                            rows={Math.max(5, (q.starterCode || '').split('\n').length + 1)}
                            onChange={(e) => updateQuestionField(q.id, 'starterCode', e.target.value)}
                            spellCheck="false"
                            placeholder="# Define initial variables and template code here..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: AUTOMATED GRADING (ADMIN ONLY • EVALUATED BY PYODIDE) */}
                    <div className="editor-subfield admin-only-subfield">
                      <div className="subfield-header">
                        <div className="admin-badge-row">
                          <label className="field-label text-gold">Automated Grader Tests</label>
                          <span className="tag-admin-only">ADMIN ONLY • HIDDEN FROM STUDENTS</span>
                        </div>
                        <div className="grader-test-actions">
                          <button
                            type="button"
                            className="btn-grader-test"
                            onClick={() => handleRunGraderTest(q, 'starter')}
                            disabled={testState.running}
                          >
                            {testState.running ? 'Running Pyodide...' : '⚡ Test Starter Against Grader'}
                          </button>
                          {q.referenceSolution && (
                            <button
                              type="button"
                              className="btn-grader-test solution-test ml-1"
                              onClick={() => handleRunGraderTest(q, 'solution')}
                              disabled={testState.running}
                            >
                              🧪 Test Reference Solution
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="code-editor-wrapper grader-editor">
                        <div className="code-editor-header">
                          <span className="lang-tag text-gold">PYTHON TEST ASSERTIONS (PYODIDE RUNTIME)</span>
                          <span className="security-tag">Never delivered to student APIs</span>
                        </div>
                        <div className="editor-body-with-linenums">
                          <div className="line-numbers">
                            {(q.hiddenTests || '\n').split('\n').map((_, i) => (
                              <span key={i}>{i + 1}</span>
                            ))}
                          </div>
                          <textarea
                            className="code-textarea grader-code"
                            value={q.hiddenTests}
                            rows={Math.max(4, (q.hiddenTests || '').split('\n').length + 1)}
                            onChange={(e) => updateQuestionField(q.id, 'hiddenTests', e.target.value)}
                            spellCheck="false"
                            placeholder="assert isinstance(result_list, list), 'Must be a list'&#10;assert len(result_list) == 10"
                          />
                        </div>
                      </div>

                      {/* LIVE GRADER TEST OUTPUT CONSOLE */}
                      {(testState.result || testState.error) && (
                        <div className={`grader-test-console ${testState.error ? 'failed' : 'passed'}`}>
                          <div className="console-bar">
                            <span className="console-status">
                              {testState.error ? '✕ GRADER ASSERTION FAILED' : '✓ GRADER TEST PASSED'}
                            </span>
                            <button
                              type="button"
                              className="btn-dismiss-console"
                              onClick={() => setGraderTestState((prev) => ({ ...prev, [q.id]: null }))}
                            >
                              ✕ Clear
                            </button>
                          </div>
                          <div className="console-viewport">
                            {testState.error ? (
                              <pre className="error-text">{testState.error}</pre>
                            ) : (
                              <div className="pass-text">
                                <p>{testState.result.message}</p>
                                {testState.result.output && (
                                  <pre className="pass-output">{testState.result.output}</pre>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 4: REFERENCE SOLUTION (OPTIONAL • ADMIN ONLY) */}
                    <div className="editor-subfield admin-solution-subfield">
                      <div className="subfield-header">
                        <label className="field-label">Reference Solution (Optional • Admin Only)</label>
                        <span className="subfield-hint">Used for internal test validation and teacher guides</span>
                      </div>
                      <div className="code-editor-wrapper">
                        <div className="editor-body-with-linenums">
                          <div className="line-numbers">
                            {(q.referenceSolution || '\n').split('\n').map((_, i) => (
                              <span key={i}>{i + 1}</span>
                            ))}
                          </div>
                          <textarea
                            className="code-textarea"
                            value={q.referenceSolution}
                            rows={Math.max(3, (q.referenceSolution || '').split('\n').length + 1)}
                            onChange={(e) => updateQuestionField(q.id, 'referenceSolution', e.target.value)}
                            spellCheck="false"
                            placeholder="# Optional correct answer code to verify tests pass..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}

        {/* BOTTOM ADD QUESTION BAR */}
        {assessment?.questions && assessment.questions.length > 0 && (
          <div className="bottom-add-container">
            <button
              type="button"
              className="btn-admin-primary"
              onClick={() => setShowAddModal(true)}
            >
              + Add Question
            </button>
          </div>
        )}
      </main>

      {/* 5. ADD QUESTION MODAL */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div className="modal-header">
              <h3>Create Coding Question</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddQuestionSubmit} className="modal-form">
              <div className="form-group">
                <label>Question Title *</label>
                <input
                  type="text"
                  required
                  value={newQuestionData.title}
                  onChange={(e) => setNewQuestionData({ ...newQuestionData, title: e.target.value })}
                  placeholder="e.g. List Deduplication Algorithm"
                  className="admin-input-full"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Question Type</label>
                  <input type="text" value="Python Coding Question" disabled className="admin-input-full disabled" />
                </div>
                <div className="form-group">
                  <label>Marks *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newQuestionData.maxPoints}
                    onChange={(e) => setNewQuestionData({ ...newQuestionData, maxPoints: Number(e.target.value) })}
                    className="admin-input-full"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Instructions (Markdown)</label>
                <textarea
                  rows={4}
                  value={newQuestionData.instructions}
                  onChange={(e) => setNewQuestionData({ ...newQuestionData, instructions: e.target.value })}
                  placeholder="Describe the task, inputs, and expected variables..."
                  className="instructions-textarea"
                />
              </div>

              <div className="form-group">
                <label>Starter Code</label>
                <textarea
                  rows={3}
                  value={newQuestionData.starterCode}
                  onChange={(e) => setNewQuestionData({ ...newQuestionData, starterCode: e.target.value })}
                  className="code-textarea"
                  spellCheck="false"
                />
              </div>

              <div className="form-group">
                <label>Automated Hidden Tests (Admin Only)</label>
                <textarea
                  rows={3}
                  value={newQuestionData.hiddenTests}
                  onChange={(e) => setNewQuestionData({ ...newQuestionData, hiddenTests: e.target.value })}
                  className="code-textarea grader-code"
                  spellCheck="false"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {questionToDelete && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box confirmation-box">
            <div className="modal-header">
              <h3 className="text-destructive">Delete Question?</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setQuestionToDelete(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-padded">
              <p>
                Are you sure you want to delete <strong>{questionToDelete.title}</strong>?
              </p>
              <p className="text-muted">
                This will permanently remove its instructions, starter code, and automated grading test suite
                from this assessment template.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-admin-secondary"
                onClick={() => setQuestionToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-admin-destructive"
                onClick={confirmDeleteQuestion}
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PUBLISH VALIDATION ERRORS MODAL */}
      {validationErrors && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box validation-box">
            <div className="modal-header">
              <h3 className="text-destructive">Cannot Publish Assessment Yet</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setValidationErrors(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-padded">
              <p className="mb-2">The following items must be resolved before publishing to students:</p>
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
                Review & Fix Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. PREVIEW AS STUDENT MODAL */}
      {showPreviewModal && assessment?.questions && (
        <div className="student-preview-overlay">
          <div className="student-preview-container">
            <header className="preview-top-bar">
              <div className="preview-title-block">
                <span className="preview-super-tag">STUDENT PERSPECTIVE SIMULATOR</span>
                <h2>{assessment.title}</h2>
                <span className="preview-meta">
                  Module {activeModule?.moduleNumber} • {assessment.maxPoints} Marks Total • Graded by WebAssembly Pyodide
                </span>
              </div>
              <button
                type="button"
                className="btn-exit-preview"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕ Exit Preview
              </button>
            </header>

            <div className="preview-layout">
              {/* Question Navigation Tabs */}
              <nav className="preview-nav-tabs">
                {assessment.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    type="button"
                    className={`preview-tab-btn ${previewActiveQuestionIndex === idx ? 'active' : ''}`}
                    onClick={() => setPreviewActiveQuestionIndex(idx)}
                  >
                    Question {idx + 1}
                    <span className="tab-pts">{q.maxPoints} pts</span>
                  </button>
                ))}
              </nav>

              {/* Active Question Simulator */}
              {(() => {
                const activeQ = assessment.questions[previewActiveQuestionIndex];
                if (!activeQ) return null;
                const outputState = previewOutputs[activeQ.id] || null;

                return (
                  <div className="preview-question-stage">
                    <div className="preview-q-card">
                      <div className="preview-q-header">
                        <h3>{activeQ.title}</h3>
                        <span className="preview-pts-badge">{activeQ.maxPoints} Marks</span>
                      </div>

                      <div className="preview-instructions">
                        <pre className="plain-instructions">{activeQ.instructions}</pre>
                      </div>

                      <div className="preview-code-block">
                        <div className="preview-code-top">
                          <span>PYTHON 3 · STUDENT WORKSPACE</span>
                          <button
                            type="button"
                            className="btn-preview-run"
                            onClick={() => handleRunPreviewCode(activeQ.id)}
                            disabled={previewRunning}
                          >
                            {previewRunning ? 'Executing...' : '▶ Run Live'}
                          </button>
                        </div>
                        <textarea
                          className="preview-code-textarea"
                          rows={Math.max(6, (previewCodeMap[activeQ.id] || '').split('\n').length + 2)}
                          value={previewCodeMap[activeQ.id] || ''}
                          onChange={(e) => setPreviewCodeMap({ ...previewCodeMap, [activeQ.id]: e.target.value })}
                          spellCheck="false"
                        />
                      </div>

                      {outputState && (
                        <div className="preview-terminal">
                          <div className="preview-terminal-bar">TERMINAL OUTPUT</div>
                          {outputState.error ? (
                            <pre className="terminal-err">{outputState.error}</pre>
                          ) : (
                            <pre className="terminal-out">{outputState.output}</pre>
                          )}
                        </div>
                      )}
                    </div>

                    <footer className="preview-stage-footer">
                      <button
                        type="button"
                        className="btn-admin-secondary btn-sm"
                        disabled={previewActiveQuestionIndex === 0}
                        onClick={() => setPreviewActiveQuestionIndex(previewActiveQuestionIndex - 1)}
                      >
                        ← Previous
                      </button>
                      <span>
                        Question {previewActiveQuestionIndex + 1} of {assessment.questions.length}
                      </span>
                      <button
                        type="button"
                        className="btn-admin-primary btn-sm"
                        disabled={previewActiveQuestionIndex === assessment.questions.length - 1}
                        onClick={() => setPreviewActiveQuestionIndex(previewActiveQuestionIndex + 1)}
                      >
                        Next Question →
                      </button>
                    </footer>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers for default question templates
function generateDefaultStarter(qId, title = '', moduleNum = 4) {
  if (qId.includes('h1') || title.toLowerCase().includes('duplicate')) {
    return `numbers = [10, 56, 36, 87, 66, 99, 21, 96, 56, 67, 98, 66, 21, 87, 10, 98]
result_list = []

# Deduplicate numbers preserving the order of first appearance:
# Store result in: result_list
`;
  }
  if (qId.includes('h2') || title.toLowerCase().includes('greater')) {
    return `input_numbers = [4, 12, 7, 25, 9, 10, 31, 2]
greater_than_10 = []

# Filter numbers strictly greater than 10 into: greater_than_10
`;
  }
  return `# Python 3 Starter Code for ${title || 'Question'}:
# Define variables and solution logic below:
result = None
`;
}

function generateDefaultHiddenTest(qId, title = '', targetVars = []) {
  if (qId.includes('h1') || title.toLowerCase().includes('duplicate')) {
    return `assert isinstance(result_list, list), "result_list must be a list"
assert len(result_list) == len(dict.fromkeys(numbers)), "Incorrect deduplication count"
assert result_list == [10, 56, 36, 87, 66, 99, 21, 96, 67, 98], "List values do not match expected sequence"`;
  }
  if (qId.includes('h2') || title.toLowerCase().includes('greater')) {
    return `assert isinstance(greater_than_10, list), "greater_than_10 must be a list"
assert greater_than_10 == [12, 25, 31], "Incorrect values filtered"`;
  }
  if (targetVars && targetVars.length > 0) {
    return targetVars.map((v) => `assert '${v}' in globals(), "Variable ${v} must be defined"`).join('\n');
  }
  return `assert 'result' in globals(), "Variable result must be defined"`;
}
