import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  runPythonCode,
  gradeHomework,
  gradeCodingQuiz,
  gradeModule3Homework,
  gradeModule3Quiz,
  gradeModule4Homework,
  gradeModule4Quiz
} from '../../utils/pyodideRunner';
import { apiFetch } from '../../utils/apiFetch';
import { getJupyterNotebookContent, extractCodeFromNotebook } from '../../utils/jupyterStorage';

export default function AssessmentWorksheet({
  courseSlug = 'intro-to-python',
  assessmentType = 'homework', // 'homework' or 'quiz'
  moduleNumber = 2,
  onSubmitted = () => {}
}) {
  const { user } = useContext(AuthContext);
  const isAdmin = user ? Boolean(user.is_staff) : localStorage.getItem('user_is_staff') === 'true';

  const targetMod = parseInt(moduleNumber, 10) || 2;
  const isMod4 = targetMod === 4;
  const isMod3 = targetMod === 3;
  const isHomework = assessmentType === 'homework';
  const notebookPath = isMod4
    ? (isHomework ? 'module-4-homework.ipynb' : 'module-4-coding-quiz.ipynb')
    : isMod3
    ? (isHomework ? 'module-3-homework.ipynb' : 'module-3-coding-quiz.ipynb')
    : (isHomework ? 'module-2-homework.ipynb' : 'module-2-coding-quiz.ipynb');

  const [assessmentData, setAssessmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockDetails, setLockDetails] = useState(null);

  // Student code per question
  const [studentCode, setStudentCode] = useState({});
  // Execution output per question
  const [outputs, setOutputs] = useState({});
  // Running state per question
  const [runningQuestions, setRunningQuestions] = useState({});

  // Submission & Notebook state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [viewMode, setViewMode] = useState('notebook');
  const [gradingStep, setGradingStep] = useState('');
  const [notebookKey, setNotebookKey] = useState(0);
  const [isEnlarged, setIsEnlarged] = useState(false);

  // Quiz Timer & Admin Controls State (Server-Authoritative)
  const timeLimitMinutes = assessmentData?.assessment?.timer?.durationMinutes ?? assessmentData?.assessment?.timeLimitMinutes ?? 30;
  const [timeRemaining, setTimeRemaining] = useState(timeLimitMinutes * 60);
  const [serverExpiresAt, setServerExpiresAt] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);
  const [adminMinutes, setAdminMinutes] = useState(30);
  const [isSavingTimer, setIsSavingTimer] = useState(false);
  const [adminTimerMsg, setAdminTimerMsg] = useState('');
  const hasAutoSubmittedRef = useRef(false);
  const handleNotebookSubmitRef = useRef();
  const handleSubmitRef = useRef();

  // Quiz Readiness Gate State
  const [quizStarted, setQuizStarted] = useState(isHomework);

  useEffect(() => {
    setViewMode('notebook');
    setSubmissionResult(null);
    hasAutoSubmittedRef.current = false;
    setIsEnlarged(false);
    setShowStartConfirmation(false);
    if (isHomework) {
      setQuizStarted(true);
    }
  }, [assessmentType, moduleNumber, courseSlug, targetMod, isHomework]);

  useEffect(() => {
    if (assessmentData?.assessment?.timeLimitMinutes !== undefined) {
      setAdminMinutes(assessmentData.assessment.timeLimitMinutes);
    }
  }, [assessmentData]);

  // Handle body overflow and Escape key for enlarged mode
  useEffect(() => {
    if (isEnlarged) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsEnlarged(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isEnlarged]);

  // Fetch assessment metadata and previous attempts
  useEffect(() => {
    let isMounted = true;
    async function fetchAssessment() {
      setLoading(true);
      setError(null);
      setIsLocked(false);
      setLockDetails(null);
      try {
        const res = await apiFetch(`/api/courses/${courseSlug}/assessments/${assessmentType}?module=${targetMod}`);

        if (res.status === 403) {
          const lockData = await res.json();
          if (isMounted) {
            setIsLocked(true);
            setLockDetails(lockData);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load assessment details.');
        }

        const data = await res.json();
        if (isMounted) {
          setAssessmentData(data);

          // Populate starter code or restore previously submitted code for each question
          const lastSubmittedCode = data.attempts?.[0]?.submittedCode || {};
          const initialCode = {};

          if (data.assessment?.questions) {
            data.assessment.questions.forEach((q) => {
              // If student previously submitted an answer, preserve their own work
              if (lastSubmittedCode[q.id]) {
                initialCode[q.id] = lastSubmittedCode[q.id];
                return;
              }

              if (isMod4) {
                // Module 4 Homework starters (unsolved templates)
                if (isHomework) {
                  if (q.id === 'hw-h1') {
                    initialCode[q.id] = 'numbers = [10, 56, 36, 87, 66, 99, 21, 96, 56, 67, 98, 66, 21, 87, 10, 98]\nresult_list = []\n\n# Deduplicate numbers without using set() or direct helper functions:\n# Preserve the order of first appearance and store in: result_list\n';
                  } else if (q.id === 'hw-h2') {
                    initialCode[q.id] = 'input_numbers = [4, 12, 7, 25, 9, 10, 31, 2]\ngreater_than_10 = []\n\n# Filter numbers strictly greater than 10 into: greater_than_10\n';
                  } else if (q.id === 'hw-h3') {
                    initialCode[q.id] = 'nested_list = [[1, 2, 3, 4], [5, 6, 7, 8]]\n\n# Flatten nested_list using list comprehension into: flat_list\nflat_list = []\n';
                  } else if (q.id === 'hw-h4') {
                    initialCode[q.id] = 'original_list = [1, 2, 3, 4]\nn = 2\nrotated_list = []\n\n# Shift elements of original_list right by n positions:\n# Store result in: rotated_list\n';
                  } else if (q.id === 'hw-h5') {
                    initialCode[q.id] = 'data_list = [1, 2, 2, 3, 3, 3]\nfrequency_counts = {}\n\n# Count frequency of each element in data_list:\n# Store counts in dictionary: frequency_counts\n';
                  } else if (q.id === 'hw-h6') {
                    initialCode[q.id] = 'num_list = [12, 35, 1, 10, 34, 1]\nsecond_largest = None\n\n# Find the second largest number in num_list:\n# Store result in: second_largest\n';
                  } else if (q.id === 'hw-h7') {
                    initialCode[q.id] = 'raw_string = "Hello World"\nchar_freq = {}\n\n# Convert to lowercase, exclude spaces, and count character frequencies:\n# Store resulting dictionary in: char_freq\n';
                  } else if (q.id === 'hw-h8') {
                    initialCode[q.id] = 'n = 3\nsquares_dict = {}\n\n# Create dictionary where keys are 1 through n and values are their squares:\n# Store in: squares_dict\n';
                  }
                } else {
                  // Module 4 Quiz starters (unsolved templates)
                  if (q.id === 'quiz-q1') {
                    initialCode[q.id] = 'inventory = ["pen", "book", "eraser", "pencil"]\nupdated_inventory = []\n\n# 1. Change "eraser" to "marker"\n# 2. Append "ruler"\n# 3. Insert "notebook" at index 1\n# 4. Remove "pen"\n# Store final list in: updated_inventory\n';
                  } else if (q.id === 'quiz-q2') {
                    initialCode[q.id] = '# Using list comprehension, generate squares of odd numbers from 1 to 15:\n# Store in: odd_squares\nodd_squares = []\n';
                  } else if (q.id === 'quiz-q3') {
                    initialCode[q.id] = 'matrix = [\n  [2, 4, 6],\n  [1, 3, 5],\n  [8, 10]\n]\nflat_values = []\n\n# Flatten matrix into 1D list using nested loops or list comprehension:\n# Store in: flat_values\n';
                  } else if (q.id === 'quiz-q4') {
                    initialCode[q.id] = 't1 = ("Python", "Java")\nt2 = ("C++", "JavaScript")\n\n# Concatenate t1 and t2 into: languages\n# Extract the middle two elements using slicing into: middle_languages\nlanguages = None\nmiddle_languages = None\n';
                  } else if (q.id === 'quiz-q5') {
                    initialCode[q.id] = 'stock = {\n  "pen": 10,\n  "book": 4,\n  "eraser": 7\n}\n\n# 1. Update "book" quantity to 8\n# 2. Add "marker": 5\n# 3. Extract the value for "eraser" into: eraser_stock\neraser_stock = None\n';
                  } else if (q.id === 'quiz-q6') {
                    initialCode[q.id] = 'scores = {\n  "Ava": 72,\n  "Liam": 91,\n  "Noah": 67,\n  "Mia": 88,\n  "Zoe": 95\n}\nhigh_scores = {}\n\n# Filter scores to include only entries where score >= 80:\n# Store in: high_scores\n';
                  }
                }
              } else if (isMod3) {
                // Module 3 Homework starters (unsolved templates)
                if (isHomework) {
                  if (q.id === 'hw-a1') {
                    initialCode[q.id] = 'number = 8\n\n# Write your if/else logic below:\n# Set result = "even" if number is even, or "odd" if number is odd\n';
                  } else if (q.id === 'hw-a2') {
                    initialCode[q.id] = 'text = "racecar"\n\n# Write your palindrome checking logic below:\n# Set is_palindrome = True if text is a palindrome, or False otherwise\n';
                  } else if (q.id === 'hw-a3') {
                    initialCode[q.id] = 'temperature = 25\n\n# Classify temperature into suggestion:\n# >30: "hot"\n# 20 to 30: "perfect for a walk"\n# 10 to <20: "chilly"\n# <10: "cold"\n# Store result in variable: suggestion\n';
                  } else if (q.id === 'hw-a4') {
                    initialCode[q.id] = 'budget = 35\n\n# Classify budget into recommendation:\n# >50: "fancy restaurant"\n# 30 to 50: "mid-range restaurant"\n# 15 to <30: "casual dining"\n# 10 to <15: "fast food"\n# <10: "stay home"\n# Store result in variable: recommendation\n';
                  } else if (q.id === 'hw-b1') {
                    initialCode[q.id] = 'age = 20\nlikes_action = True\n\n# Use nested if-else statements to determine movie_recommendation:\n# If age >= 18:\n#     if likes_action: "action blockbuster"\n#     else: "drama or comedy"\n# Else:\n#     if likes_action: "family action"\n#     else: "animated movie"\n# Store result in variable: movie_recommendation\n';
                  } else if (q.id === 'hw-c1') {
                    initialCode[q.id] = 'even_sum = 0\ncurrent_num = 1\n\n# Use a while loop to sum all even numbers between 1 and 100:\n# Accumulate into: even_sum\n';
                  } else if (q.id === 'hw-c2') {
                    initialCode[q.id] = 'number = 5\ntable_results = []\ncounter = 1\n\n# Use a while loop to generate the multiplication table of number up to 10:\n# Append each product to: table_results\n';
                  } else if (q.id === 'hw-c3') {
                    initialCode[q.id] = 'car_name = "Tesla"\nn = 3\ncar_list = []\ncount = 0\n\n# Use a while loop to append car_name to car_list n times:\n';
                  } else if (q.id === 'hw-c4') {
                    initialCode[q.id] = 'n = 5\nalternating_sum = 0\n\n# Use a for loop with range(1, n + 1):\n# Add the square of odd numbers (i ** 2)\n# Subtract the square of even numbers (i ** 2)\n# Accumulate into: alternating_sum\n';
                  } else if (q.id === 'hw-c5') {
                    initialCode[q.id] = 'word = "hello"\nprefixes = []\n\n# Use a for loop to append all prefixes of word into prefixes:\n# e.g., ["h", "he", "hel", "hell", "hello"]\n';
                  } else if (q.id === 'hw-c6') {
                    initialCode[q.id] = 'n = 5\nfactorial_result = 1\n\n# Calculate the factorial of n using a for loop:\n# Store the final product in: factorial_result\n';
                  }
                } else {
                  // Module 3 Quiz starters (unsolved templates)
                  if (q.id === 'quiz-q1') {
                    initialCode[q.id] = 'battery_level = 85\n\n# Determine battery_status using if/elif/else:\n# >= 80: "High"\n# >= 30 and < 80: "Medium"\n# < 30: "Low"\n# Store result in variable: battery_status\n';
                  } else if (q.id === 'quiz-q2') {
                    initialCode[q.id] = 'age = 20\nhas_permission = True\n\n# Use nested if-else to determine access_result:\n# If age >= 18:\n#     if has_permission: "Access granted"\n#     else: "Permission required"\n# Else:\n#     "Age requirement not met"\n# Store result in variable: access_result\n';
                  } else if (q.id === 'quiz-q3') {
                    initialCode[q.id] = 'n = 4\ncountdown_sum = 0\ncurrent = n\n\n# Use a while loop counting down from n to 1:\n# Add each value of current to countdown_sum\n';
                  } else if (q.id === 'quiz-q4') {
                    initialCode[q.id] = 'n = 10\nmultiple_sum = 0\n\n# Use a for loop and range() to sum all multiples of 3 from 1 to n:\n# Store the total in: multiple_sum\n';
                  } else if (q.id === 'quiz-q5') {
                    initialCode[q.id] = 'processed_sum = 0\n\n# Loop through numbers 1 to 20 using range(1, 21):\n# - Break the loop if the number is 17\n# - Skip the number using continue if it is divisible by 3\n# - Otherwise, add the number to processed_sum\n';
                  } else if (q.id === 'quiz-q6') {
                    initialCode[q.id] = 'even_sum_pairs = 0\n\n# Use nested loops (i from 1 to 4, j from 1 to 4):\n# Count how many pairs (i, j) have an even sum: (i + j) % 2 == 0\n# Increment: even_sum_pairs\n';
                  }
                }
              } else {
                // Module 2 Homework starters (unsolved templates)
                if (isHomework) {
                  if (q.id === 'hw-q1') {
                    initialCode[q.id] = 'a = 12\nb = 4\n\n# Calculate addition, subtraction, and multiplication:\n# Store in: addition_result, subtraction_result, multiplication_result\n';
                  } else if (q.id === 'hw-q2') {
                    initialCode[q.id] = 'length = 10\nbreadth = 5\n\n# Calculate area and perimeter of the rectangle:\n# Store in: area, perimeter\n';
                  } else if (q.id === 'hw-q3') {
                    initialCode[q.id] = 'celsius_input = 25\nfahrenheit_input = 77\n\n# Convert celsius_input to Fahrenheit: fahrenheit_result\n# Convert fahrenheit_input to Celsius: celsius_result\n';
                  } else if (q.id === 'hw-q4') {
                    initialCode[q.id] = 'num_4digit = 3564\n\n# Use floor division (//) to extract the leftmost digit:\n# Store in: leftmost_digit\n';
                  } else if (q.id === 'hw-q5') {
                    initialCode[q.id] = 'num_input = 7895\n\n# Use modulus (%) to extract the rightmost digit:\n# Store in: rightmost_digit\n';
                  }
                } else {
                  // Module 2 Coding Quiz starters (unsolved templates)
                  if (q.id === 'quiz-q1') {
                    initialCode[q.id] = 'price_text = "29.99"\nquantity_text = "8"\n\n# Convert price_text to float: price\n# Convert quantity_text to integer: quantity\n';
                  } else if (q.id === 'quiz-q2') {
                    initialCode[q.id] = 'price = 29.99\nquantity = 8\n\n# Using price and quantity, calculate:\n# total_cost, half_cost, whole_units_per_pack, remaining_units\n';
                  } else if (q.id === 'quiz-q3') {
                    initialCode[q.id] = 'first_name = "Ada"\nlast_name = "Lovelace"\n\n# Concatenate with a space to create: full_name\n# Convert to uppercase: full_name_upper\n# Find character length: name_length\n';
                  } else if (q.id === 'quiz-q4') {
                    initialCode[q.id] = 'word = "Algorithms"\n\n# Use indexing and slicing to extract:\n# first_char, last_char, first_three, reversed_word\n';
                  } else if (q.id === 'quiz-q5') {
                    initialCode[q.id] = 'quantity = 8\nname_length = 12\n\n# Use comparison operators (==, >, !=):\n# Set: same_value, quantity_larger, different_value\n';
                  } else if (q.id === 'quiz-q6') {
                    initialCode[q.id] = 'quantity = 8\nname_length = 12\n\n# Use logical operators (and, or, not):\n# Set: logic_and, logic_or, logic_not\n';
                  }
                }
              }
            });
          }
          setStudentCode(initialCode);

          // Configure server-authoritative quiz timer session
          if (!isHomework) {
            if (data.activeQuizSession) {
              setServerExpiresAt(data.activeQuizSession.expiresAt);
              setTimeRemaining(data.activeQuizSession.remainingSeconds);
              setQuizStarted(true);
              setTimerActive(data.activeQuizSession.remainingSeconds > 0 && !submissionResult);
            } else {
              setServerExpiresAt(null);
              setQuizStarted(false);
              setTimerActive(false);
              const duration = data.assessment?.timer?.durationMinutes || data.assessment?.timeLimitMinutes || 30;
              setTimeRemaining(duration * 60);
            }
          }
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
  }, [courseSlug, assessmentType, isHomework, targetMod, isMod3, isMod4]);

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
      if (isMod4) {
        questionResults = isHomework
          ? await gradeModule4Homework(studentCode)
          : await gradeModule4Quiz(studentCode);
      } else if (isMod3) {
        questionResults = isHomework
          ? await gradeModule3Homework(studentCode)
          : await gradeModule3Quiz(studentCode);
      } else {
        questionResults = isHomework
          ? await gradeHomework(studentCode)
          : await gradeCodingQuiz(studentCode);
      }

      // 2. Submit to backend API
      const res = await apiFetch(`/api/courses/${courseSlug}/assessments/${assessmentType}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionResults,
          submittedCode: studentCode,
          moduleNumber: targetMod,
          submissionReason: (!isHomework && timeRemaining <= 0) ? 'time_expired' : 'manual'
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

      setTimerActive(false);
      onSubmitted(data);
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        document.getElementById('assessment-results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleNotebookSubmit = async () => {
    if (isEnlarged) setIsEnlarged(false);
    setIsSubmitting(true);
    setGradingStep('Reading your notebook from workspace storage...');

    try {
      // 1. Attempt Ctrl+S on embedded iframe
      try {
        const frame = document.getElementById('integrated-homework-jupyter-frame');
        if (frame && frame.contentWindow) {
          frame.contentWindow.document?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 's', ctrlKey: true, metaKey: true, bubbles: true })
          );
        }
      } catch (e) {
        // Ignore iframe cross-origin if any
      }

      await new Promise((r) => setTimeout(r, 450));

      // 2. Fetch notebook from IndexedDB / local storage
      const nb = await getJupyterNotebookContent(notebookPath);
      if (!nb) {
        throw new Error(
          `Could not find your ${isHomework ? 'homework' : 'quiz'} notebook in workspace storage. Please make sure the notebook is loaded and you have tested your cells.`
        );
      }

      setGradingStep('Extracting code solutions from notebook cells...');
      const questionsList = assessmentData?.assessment?.questions || [];
      const extractedCode = extractCodeFromNotebook(nb, questionsList, targetMod);

      // Keep studentCode in state synchronized
      setStudentCode((prev) => ({ ...prev, ...extractedCode }));

      setGradingStep('Running automated grading test suite in WebAssembly...');
      let questionResults;
      if (isMod4) {
        questionResults = isHomework
          ? await gradeModule4Homework(extractedCode)
          : await gradeModule4Quiz(extractedCode);
      } else if (isMod3) {
        questionResults = isHomework
          ? await gradeModule3Homework(extractedCode)
          : await gradeModule3Quiz(extractedCode);
      } else {
        questionResults = isHomework
          ? await gradeHomework(extractedCode)
          : await gradeCodingQuiz(extractedCode);
      }

      setGradingStep('Recording official score and course progression...');
      const res = await apiFetch(`/api/courses/${courseSlug}/assessments/${assessmentType}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionResults,
          submittedCode: extractedCode,
          moduleNumber: targetMod,
          submissionReason: (!isHomework && timeRemaining <= 0) ? 'time_expired' : 'manual'
        })
      });

      if (!res.ok) {
        throw new Error('Failed to record assessment score on server.');
      }

      const data = await res.json();
      setSubmissionResult(data);

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

      setTimerActive(false);
      onSubmitted(data);
    } catch (err) {
      alert(`Grading error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setGradingStep('');
      setTimeout(() => {
        document.getElementById('assessment-results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Keep refs current for countdown interval
  handleNotebookSubmitRef.current = handleNotebookSubmit;
  handleSubmitRef.current = handleSubmit;

  // Server-Authoritative Countdown timer effect
  useEffect(() => {
    // Admins are supervisors inspecting the quiz and are never force-submitted or timed out
    if (isHomework || !timerActive || submissionResult || isSubmitting || !quizStarted || isAdmin) return;

    const interval = setInterval(() => {
      let left;
      if (serverExpiresAt) {
        left = Math.max(0, Math.floor((new Date(serverExpiresAt).getTime() - Date.now()) / 1000));
      } else {
        left = Math.max(0, timeRemaining - 1);
      }

      setTimeRemaining(left);

      if (left <= 0) {
        clearInterval(interval);
        setTimerActive(false);
        if (!hasAutoSubmittedRef.current) {
          hasAutoSubmittedRef.current = true;
          alert('⏰ Quiz time has expired! Your answers are being submitted automatically for official grading.');
          if (viewMode === 'notebook') {
            handleNotebookSubmitRef.current?.();
          } else {
            handleSubmitRef.current?.();
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isHomework, timerActive, submissionResult, isSubmitting, viewMode, quizStarted, serverExpiresAt, isAdmin]);

  const handlePromptStartQuiz = () => {
    setShowStartConfirmation(true);
  };

  const handleConfirmStartQuiz = async () => {
    try {
      setShowStartConfirmation(false);
      const res = await apiFetch(`/api/courses/${courseSlug}/assessments/quiz/start?module=${targetMod}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleNumber: targetMod })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to start quiz session on server');
      }
      const data = await res.json();
      setServerExpiresAt(data.expiresAt);
      setTimeRemaining(data.remainingSeconds);
      setTimerActive(true);
      setQuizStarted(true);
      hasAutoSubmittedRef.current = false;
    } catch (err) {
      alert(`Could not start quiz: ${err.message}`);
    }
  };

  const handleRetry = () => {
    setSubmissionResult(null);
    hasAutoSubmittedRef.current = false;
    if (!isHomework) {
      setServerExpiresAt(null);
      setQuizStarted(false);
      setTimerActive(false);
      const duration = assessmentData?.assessment?.timer?.durationMinutes || assessmentData?.assessment?.timeLimitMinutes || 30;
      setTimeRemaining(duration * 60);
    }
  };

  const handleSaveTimer = async () => {
    setIsSavingTimer(true);
    setAdminTimerMsg('');
    try {
      const res = await apiFetch(`/api/courses/${courseSlug}/assessments/${assessmentType}/timer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeLimitMinutes: adminMinutes,
          moduleNumber: targetMod
        })
      });
      if (!res.ok) throw new Error('Failed to update timer on server');
      const data = await res.json();
      setAssessmentData((prev) => ({
        ...prev,
        assessment: {
          ...prev.assessment,
          timeLimitMinutes: data.timeLimitMinutes
        }
      }));
      setTimeRemaining(data.timeLimitMinutes * 60);
      setTimerActive(true);
      hasAutoSubmittedRef.current = false;
      setAdminTimerMsg(`✓ Saved! Quiz timer set to ${data.timeLimitMinutes}m.`);
      setTimeout(() => setAdminTimerMsg(''), 4000);
    } catch (err) {
      setAdminTimerMsg(`Error: ${err.message}`);
    } finally {
      setIsSavingTimer(false);
    }
  };

  const handleResetStudentTimer = () => {
    const limitMins = assessmentData?.assessment?.timer?.durationMinutes ?? assessmentData?.assessment?.timeLimitMinutes ?? 30;
    setTimeRemaining(limitMins * 60);
    setTimerActive(true);
    hasAutoSubmittedRef.current = false;
    setAdminTimerMsg('✓ Timer reset to full duration.');
    setTimeout(() => setAdminTimerMsg(''), 4000);
  };

  const formatTimer = (secs) => {
    if (secs <= 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerStatusClass = timeRemaining <= 120
    ? 'timer-urgent'
    : timeRemaining <= 300
    ? 'timer-warning'
    : 'timer-normal';

  if (loading) {
    return (
      <div className="worksheet-loading">
        <div className="jupyter-spinner" />
        <p>Loading assessment worksheet...</p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="worksheet-locked-container" style={{ padding: '3.5rem 1.5rem', maxWidth: '720px', margin: '2rem auto', textAlign: 'center', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '3.2rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', marginBottom: '0.75rem' }}>
          {lockDetails?.reason === 'homework_required'
            ? 'Homework Completion Required'
            : lockDetails?.reason === 'previous_lesson_incomplete'
            ? 'Previous Lesson Incomplete'
            : 'Assessment Locked'}
        </h2>
        <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          {lockDetails?.detail || 'You must complete earlier required content before accessing this assessment.'}
        </p>
        {lockDetails?.requiredLesson && (
          <div style={{ marginTop: '1.5rem' }}>
            <a
              href={`/learn/${courseSlug}/module/${targetMod}/lesson/${lockDetails.requiredLesson.slug}`}
              className="btn btn-primary"
            >
              Go to Lesson {lockDetails.requiredLesson.lessonNumber}: {lockDetails.requiredLesson.title} →
            </a>
          </div>
        )}
        {lockDetails?.requiredHomework && (
          <div style={{ marginTop: '1.5rem' }}>
            <a
              href={`/learn/${courseSlug}/module/${targetMod}/lesson/${lockDetails.requiredHomework.slug}`}
              className="btn btn-primary"
            >
              Go to Module {targetMod} Homework →
            </a>
          </div>
        )}
        <div style={{ marginTop: '1rem' }}>
          <a
            href={`/learn/${courseSlug}/module/${targetMod}`}
            className="btn btn-outline"
            style={{ marginLeft: '0.5rem' }}
          >
            ← Back to Module Overview
          </a>
        </div>
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

  // Quiz Readiness Gate (Asks student permission before starting the timed quiz; bypassed for admin supervisors)
  if (!isHomework && !quizStarted && !submissionResult && !isAdmin) {
    return (
      <div className="assessment-worksheet">
        <div className="quiz-readiness-card">
          <div className="readiness-hero-icon">⚡</div>
          <div className="readiness-badges">
            <span className="pill-badge pill-type">TIMED CODING ASSESSMENT</span>
            <span className="pill-badge pill-level">WEIGHT: 60%</span>
            <span className="pill-badge pill-points">MAX: {assessment.maxPoints} MARKS</span>
            <span className="pill-badge pill-time">⏱️ {assessment.timeLimitMinutes || 30} MINUTES</span>
          </div>

          <h1 className="readiness-title">{assessment.title}</h1>
          <p className="readiness-subtitle">
            You are about to start the official graded coding quiz for <strong>Module {targetMod}</strong>. Confirm your readiness to begin the timed examination.
          </p>

          <div className="readiness-instructions-grid">
            <div className="readiness-rule-item">
              <span className="rule-icon">🕒</span>
              <div>
                <strong>{assessment.timeLimitMinutes || 30}-Minute Live Countdown</strong>
                <p>The timer begins the moment you click "Start Quiz Now". It persists in your browser and keeps running even if you refresh.</p>
              </div>
            </div>
            <div className="readiness-rule-item">
              <span className="rule-icon">⛶</span>
              <div>
                <strong>Enlargeable Full-Screen Notebook</strong>
                <p>Click "⛶ Enlarge Workspace" at any time to expand the notebook to full screen for maximum coding comfort and distraction-free solving.</p>
              </div>
            </div>
            <div className="readiness-rule-item">
              <span className="rule-icon">🤖</span>
              <div>
                <strong>Automated Pyodide Grading</strong>
                <p>When you click submit or when the timer reaches 00:00, your notebook answers will be evaluated with automated assertions.</p>
              </div>
            </div>
            <div className="readiness-rule-item">
              <span className="rule-icon">🎯</span>
              <div>
                <strong>80% Combined Passing Mark</strong>
                <p>Module {targetMod + 1} unlocks when your combined grade (40% Homework + 60% Quiz) reaches 80% or higher.</p>
              </div>
            </div>
          </div>

          {bestScore > 0 && (
            <div className="readiness-best-banner">
              🏆 Your Best Score So Far: <strong>{bestScore} / {assessment.maxPoints} ({bestPercentage}%)</strong>. Starting a new attempt will begin a fresh timed session.
            </div>
          )}

          <div className="readiness-cta-row">
            <button
              type="button"
              className="btn btn-primary btn-start-quiz-large"
              onClick={handlePromptStartQuiz}
            >
              🚀 I Am Ready — Start Quiz Now →
            </button>
            <a
              href={`/learn/${courseSlug}/module/${targetMod}`}
              className="btn btn-outline"
            >
              ← Back to Module Overview
            </a>
          </div>
        </div>

        {/* CONFIRMATION MODAL BEFORE STARTING TIMED QUIZ */}
        {showStartConfirmation && (
          <div className="admin-modal-overlay">
            <div className="admin-modal-box confirmation-box" style={{ maxWidth: '500px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: 0 }}>
              <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem' }}>Confirm Timed Examination Start</h3>
                <button type="button" className="btn-modal-close" onClick={() => setShowStartConfirmation(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
              </div>
              <div className="modal-body-padded" style={{ padding: '1.5rem', color: '#cbd5e1' }}>
                <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', lineHeight: 1.5 }}>
                  Once you start, the <strong>{assessment?.timer?.durationMinutes || assessment?.timeLimitMinutes || 30}-minute</strong> timer begins on the server and cannot normally be paused.
                </p>
                <div style={{ background: '#1e1b12', border: '1px solid #78350f', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fde68a', fontSize: '0.85rem' }}>
                  ⚠️ Leaving, refreshing, or closing the browser will NOT stop or reset the server timer. Submissions upon expiry are recorded automatically.
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowStartConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmStartQuiz}
                >
                  Confirm & Start Quiz →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="assessment-worksheet">
      {/* Academy Administrator Supervisor Banner */}
      {isAdmin && (
        <div className="admin-supervisor-badge-bar">
          <div className="admin-supervisor-info">
            <span className="admin-crown-icon">👑</span>
            <div>
              <strong>Academy Administrator Supervisor Mode</strong>
              <div className="admin-supervisor-hint">
                Student countdown limits, auto-submit alerts, and prerequisite locks are bypassed for your account.
              </div>
            </div>
          </div>
          <div className="admin-supervisor-actions">
            <Link to="/admin" className="btn-admin-nav-pill">
              ← Admin Console
            </Link>
            {!isHomework && (
              <button
                type="button"
                className="btn-admin-nav-pill btn-admin-timer-pill"
                onClick={() => setShowAdminControls((s) => !s)}
              >
                ⚙️ {showAdminControls ? 'Close Timer Config' : 'Configure Quiz Timer'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assessment Header Card / Top Control Bar */}
      {viewMode === 'notebook' ? (
        <div className="worksheet-header-card homework-integrated-header">
          <div className="worksheet-header-top">
            <div className="worksheet-badges">
              <span className="pill-badge pill-type">INTEGRATED JUPYTER NOTEBOOK</span>
              <span className="pill-badge pill-level">
                {isHomework ? 'WEIGHT: 40%' : 'WEIGHT: 60%'}
              </span>
              <span className="pill-badge pill-points">MAX: {assessment.maxPoints} MARKS</span>
              {bestScore > 0 && (
                <span className="pill-badge pill-best">
                  BEST: {bestScore} / {assessment.maxPoints} ({bestPercentage}%)
                </span>
              )}
              {!isHomework && (
                <span className={`pill-badge quiz-timer-pill ${timerStatusClass}`} title="Time remaining for this quiz">
                  ⏱️ {isAdmin ? `${formatTimer(timeRemaining)} (Admin Bypass)` : formatTimer(timeRemaining)}
                </span>
              )}
            </div>

            <div className="header-action-links">
              {isAdmin && !isHomework && (
                <button
                  type="button"
                  className="btn-open-notebook-tab"
                  onClick={() => setShowAdminControls((s) => !s)}
                  title="Configure quiz timer settings"
                >
                  ⚙️ Admin Timer
                </button>
              )}
              <button
                type="button"
                className="btn-open-notebook-tab"
                onClick={() => setIsEnlarged(!isEnlarged)}
                title={isEnlarged ? 'Exit full screen (Esc)' : 'Enlarge workspace to full screen'}
              >
                {isEnlarged ? '⤓ Minimize' : '⛶ Enlarge'}
              </button>
              <a
                href={fullNotebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-open-notebook-tab"
                title="Open standalone notebook in separate browser window"
              >
                ↗ Full Tab
              </a>
              <button
                type="button"
                className="btn-open-notebook-tab"
                onClick={() => setNotebookKey((k) => k + 1)}
                title="Reload the integrated notebook"
              >
                ↺ Reload
              </button>
              <button
                type="button"
                className="btn-open-notebook-tab"
                onClick={() => setViewMode('cards')}
                title="Switch to standalone question cards"
              >
                📋 Card View
              </button>
            </div>
          </div>

          {/* Admin Timer Control Bar */}
          {isAdmin && !isHomework && showAdminControls && (
            <div className="admin-timer-controls-bar">
              <div className="admin-timer-header-info">
                <span className="admin-shield-icon">🛡️</span>
                <span>Admin Quiz Controls</span>
              </div>
              <div className="admin-timer-form">
                <label className="admin-timer-label">Duration:</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  className="admin-timer-input"
                  value={adminMinutes}
                  onChange={(e) => setAdminMinutes(e.target.value)}
                  disabled={isSavingTimer}
                />
                <span className="admin-timer-label">minutes</span>
                <button
                  type="button"
                  className="btn-save-admin-timer"
                  onClick={handleSaveTimer}
                  disabled={isSavingTimer}
                >
                  {isSavingTimer ? 'Saving...' : '💾 Save Duration'}
                </button>
                <button
                  type="button"
                  className="btn-reset-admin-timer"
                  onClick={handleResetStudentTimer}
                >
                  ↺ Reset Timer
                </button>
                {adminTimerMsg && <span className="admin-timer-msg">{adminTimerMsg}</span>}
              </div>
            </div>
          )}

          <div className="homework-eval-main-row">
            <div className="eval-main-text">
              <h1 className="worksheet-title">{assessment.title}</h1>
              <p className="worksheet-description">
                {isHomework
                  ? 'Solve your homework problems directly inside the integrated Jupyter Notebook below. Use Shift + Enter to run cells. When finished, scroll down and click Submit & Grade Notebook to calculate and save your official score.'
                  : `Solve your official coding quiz problems directly inside the integrated Jupyter Notebook below within the allotted time (${assessment.timeLimitMinutes || 30} minutes). Use Shift + Enter to run cells. When finished, scroll down and click Submit & Grade Quiz to calculate and save your official score.`}
              </p>
            </div>
          </div>
        </div>
      ) : (
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
              {!isHomework && (
                <span className={`pill-badge quiz-timer-pill ${timerStatusClass}`} title="Time remaining for this quiz">
                  ⏱️ {formatTimer(timeRemaining)}
                </span>
              )}
            </div>
            <div className="header-action-links">
              {isAdmin && !isHomework && (
                <button
                  type="button"
                  className="btn-open-notebook-tab"
                  onClick={() => setShowAdminControls((s) => !s)}
                  title="Configure quiz timer settings"
                >
                  ⚙️ Admin Timer
                </button>
              )}
              <button
                type="button"
                className="btn-open-notebook-tab"
                onClick={() => setViewMode('notebook')}
                title="Switch to integrated Jupyter Notebook"
              >
                📓 Notebook View
              </button>
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
          </div>

          {/* Admin Timer Control Bar */}
          {isAdmin && !isHomework && showAdminControls && (
            <div className="admin-timer-controls-bar">
              <div className="admin-timer-header-info">
                <span className="admin-shield-icon">🛡️</span>
                <span>Admin Quiz Controls</span>
              </div>
              <div className="admin-timer-form">
                <label className="admin-timer-label">Duration:</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  className="admin-timer-input"
                  value={adminMinutes}
                  onChange={(e) => setAdminMinutes(e.target.value)}
                  disabled={isSavingTimer}
                />
                <span className="admin-timer-label">minutes</span>
                <button
                  type="button"
                  className="btn-save-admin-timer"
                  onClick={handleSaveTimer}
                  disabled={isSavingTimer}
                >
                  {isSavingTimer ? 'Saving...' : '💾 Save Duration'}
                </button>
                <button
                  type="button"
                  className="btn-reset-admin-timer"
                  onClick={handleResetStudentTimer}
                >
                  ↺ Reset Timer
                </button>
                {adminTimerMsg && <span className="admin-timer-msg">{adminTimerMsg}</span>}
              </div>
            </div>
          )}

          <h1 className="worksheet-title">{assessment.title}</h1>
          <p className="worksheet-description">{assessment.description}</p>

          <div className="worksheet-notice">
            <span className="notice-icon">ℹ️</span>
            <span>
              <strong>Distraction-Free Coding Worksheet:</strong> Enter your solution in each designated answer cell below, click <strong>Run Code</strong> to test, and click <strong>Submit {isHomework ? 'Homework' : 'Coding Quiz'}</strong> when complete. {!isHomework && `Allotted time: ${assessment.timeLimitMinutes || 30} minutes.`}
            </span>
          </div>
        </div>
      )}

      {/* Subtle Warning Threshold Banner (at <= 5 mins remaining) */}
      {!isHomework && quizStarted && timeRemaining <= 300 && timeRemaining > 0 && !submissionResult && (
        <div className="quiz-warning-banner" style={{ background: '#451a03', color: '#fef3c7', padding: '0.75rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #d97706', display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 600, fontSize: '0.925rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span>5 minutes remaining. Please finish your code and prepare to submit.</span>
        </div>
      )}

      {/* Integrated Jupyter Notebook Mode vs Classic Questions Form */}
      {viewMode === 'notebook' ? (
        <div className={`integrated-jupyter-workspace-wrapper ${isEnlarged ? 'workspace-enlarged' : ''}`}>
          <div className="jupyter-workspace-meta-banner">
            <div className="meta-banner-left">
              <span className="meta-banner-dot" />
              <span className="meta-banner-text">
                EcoIntuition Academy Integrated Notebook &bull; <strong>{notebookPath}</strong>
              </span>
            </div>
            <div className="meta-banner-right" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {!isHomework && (
                <span className={`quiz-meta-timer-bar ${timerStatusClass}`}>
                  ⏱️ <strong>{formatTimer(timeRemaining)}</strong>
                </span>
              )}
              <button
                type="button"
                className="btn-enlarge-notebook"
                onClick={() => setIsEnlarged(!isEnlarged)}
                title={isEnlarged ? 'Restore normal view (Esc)' : 'Enlarge notebook to full screen'}
              >
                {isEnlarged ? '⤓ Minimize (Esc)' : '⛶ Enlarge Workspace'}
              </button>
              <span className="meta-tip">
                💡 Tip: Solve problems inside the notebook. Run with <strong>Shift + Enter</strong>.
              </span>
            </div>
          </div>

          <div className="integrated-jupyter-frame-container">
            <iframe
              key={notebookKey}
              id="integrated-homework-jupyter-frame"
              src={fullNotebookUrl}
              title={assessment.title}
              className="integrated-homework-iframe"
              allow="clipboard-read; clipboard-write"
            />
          </div>

          <div className="notebook-bottom-submit-banner">
            <div className="bottom-submit-info">
              <h4>Ready to evaluate your {isHomework ? 'homework' : 'coding quiz'}?</h4>
              <p>
                {isHomework
                  ? 'Clicking Submit extracts all student code cells from the notebook, runs the official automated grading suite, and updates your marks and course progression.'
                  : 'Clicking Submit extracts all answers from your quiz notebook, evaluates test cases against official grading assertions, records your final score, and updates your course progression.'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {isEnlarged && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsEnlarged(false)}
                  style={{ color: '#F8FAFC', borderColor: '#475569' }}
                >
                  ⤓ Minimize View
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-submit-notebook-bottom"
                onClick={() => {
                  if (isEnlarged) setIsEnlarged(false);
                  handleNotebookSubmit();
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="live-spinner-icon" />
                    <span>{gradingStep || 'Grading Notebook...'}</span>
                  </>
                ) : (
                  `🚀 Submit & Grade ${isHomework ? 'Homework' : 'Quiz'} Notebook (${assessment.maxPoints} Marks) →`
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Submission Results Panel & Marks Breakdown (at the bottom after submission) */}
      {submissionResult && (
        <div className="submission-result-modal" id="assessment-results-section" style={{ marginTop: '2.5rem' }}>
          <div className="result-card-header">
            <div>
              <span className="result-pill">OFFICIAL ASSESSMENT EVALUATION</span>
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

          {/* Time Expired Notice */}
          {submissionResult.attempt?.submissionReason === 'time_expired' && (
            <div className="time-expired-alert" style={{ background: '#450a0a', color: '#fecaca', padding: '1rem 1.25rem', borderRadius: '8px', margin: '1.25rem 0', border: '1px solid #dc2626' }}>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', color: '#fee2e2' }}>⏰ Time is Up</h4>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Your current answers were submitted automatically upon examination timer expiration.</p>
            </div>
          )}

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
              className="btn btn-secondary"
              onClick={handleRetry}
            >
              ↺ Clear Results / Re-attempt
            </button>
          </div>
        </div>
      )}

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
