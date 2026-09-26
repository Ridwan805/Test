import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { runPythonCode, gradeHomework, gradeCodingQuiz } from '../../utils/pyodideRunner';

export default function AssessmentWorksheet({
  courseSlug = 'intro-to-python',
  assessmentType = 'homework', // 'homework' or 'quiz'
  onSubmitted = () => {}
}) {
  const { user } = useContext(AuthContext);
  const isAdmin = Boolean(user?.is_staff);

  const [assessmentData, setAssessmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Student code per question
  const [studentCode, setStudentCode] = useState({});
  // Execution output per question
  const [outputs, setOutputs] = useState({});
  // Running state per question
  const [runningQuestions, setRunningQuestions] = useState({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(0);

  const isHomework = assessmentType === 'homework';
  const notebookPath = isHomework ? 'module-2-homework.ipynb' : 'module-2-coding-quiz.ipynb';

  // Fetch assessment metadata and previous attempts
  useEffect(() => {
    let isMounted = true;
    async function fetchAssessment() {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      try {
        const res = await fetch(`/api/courses/${courseSlug}/assessments/${assessmentType}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
          throw new Error('Failed to load assessment details.');
        }

        const data = await res.json();
        if (isMounted) {
          setAssessmentData(data);

          // Populate initial starter code for each question
          const initialCode = {};
          if (data.assessment?.questions) {
            data.assessment.questions.forEach((q) => {
              if (isHomework) {
                if (q.id === 'hw-q1') {
                  initialCode[q.id] = 'a = 12\nb = 4\n\naddition_result = a + b\nsubtraction_result = a - b\nmultiplication_result = a * b\n\nprint("Addition:", addition_result)\nprint("Subtraction:", subtraction_result)\nprint("Multiplication:", multiplication_result)';
                } else if (q.id === 'hw-q2') {
                  initialCode[q.id] = 'length = 10\nbreadth = 5\n\narea = length * breadth\nperimeter = 2 * (length + breadth)\n\nprint("Area:", area)\nprint("Perimeter:", perimeter)';
                } else if (q.id === 'hw-q3') {
                  initialCode[q.id] = 'celsius_input = 25\nfahrenheit_result = (9 / 5) * celsius_input + 32\n\nfahrenheit_input = 77\ncelsius_result = (5 / 9) * (fahrenheit_input - 32)\n\nprint("Celsius to Fahrenheit:", fahrenheit_result)\nprint("Fahrenheit to Celsius:", celsius_result)';
                } else if (q.id === 'hw-q4') {
                  initialCode[q.id] = 'num_4digit = 3564\n\n# Use floor division (//)\nleftmost_digit = num_4digit // 1000\n\nprint("Leftmost digit:", leftmost_digit)';
                } else if (q.id === 'hw-q5') {
                  initialCode[q.id] = 'num_input = 7895\n\n# Use modulus (%)\nrightmost_digit = num_input % 10\n\nprint("Rightmost digit:", rightmost_digit)';
                }
              } else {
                // Coding Quiz starter templates
                if (q.id === 'quiz-q1') {
                  initialCode[q.id] = 'price_text = "29.99"\nquantity_text = "8"\n\nprice = float(price_text)\nquantity = int(quantity_text)\n\nprint("Price:", price, type(price))\nprint("Quantity:", quantity, type(quantity))';
                } else if (q.id === 'quiz-q2') {
                  initialCode[q.id] = 'total_cost = price * quantity\nhalf_cost = total_cost / 2\nwhole_units_per_pack = quantity // 3\nremaining_units = quantity % 3\n\nprint("Total Cost:", total_cost)\nprint("Half Cost:", half_cost)\nprint("Whole Units Per Pack:", whole_units_per_pack)\nprint("Remaining Units:", remaining_units)';
                } else if (q.id === 'quiz-q3') {
                  initialCode[q.id] = 'first_name = "Ada"\nlast_name = "Lovelace"\n\nfull_name = first_name + " " + last_name\nfull_name_upper = full_name.upper()\nname_length = len(full_name)\n\nprint("Full Name:", full_name)\nprint("Uppercase:", full_name_upper)\nprint("Length:", name_length)';
                } else if (q.id === 'quiz-q4') {
                  initialCode[q.id] = 'word = "Algorithms"\n\nfirst_char = word[0]\nlast_char = word[-1]\nfirst_three = word[:3]\nreversed_word = word[::-1]\n\nprint("First:", first_char)\nprint("Last:", last_char)\nprint("First Three:", first_three)\nprint("Reversed:", reversed_word)';
                } else if (q.id === 'quiz-q5') {
                  initialCode[q.id] = 'same_value = (quantity == name_length)\nquantity_larger = (quantity > name_length)\ndifferent_value = (quantity != name_length)\n\nprint("Same Value:", same_value)\nprint("Quantity Larger:", quantity_larger)\nprint("Different Value:", different_value)';
                } else if (q.id === 'quiz-q6') {
                  initialCode[q.id] = 'logic_and = (quantity > 5 and name_length > 5)\nlogic_or = (quantity < 10 or name_length < 10)\nlogic_not = not (quantity == name_length)\n\nprint("Logic AND:", logic_and)\nprint("Logic OR:", logic_or)\nprint("Logic NOT:", logic_not)';
                }
              }
            });
          }
          setStudentCode(initialCode);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAssessment();
    return () => {
      isMounted = false;
    };
  }, [courseSlug, assessmentType, isHomework]);

  // Handle running a single question's code
  const handleRunQuestion = async (qId) => {
    setRunningQuestions((prev) => ({ ...prev, [qId]: true }));
    const code = studentCode[qId] || '';
    const res = await runPythonCode(code);
    setOutputs((prev) => ({
      ...prev,
      [qId]: { output: res.output, error: res.error }
    }));
    setRunningQuestions((prev) => ({ ...prev, [qId]: false }));
  };

  // Handle assessment submission and grading
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const token = localStorage.getItem('access_token');

    try {
      // 1. Run automated grading in Pyodide
      const questionResults = isHomework
        ? await gradeHomework(studentCode)
        : await gradeCodingQuiz(studentCode);

      // 2. Submit to backend API
      const res = await fetch(`/api/courses/${courseSlug}/assessments/${assessmentType}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questionResults,
          submittedCode: studentCode
        })
      });

      if (!res.ok) {
        throw new Error('Failed to record assessment score on server.');
      }

      const data = await res.json();
      setSubmissionResult(data);

      // Refresh attempts in assessmentData
      if (data.attempt) {
        setAssessmentData((prev) => {
          if (!prev) return prev;
          const updatedAttempts = [data.attempt, ...(prev.attempts || [])];
          return {
            ...prev,
            attempts: updatedAttempts,
            bestScore: Math.max(prev.bestScore || 0, data.attempt.earnedPoints),
            bestPercentage: Math.max(prev.bestPercentage || 0, data.attempt.percentage),
            totalAttempts: updatedAttempts.length
          };
        });
      }

      onSubmitted(data);
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      // Scroll to top of results
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  const handleRetry = () => {
    setSubmissionResult(null);
  };

  if (loading) {
    return (
      <div className="worksheet-loading">
        <div className="jupyter-spinner" />
        <p>Loading assessment worksheet...</p>
      </div>
    );
  }

  if (error || !assessmentData) {
    return (
      <div className="worksheet-error">
        <h3>Could not load assessment</h3>
        <p>{error || 'Assessment not found.'}</p>
      </div>
    );
  }

  const { assessment, attempts = [], bestScore = 0, bestPercentage = 0 } = assessmentData;
  const adminParam = isAdmin ? '&admin=1' : '&admin=0';
  const fullNotebookUrl = `/lite/notebooks/index.html?path=${encodeURIComponent(notebookPath)}${adminParam}`;

  return (
    <div className="assessment-worksheet">
      {/* Assessment Header Card */}
      <div className="worksheet-header-card">
        <div className="worksheet-header-top">
          <div className="worksheet-badges">
            <span className="pill-badge pill-type">GRADED ASSESSMENT</span>
            <span className="pill-badge pill-level">
              {isHomework ? 'WEIGHT: 40%' : 'WEIGHT: 60%'}
            </span>
            <span className="pill-badge pill-points">
              MAX: {assessment.maxPoints} MARKS
            </span>
            {bestScore > 0 && (
              <span className="pill-badge pill-best">
                BEST: {bestScore} / {assessment.maxPoints} ({bestPercentage}%)
              </span>
            )}
          </div>
          <a
            href={fullNotebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-open-notebook-tab"
            title="Open standalone notebook in separate tab"
          >
            ↗ Open in JupyterLite Notebook
          </a>
        </div>

        <h1 className="worksheet-title">{assessment.title}</h1>
        <p className="worksheet-description">{assessment.description}</p>

        <div className="worksheet-notice">
          <span className="notice-icon">ℹ️</span>
          <span>
            <strong>Distraction-Free Coding Worksheet:</strong> Enter your solution in each designated answer cell below, click <strong>Run Code</strong> to test, and click <strong>Submit {isHomework ? 'Homework' : 'Coding Quiz'}</strong> when complete. You may retry to improve your score.
          </span>
        </div>
      </div>

      {/* Submission Results Panel (Rendered after submit or if viewing previous attempt) */}
      {submissionResult && (
        <div className="submission-result-modal">
          <div className="result-card-header">
            <div>
              <span className="result-pill">ASSESSMENT RESULTS</span>
              <h2 className="result-title">
                {isHomework ? 'Module 2 Homework Result' : 'Module 2 Coding Quiz Result'}
              </h2>
            </div>
            <div className="result-score-box">
              <span className="score-number">
                {submissionResult.attempt.earnedPoints} / {submissionResult.attempt.maxPoints}
              </span>
              <span className="score-percentage">
                {submissionResult.attempt.percentage}%
              </span>
            </div>
          </div>

          {/* Module 2 Combined Progression Breakdown */}
          {submissionResult.moduleGradeSummary && (
            <div className="module-grade-banner">
              <div className="banner-left">
                <span className="banner-pre">MODULE 2 PROGRESSION GRADE</span>
                <h3 className="banner-grade">
                  Combined Grade: <strong>{submissionResult.moduleGradeSummary.moduleGrade}%</strong>
                </h3>
                <span className="banner-formula">
                  (Best Homework: {submissionResult.moduleGradeSummary.homework?.bestPercentage}% × 40%) + (Best Quiz: {submissionResult.moduleGradeSummary.quiz?.bestPercentage}% × 60%)
                </span>
              </div>
              <div className="banner-right">
                {submissionResult.moduleGradeSummary.passed ? (
                  <div className="status-pass-badge">
                    <span className="pass-icon">✓</span>
                    <div>
                      <strong>PASSED MODULE 2 (≥ 80%)</strong>
                      <p>Module 3 is now unlocked!</p>
                    </div>
                  </div>
                ) : (
                  <div className="status-locked-badge">
                    <span className="lock-icon">🔒</span>
                    <div>
                      <strong>NOT YET PASSED (Need 80%)</strong>
                      <p>Module 3 remains locked. Retry to improve your score.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question by Question Marks Breakdown */}
          <div className="results-table-section">
            <h4 className="section-title">Question-by-Question Marks Breakdown</h4>
            <div className="breakdown-list">
              {submissionResult.attempt.questionResults?.map((qr, idx) => (
                <div key={idx} className={`breakdown-item ${qr.passed ? 'passed' : 'failed'}`}>
                  <div className="breakdown-top">
                    <span className="breakdown-q-title">{qr.title}</span>
                    <span className={`breakdown-q-marks ${qr.passed ? 'green' : 'amber'}`}>
                      {qr.earnedPoints} / {qr.maxPoints} Marks
                    </span>
                  </div>
                  {qr.checks && qr.checks.length > 0 && (
                    <ul className="breakdown-checks">
                      {qr.checks.map((chk, cIdx) => (
                        <li key={cIdx} className={chk.passed ? 'chk-pass' : 'chk-fail'}>
                          <span className="chk-icon">{chk.passed ? '✓' : '✗'}</span>
                          <span>{chk.name}: <em>{chk.message}</em></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="result-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRetry}
            >
              ↺ Retry Assessment
            </button>
          </div>
        </div>
      )}

      {/* Questions Form Area */}
      <div className="worksheet-questions-list">
        {assessment.questions?.map((q, idx) => {
          const qOutput = outputs[q.id];
          const isRunning = runningQuestions[q.id];

          return (
            <div key={q.id} className="worksheet-question-card">
              <div className="question-header">
                <div className="q-title-group">
                  <span className="q-badge">QUESTION {idx + 1}</span>
                  <h3 className="q-title">{q.title}</h3>
                </div>
                <span className="q-marks-pill">{q.maxPoints} MARKS</span>
              </div>

              {q.instructions && (
                <div className="q-instructions">
                  <p>{q.instructions}</p>
                </div>
              )}

              {/* Code Editor */}
              <div className="q-code-area">
                <div className="code-area-header">
                  <span className="editor-label">YOUR CODE</span>
                  <span className="editor-lang">PYTHON 3 · PYODIDE</span>
                </div>
                <textarea
                  className="code-textarea"
                  value={studentCode[q.id] || ''}
                  onChange={(e) =>
                    setStudentCode({ ...studentCode, [q.id]: e.target.value })
                  }
                  rows={8}
                  spellCheck="false"
                  placeholder="# Write your Python solution here..."
                />
                <div className="code-area-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-run"
                    onClick={() => handleRunQuestion(q.id)}
                    disabled={isRunning}
                  >
                    {isRunning ? 'Running...' : '▶ Run Code'}
                  </button>
                </div>
              </div>

              {/* Console Output */}
              {qOutput && (
                <div className={`q-console-output ${qOutput.error ? 'has-error' : ''}`}>
                  <div className="console-header">
                    <span className="console-dot red" />
                    <span className="console-dot yellow" />
                    <span className="console-dot green" />
                    <span className="console-label">
                      {qOutput.error ? 'ERROR CONSOLE' : 'OUTPUT CONSOLE'}
                    </span>
                  </div>
                  <pre className="console-pre">
                    <code>{qOutput.error || qOutput.output || '(No printed output)'}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Final Submit Section */}
      <div className="worksheet-submit-card">
        <div>
          <h3>Ready to Submit?</h3>
          <p>
            Submitting will evaluate all {assessment.questions?.length} problems with automated checks and record your marks in your scholar profile.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-submit-assessment"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Grading Assessment...'
            : `Submit ${isHomework ? 'Homework (40 Marks)' : 'Coding Quiz (20 Marks)'} →`}
        </button>
      </div>

      {/* Previous Attempts History */}
      {attempts.length > 0 && (
        <div className="worksheet-history-card">
          <h4>Your Submission History ({attempts.length} attempts)</h4>
          <div className="history-table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Attempt #</th>
                  <th>Date & Time</th>
                  <th>Score</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((att, attIdx) => (
                  <tr key={att._id || attIdx}>
                    <td>Attempt {att.attemptNumber}</td>
                    <td>{new Date(att.submittedAt).toLocaleString()}</td>
                    <td>
                      <strong>
                        {att.earnedPoints} / {att.maxPoints}
                      </strong>
                    </td>
                    <td>
                      <span className="history-pct">{att.percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
