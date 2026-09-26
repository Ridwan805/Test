import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  runPythonCode,
  gradeHomework,
  gradeCodingQuiz,
  gradeModule3Homework,
  gradeModule3Quiz
} from '../../utils/pyodideRunner';

export default function AssessmentWorksheet({
  courseSlug = 'intro-to-python',
  assessmentType = 'homework', // 'homework' or 'quiz'
  moduleNumber = 2,
  onSubmitted = () => {}
}) {
  const { user } = useContext(AuthContext);
  const isAdmin = Boolean(user?.is_staff);

  const targetMod = parseInt(moduleNumber, 10) || 2;
  const isMod3 = targetMod === 3;
  const isHomework = assessmentType === 'homework';
  const notebookPath = isMod3
    ? (isHomework ? 'module-3-homework.ipynb' : 'module-3-coding-quiz.ipynb')
    : (isHomework ? 'module-2-homework.ipynb' : 'module-2-coding-quiz.ipynb');

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

  // Fetch assessment metadata and previous attempts
  useEffect(() => {
    let isMounted = true;
    async function fetchAssessment() {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      try {
        const res = await fetch(`/api/courses/${courseSlug}/assessments/${assessmentType}?module=${targetMod}`, {
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
              if (isMod3) {
                // Module 3 Homework starters
                if (isHomework) {
                  if (q.id === 'hw-a1') {
                    initialCode[q.id] = 'number = 8\n\n# Check if number is even or odd using % and if/else\nif number % 2 == 0:\n    result = "even"\nelse:\n    result = "odd"\n\nprint("The number is", result)';
                  } else if (q.id === 'hw-a2') {
                    initialCode[q.id] = 'text = "racecar"\n\n# Check if text reads the same forwards and backwards\nif text == text[::-1]:\n    is_palindrome = True\nelse:\n    is_palindrome = False\n\nprint("Is palindrome:", is_palindrome)';
                  } else if (q.id === 'hw-a3') {
                    initialCode[q.id] = 'temperature = 25\n\n# Classify: >30 hot, 20..30 perfect, 10..<20 chilly, <10 cold\nif temperature > 30:\n    suggestion = "hot"\nelif temperature >= 20:\n    suggestion = "perfect for a walk"\nelif temperature >= 10:\n    suggestion = "chilly"\nelse:\n    suggestion = "cold"\n\nprint("Weather suggestion:", suggestion)';
                  } else if (q.id === 'hw-a4') {
                    initialCode[q.id] = 'budget = 35\n\n# Classify: >50 fancy, 30..50 mid-range, 15..<30 casual, 10..<15 fast food, <10 stay home\nif budget > 50:\n    recommendation = "fancy restaurant"\nelif budget >= 30:\n    recommendation = "mid-range restaurant"\nelif budget >= 15:\n    recommendation = "casual dining"\nelif budget >= 10:\n    recommendation = "fast food"\nelse:\n    recommendation = "stay home"\n\nprint("Restaurant recommendation:", recommendation)';
                  } else if (q.id === 'hw-b1') {
                    initialCode[q.id] = 'age = 20\nlikes_action = True\n\n# Nested if-else recommendation\nif age >= 18:\n    if likes_action:\n        movie_recommendation = "action blockbuster"\n    else:\n        movie_recommendation = "drama or comedy"\nelse:\n    if likes_action:\n        movie_recommendation = "family action"\n    else:\n        movie_recommendation = "animated movie"\n\nprint("Recommended movie:", movie_recommendation)';
                  } else if (q.id === 'hw-c1') {
                    initialCode[q.id] = 'even_sum = 0\ncurrent_num = 1\n\n# Use a while loop to sum all even numbers between 1 and 100\nwhile current_num <= 100:\n    if current_num % 2 == 0:\n        even_sum += current_num\n    current_num += 1\n\nprint("Sum of even numbers 1..100:", even_sum)';
                  } else if (q.id === 'hw-c2') {
                    initialCode[q.id] = 'number = 5\ntable_results = []\ncounter = 1\n\n# Use a while loop to generate multiplication table up to 10\nwhile counter <= 10:\n    table_results.append(number * counter)\n    counter += 1\n\nprint("Multiplication table:", table_results)';
                  } else if (q.id === 'hw-c3') {
                    initialCode[q.id] = 'car_name = "Tesla"\nn = 3\ncar_list = []\ncount = 0\n\n# Use a while loop to repeat car_name n times\nwhile count < n:\n    car_list.append(car_name)\n    count += 1\n\nprint("Car list:", car_list)';
                  } else if (q.id === 'hw-c4') {
                    initialCode[q.id] = 'n = 5\nalternating_sum = 0\n\n# For loop: odd square added, even square subtracted\nfor i in range(1, n + 1):\n    if i % 2 != 0:\n        alternating_sum += i ** 2\n    else:\n        alternating_sum -= i ** 2\n\nprint("Alternating sum of squares:", alternating_sum)';
                  } else if (q.id === 'hw-c5') {
                    initialCode[q.id] = 'word = "hello"\nprefixes = []\n\n# Generate all prefixes using a for loop\nfor i in range(1, len(word) + 1):\n    prefixes.append(word[:i])\n\nprint("Prefixes:", prefixes)';
                  } else if (q.id === 'hw-c6') {
                    initialCode[q.id] = 'n = 5\nfactorial_result = 1\n\n# Calculate factorial of n using a for loop\nfor i in range(1, n + 1):\n    factorial_result *= i\n\nprint(f"{n}! =", factorial_result)';
                  }
                } else {
                  // Module 3 Quiz starters
                  if (q.id === 'quiz-q1') {
                    initialCode[q.id] = 'battery_level = 85\n\n# Determine battery_status using if/elif/else\nif battery_level >= 80:\n    battery_status = "High"\nelif battery_level >= 30:\n    battery_status = "Medium"\nelse:\n    battery_status = "Low"\n\nprint("Battery status:", battery_status)';
                  } else if (q.id === 'quiz-q2') {
                    initialCode[q.id] = 'age = 20\nhas_permission = True\n\n# Nested if-else for course access\nif age >= 18:\n    if has_permission:\n        access_result = "Access granted"\n    else:\n        access_result = "Permission required"\nelse:\n    access_result = "Age requirement not met"\n\nprint("Access result:", access_result)';
                  } else if (q.id === 'quiz-q3') {
                    initialCode[q.id] = 'n = 4\ncountdown_sum = 0\ncurrent = n\n\n# Use a while loop from n down to 1\nwhile current >= 1:\n    countdown_sum += current\n    current -= 1\n\nprint("Countdown sum:", countdown_sum)';
                  } else if (q.id === 'quiz-q4') {
                    initialCode[q.id] = 'n = 10\nmultiple_sum = 0\n\n# Use for and range() to sum multiples of 3 from 1 to n\nfor i in range(1, n + 1):\n    if i % 3 == 0:\n        multiple_sum += i\n\nprint("Sum of multiples of 3:", multiple_sum)';
                  } else if (q.id === 'quiz-q5') {
                    initialCode[q.id] = 'processed_sum = 0\n\n# for i in range(1, 21): skip if i % 3 == 0 (continue), break when i == 17\nfor i in range(1, 21):\n    if i == 17:\n        break\n    if i % 3 == 0:\n        continue\n    processed_sum += i\n\nprint("Processed sum:", processed_sum)';
                  } else if (q.id === 'quiz-q6') {
                    initialCode[q.id] = 'even_sum_pairs = 0\n\n# Nested loops for i and j from 1 to 4: count (i + j) % 2 == 0\nfor i in range(1, 5):\n    for j in range(1, 5):\n        if (i + j) % 2 == 0:\n            even_sum_pairs += 1\n\nprint("Even sum pairs count:", even_sum_pairs)';
                  }
                }
              } else {
                // Module 2 Homework starters
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
                  // Module 2 Coding Quiz starter templates
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
  }, [courseSlug, assessmentType, isHomework, targetMod, isMod3]);

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
      let questionResults;
      if (isMod3) {
        questionResults = isHomework
          ? await gradeModule3Homework(studentCode)
          : await gradeModule3Quiz(studentCode);
      } else {
        questionResults = isHomework
          ? await gradeHomework(studentCode)
          : await gradeCodingQuiz(studentCode);
      }

      // 2. Submit to backend API
      const res = await fetch(`/api/courses/${courseSlug}/assessments/${assessmentType}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questionResults,
          submittedCode: studentCode,
          moduleNumber: targetMod
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

      {/* Submission Results Panel */}
      {submissionResult && (
        <div className="submission-result-modal">
          <div className="result-card-header">
            <div>
              <span className="result-pill">ASSESSMENT RESULTS</span>
              <h2 className="result-title">
                {isHomework ? `Module ${targetMod} Homework Result` : `Module ${targetMod} Coding Quiz Result`}
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

          {/* Module Combined Progression Breakdown */}
          {submissionResult.moduleGradeSummary && (
            <div className="module-grade-banner">
              <div className="banner-left">
                <span className="banner-pre">MODULE {targetMod} PROGRESSION GRADE</span>
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
                      <strong>PASSED MODULE {targetMod} (≥ 80%)</strong>
                      <p>Module {targetMod + 1} is now unlocked!</p>
                    </div>
                  </div>
                ) : (
                  <div className="status-locked-badge">
                    <span className="lock-icon">🔒</span>
                    <div>
                      <strong>NOT YET PASSED (Need 80%)</strong>
                      <p>Module {targetMod + 1} remains locked. Retry to improve your score.</p>
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
