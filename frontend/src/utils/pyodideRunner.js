/**
 * EcoIntuition Academy - Browser-side Pyodide WebAssembly Runner & Assessment Grader
 * 
 * Provides safe, sandbox browser-side execution for Python code,
 * captures standard output and errors, and runs automated assertion-based
 * grading for Module 2 Homework and Coding Quiz.
 */

let pyodideInstance = null;
let pyodideLoadingPromise = null;

export async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = new Promise((resolve, reject) => {
    // If Pyodide script is already loaded on window
    if (window.loadPyodide) {
      window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' })
        .then((py) => {
          pyodideInstance = py;
          resolve(py);
        })
        .catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
    script.async = true;
    script.onload = async () => {
      try {
        const py = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
        });
        pyodideInstance = py;
        resolve(py);
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => {
      pyodideLoadingPromise = null;
      reject(new Error('Failed to load Pyodide WebAssembly runtime. Please ensure your browser has internet access and WebAssembly enabled.'));
    };
    document.head.appendChild(script);
  });

  return pyodideLoadingPromise;
}

/**
 * Executes arbitrary Python code in Pyodide and captures stdout, stderr, and variables
 */
export async function runPythonCode(code) {
  try {
    const py = await getPyodide();
    let stdout = '';
    let stderr = '';
    let lastPrompt = '';

    py.setStdout({
      batched: (msg) => {
        stdout += msg + '\n';
        lastPrompt = msg;
      }
    });
    py.setStderr({
      batched: (msg) => {
        stderr += msg + '\n';
      }
    });

    // Provide interactive stdin for input() calls
    py.setStdin({
      stdin: () => {
        const promptText = lastPrompt ? `Python input(): ${lastPrompt}` : 'Enter input for Python program:';
        const val = typeof window !== 'undefined' && window.prompt ? window.prompt(promptText) : '';
        if (val === null) {
          return '\n';
        }
        stdout += val + '\n';
        return val + '\n';
      },
      isatty: true
    });

    await py.runPythonAsync(code);

    return {
      success: true,
      output: stdout.trim(),
      error: stderr.trim() || null
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err.message
    };
  }
}

/**
 * Automated Grader for Module 2 Homework (5 Problems, 40 Marks Total)
 */
export async function gradeHomework(codeMap) {
  const py = await getPyodide();
  const results = [];

  // Helper to extract a python variable
  const getVar = (varName) => {
    try {
      return py.globals.get(varName);
    } catch (e) {
      return undefined;
    }
  };

  // ---------------------------------------------------------------------------
  // Problem 1: User Input Operations (8 Marks)
  // ---------------------------------------------------------------------------
  try {
    const p1Code = codeMap['hw-q1'] || '';
    py.setStdout({ batched: () => {} });
    await py.runPythonAsync(p1Code);

    const a = getVar('a');
    const b = getVar('b');
    const add = getVar('addition_result');
    const sub = getVar('subtraction_result');
    const mul = getVar('multiplication_result');

    const checks = [];
    let p1Marks = 0;

    // Check setup
    const validInputs = typeof a === 'number' && typeof b === 'number';
    checks.push({
      name: 'Variables a and b defined as numerical values',
      passed: validInputs,
      message: validInputs ? 'Passed' : 'Variables a and b must be defined numbers'
    });
    if (validInputs) p1Marks += 2;

    // Check addition
    const addPassed = validInputs && add === a + b;
    checks.push({
      name: 'addition_result = a + b',
      passed: addPassed,
      message: addPassed ? 'Passed' : `Expected addition_result to equal ${a + b}`
    });
    if (addPassed) p1Marks += 2;

    // Check subtraction
    const subPassed = validInputs && sub === a - b;
    checks.push({
      name: 'subtraction_result = a - b',
      passed: subPassed,
      message: subPassed ? 'Passed' : `Expected subtraction_result to equal ${a - b}`
    });
    if (subPassed) p1Marks += 2;

    // Check multiplication
    const mulPassed = validInputs && mul === a * b;
    checks.push({
      name: 'multiplication_result = a * b',
      passed: mulPassed,
      message: mulPassed ? 'Passed' : `Expected multiplication_result to equal ${a * b}`
    });
    if (mulPassed) p1Marks += 2;

    results.push({
      questionId: 'hw-q1',
      title: 'Problem 1: User Input Operations',
      earnedPoints: p1Marks,
      maxPoints: 8,
      passed: p1Marks === 8,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-q1',
      title: 'Problem 1: User Input Operations',
      earnedPoints: 0,
      maxPoints: 8,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem 2: Rectangle Area and Perimeter (8 Marks)
  // ---------------------------------------------------------------------------
  try {
    const p2Code = codeMap['hw-q2'] || '';
    await py.runPythonAsync(p2Code);

    const length = getVar('length');
    const breadth = getVar('breadth') ?? getVar('width');
    const area = getVar('area');
    const perimeter = getVar('perimeter');

    const checks = [];
    let p2Marks = 0;

    const validDims = typeof length === 'number' && typeof breadth === 'number';
    const areaPassed = validDims && area === length * breadth;
    checks.push({
      name: 'area = length * breadth',
      passed: areaPassed,
      message: areaPassed ? 'Passed' : 'Area calculation does not match length * breadth'
    });
    if (areaPassed) p2Marks += 4;

    const periPassed = validDims && perimeter === 2 * (length + breadth);
    checks.push({
      name: 'perimeter = 2 * (length + breadth)',
      passed: periPassed,
      message: periPassed ? 'Passed' : 'Perimeter calculation does not match 2 * (length + breadth)'
    });
    if (periPassed) p2Marks += 4;

    results.push({
      questionId: 'hw-q2',
      title: 'Problem 2: Rectangle Area & Perimeter',
      earnedPoints: p2Marks,
      maxPoints: 8,
      passed: p2Marks === 8,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-q2',
      title: 'Problem 2: Rectangle Area & Perimeter',
      earnedPoints: 0,
      maxPoints: 8,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem 3: Temperature Conversion (8 Marks)
  // ---------------------------------------------------------------------------
  try {
    const p3Code = codeMap['hw-q3'] || '';
    await py.runPythonAsync(p3Code);

    const cInput = getVar('celsius_input');
    const fResult = getVar('fahrenheit_result');
    const fInput = getVar('fahrenheit_input');
    const cResult = getVar('celsius_result');

    const checks = [];
    let p3Marks = 0;

    // Check Celsius to Fahrenheit: F = (9/5)*C + 32
    const expectedF = typeof cInput === 'number' ? (9 / 5) * cInput + 32 : null;
    const fPassed = typeof fResult === 'number' && Math.abs(fResult - expectedF) < 0.2;
    checks.push({
      name: 'Celsius to Fahrenheit: F = (9/5)*C + 32',
      passed: fPassed,
      message: fPassed ? 'Passed (77.0°F for 25°C)' : `Expected fahrenheit_result ≈ ${expectedF}`
    });
    if (fPassed) p3Marks += 4;

    // Check Fahrenheit to Celsius: C = (5/9)*(F - 32)
    const expectedC = typeof fInput === 'number' ? (5 / 9) * (fInput - 32) : null;
    const cPassed = typeof cResult === 'number' && Math.abs(cResult - expectedC) < 0.2;
    checks.push({
      name: 'Fahrenheit to Celsius: C = (5/9)*(F - 32)',
      passed: cPassed,
      message: cPassed ? 'Passed (25.0°C for 77°F)' : `Expected celsius_result ≈ ${expectedC}`
    });
    if (cPassed) p3Marks += 4;

    results.push({
      questionId: 'hw-q3',
      title: 'Problem 3: Temperature Conversion',
      earnedPoints: p3Marks,
      maxPoints: 8,
      passed: p3Marks === 8,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-q3',
      title: 'Problem 3: Temperature Conversion',
      earnedPoints: 0,
      maxPoints: 8,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem 4: Leftmost Digit Extraction (8 Marks)
  // ---------------------------------------------------------------------------
  try {
    const p4Code = codeMap['hw-q4'] || '';
    await py.runPythonAsync(p4Code);

    const num = getVar('num_4digit');
    const leftmost = getVar('leftmost_digit');

    const checks = [];
    let p4Marks = 0;

    const expectedLeft = typeof num === 'number' ? Math.floor(Math.abs(num) / 1000) : null;
    const passed = typeof leftmost === 'number' && leftmost === expectedLeft;

    checks.push({
      name: 'Extract leftmost digit using floor division (//)',
      passed,
      message: passed ? `Passed (leftmost digit is ${expectedLeft})` : `Expected leftmost_digit to be ${expectedLeft}`
    });
    if (passed) p4Marks += 8;

    results.push({
      questionId: 'hw-q4',
      title: 'Problem 4: Leftmost Digit',
      earnedPoints: p4Marks,
      maxPoints: 8,
      passed: p4Marks === 8,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-q4',
      title: 'Problem 4: Leftmost Digit',
      earnedPoints: 0,
      maxPoints: 8,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem 5: Rightmost Digit Extraction (8 Marks)
  // ---------------------------------------------------------------------------
  try {
    const p5Code = codeMap['hw-q5'] || '';
    await py.runPythonAsync(p5Code);

    const numInput = getVar('num_input');
    const rightmost = getVar('rightmost_digit');

    const checks = [];
    let p5Marks = 0;

    const expectedRight = typeof numInput === 'number' ? Math.abs(numInput) % 10 : null;
    const passed = typeof rightmost === 'number' && rightmost === expectedRight;

    checks.push({
      name: 'Extract rightmost digit using modulus (%)',
      passed,
      message: passed ? `Passed (rightmost digit is ${expectedRight})` : `Expected rightmost_digit to be ${expectedRight}`
    });
    if (passed) p5Marks += 8;

    results.push({
      questionId: 'hw-q5',
      title: 'Problem 5: Rightmost Digit',
      earnedPoints: p5Marks,
      maxPoints: 8,
      passed: p5Marks === 8,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-q5',
      title: 'Problem 5: Rightmost Digit',
      earnedPoints: 0,
      maxPoints: 8,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  return results;
}

/**
 * Automated Grader for Module 2 Coding Quiz (6 Questions, 20 Marks Total)
 */
export async function gradeCodingQuiz(codeMap) {
  const py = await getPyodide();
  const results = [];

  const getVar = (varName) => {
    try {
      return py.globals.get(varName);
    } catch (e) {
      return undefined;
    }
  };

  // ---------------------------------------------------------------------------
  // Question 1: Input and Type Conversion (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const q1Code = codeMap['quiz-q1'] || '';
    await py.runPythonAsync(q1Code);

    const priceText = getVar('price_text');
    const quantityText = getVar('quantity_text');
    const price = getVar('price');
    const quantity = getVar('quantity');

    const checks = [];
    let q1Marks = 0;

    const pricePassed = typeof price === 'number' && price === parseFloat(priceText);
    checks.push({
      name: 'price converted to float: price = float(price_text)',
      passed: pricePassed,
      message: pricePassed ? 'Passed (float)' : 'price must be the float conversion of price_text'
    });
    if (pricePassed) q1Marks += 1.5;

    const qtyPassed = typeof quantity === 'number' && Number.isInteger(quantity) && quantity === parseInt(quantityText, 10);
    checks.push({
      name: 'quantity converted to int: quantity = int(quantity_text)',
      passed: qtyPassed,
      message: qtyPassed ? 'Passed (int)' : 'quantity must be the integer conversion of quantity_text'
    });
    if (qtyPassed) q1Marks += 1.5;

    results.push({
      questionId: 'quiz-q1',
      title: 'Question 1: Input and Type Conversion',
      earnedPoints: q1Marks,
      maxPoints: 3,
      passed: q1Marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q1',
      title: 'Question 1: Input and Type Conversion',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 2: Arithmetic Operators (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const q2Code = codeMap['quiz-q2'] || '';
    await py.runPythonAsync(q2Code);

    const price = getVar('price') || 29.99;
    const quantity = getVar('quantity') || 8;
    const totalCost = getVar('total_cost');
    const halfCost = getVar('half_cost');
    const wholeUnits = getVar('whole_units_per_pack');
    const remUnits = getVar('remaining_units');

    const checks = [];
    let q2Marks = 0;

    const totalPassed = typeof totalCost === 'number' && Math.abs(totalCost - (price * quantity)) < 0.01;
    checks.push({
      name: 'total_cost = price * quantity',
      passed: totalPassed,
      message: totalPassed ? 'Passed' : 'total_cost calculation incorrect'
    });
    if (totalPassed) q2Marks += 1;

    const halfPassed = typeof halfCost === 'number' && Math.abs(halfCost - (totalCost / 2)) < 0.01;
    checks.push({
      name: 'half_cost = total_cost / 2',
      passed: halfPassed,
      message: halfPassed ? 'Passed' : 'half_cost calculation incorrect'
    });
    if (halfPassed) q2Marks += 1;

    const wholePassed = wholeUnits === Math.floor(quantity / 3);
    checks.push({
      name: 'whole_units_per_pack = quantity // 3',
      passed: wholePassed,
      message: wholePassed ? 'Passed' : 'whole_units_per_pack calculation incorrect'
    });
    if (wholePassed) q2Marks += 1;

    const remPassed = remUnits === (quantity % 3);
    checks.push({
      name: 'remaining_units = quantity % 3',
      passed: remPassed,
      message: remPassed ? 'Passed' : 'remaining_units calculation incorrect'
    });
    if (remPassed) q2Marks += 1;

    results.push({
      questionId: 'quiz-q2',
      title: 'Question 2: Arithmetic Operators',
      earnedPoints: q2Marks,
      maxPoints: 4,
      passed: q2Marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q2',
      title: 'Question 2: Arithmetic Operators',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 3: Strings and Formatting (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const q3Code = codeMap['quiz-q3'] || '';
    await py.runPythonAsync(q3Code);

    const first = getVar('first_name') || 'Ada';
    const last = getVar('last_name') || 'Lovelace';
    const fullName = getVar('full_name');
    const upper = getVar('full_name_upper');
    const lenVal = getVar('name_length');

    const checks = [];
    let q3Marks = 0;

    const namePassed = fullName === `${first} ${last}`;
    checks.push({
      name: 'full_name concatenated with single space',
      passed: namePassed,
      message: namePassed ? 'Passed' : `Expected full_name to be "${first} ${last}"`
    });
    if (namePassed) q3Marks += 1.5;

    const upperPassed = typeof upper === 'string' && upper === (fullName ? fullName.toUpperCase() : '');
    checks.push({
      name: 'full_name_upper = full_name.upper()',
      passed: upperPassed,
      message: upperPassed ? 'Passed' : 'full_name_upper is not in uppercase'
    });
    if (upperPassed) q3Marks += 1.5;

    const lenPassed = typeof lenVal === 'number' && lenVal === (fullName ? fullName.length : 0);
    checks.push({
      name: 'name_length = len(full_name)',
      passed: lenPassed,
      message: lenPassed ? 'Passed' : 'name_length is incorrect'
    });
    if (lenPassed) q3Marks += 1;

    results.push({
      questionId: 'quiz-q3',
      title: 'Question 3: Strings and Formatting',
      earnedPoints: q3Marks,
      maxPoints: 4,
      passed: q3Marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q3',
      title: 'Question 3: Strings and Formatting',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 4: String Indexing and Slicing (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const q4Code = codeMap['quiz-q4'] || '';
    await py.runPythonAsync(q4Code);

    const word = getVar('word') || 'Algorithms';
    const firstChar = getVar('first_char');
    const lastChar = getVar('last_char');
    const firstThree = getVar('first_three');
    const reversed = getVar('reversed_word');

    const checks = [];
    let q4Marks = 0;

    const fCharPassed = firstChar === word[0];
    checks.push({
      name: 'first_char = word[0]',
      passed: fCharPassed,
      message: fCharPassed ? 'Passed' : `Expected first_char == "${word[0]}"`
    });
    if (fCharPassed) q4Marks += 0.75;

    const lCharPassed = lastChar === word[word.length - 1];
    checks.push({
      name: 'last_char = word[-1]',
      passed: lCharPassed,
      message: lCharPassed ? 'Passed' : `Expected last_char == "${word[word.length - 1]}"`
    });
    if (lCharPassed) q4Marks += 0.75;

    const fThreePassed = firstThree === word.slice(0, 3);
    checks.push({
      name: 'first_three = word[:3]',
      passed: fThreePassed,
      message: fThreePassed ? 'Passed' : `Expected first_three == "${word.slice(0, 3)}"`
    });
    if (fThreePassed) q4Marks += 0.75;

    const revPassed = reversed === word.split('').reverse().join('');
    checks.push({
      name: 'reversed_word = word[::-1]',
      passed: revPassed,
      message: revPassed ? 'Passed' : 'reversed_word is not properly reversed'
    });
    if (revPassed) q4Marks += 0.75;

    results.push({
      questionId: 'quiz-q4',
      title: 'Question 4: String Indexing & Slicing',
      earnedPoints: q4Marks,
      maxPoints: 3,
      passed: q4Marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q4',
      title: 'Question 4: String Indexing & Slicing',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 5: Relational Operators (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const q5Code = codeMap['quiz-q5'] || '';
    await py.runPythonAsync(q5Code);

    const qty = getVar('quantity') ?? 8;
    const nameLen = getVar('name_length') ?? 12;
    const same = getVar('same_value');
    const larger = getVar('quantity_larger');
    const diff = getVar('different_value');

    const checks = [];
    let q5Marks = 0;

    const samePassed = same === (qty === nameLen);
    checks.push({
      name: 'same_value = (quantity == name_length)',
      passed: samePassed,
      message: samePassed ? 'Passed' : 'same_value relational check failed'
    });
    if (samePassed) q5Marks += 1;

    const largerPassed = larger === (qty > nameLen);
    checks.push({
      name: 'quantity_larger = (quantity > name_length)',
      passed: largerPassed,
      message: largerPassed ? 'Passed' : 'quantity_larger relational check failed'
    });
    if (largerPassed) q5Marks += 1;

    const diffPassed = diff === (qty !== nameLen);
    checks.push({
      name: 'different_value = (quantity != name_length)',
      passed: diffPassed,
      message: diffPassed ? 'Passed' : 'different_value relational check failed'
    });
    if (diffPassed) q5Marks += 1;

    results.push({
      questionId: 'quiz-q5',
      title: 'Question 5: Relational Operators',
      earnedPoints: q5Marks,
      maxPoints: 3,
      passed: q5Marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q5',
      title: 'Question 5: Relational Operators',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 6: Logical Operators (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const q6Code = codeMap['quiz-q6'] || '';
    await py.runPythonAsync(q6Code);

    const qty = getVar('quantity') ?? 8;
    const nameLen = getVar('name_length') ?? 12;
    const logicAnd = getVar('logic_and');
    const logicOr = getVar('logic_or');
    const logicNot = getVar('logic_not');

    const checks = [];
    let q6Marks = 0;

    const andPassed = logicAnd === (qty > 5 && nameLen > 5);
    checks.push({
      name: 'logic_and = (quantity > 5 and name_length > 5)',
      passed: andPassed,
      message: andPassed ? 'Passed' : 'logic_and logical check failed'
    });
    if (andPassed) q6Marks += 1;

    const orPassed = logicOr === (qty < 10 || nameLen < 10);
    checks.push({
      name: 'logic_or = (quantity < 10 or name_length < 10)',
      passed: orPassed,
      message: orPassed ? 'Passed' : 'logic_or logical check failed'
    });
    if (orPassed) q6Marks += 1;

    const notPassed = logicNot === !(qty === nameLen);
    checks.push({
      name: 'logic_not = not (quantity == name_length)',
      passed: notPassed,
      message: notPassed ? 'Passed' : 'logic_not logical check failed'
    });
    if (notPassed) q6Marks += 1;

    results.push({
      questionId: 'quiz-q6',
      title: 'Question 6: Logical Operators',
      earnedPoints: q6Marks,
      maxPoints: 3,
      passed: q6Marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q6',
      title: 'Question 6: Logical Operators',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python execution error: ${err.message}` }]
    });
  }

  return results;
}

/**
 * =============================================================================
 * MODULE 3 GRADING SUITES
 * =============================================================================
 */

/**
 * Automated Grader for Module 3 Homework (11 Problems across Sections A, B, C; 40 Marks Total)
 */
export async function gradeModule3Homework(codeMap) {
  const py = await getPyodide();
  const results = [];

  const getVar = (varName) => {
    try {
      const v = py.globals.get(varName);
      if (v && typeof v.toJs === 'function') {
        return v.toJs();
      }
      return v;
    } catch (e) {
      return undefined;
    }
  };

  // ---------------------------------------------------------------------------
  // Problem A1: Even or Odd (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-a1'] || '';
    const checks = [];
    let marks = 0;

    const testEvenOdd = async (numVal) => {
      await py.runPythonAsync(`
number = ${numVal}
even_odd_result = None
${code}
`);
      const res = getVar('even_odd_result');
      return String(res || '').toLowerCase().trim();
    };

    const hasControlFlow = /if\s+.*:/i.test(code) && (/%/i.test(code) || /mod/i.test(code));
    checks.push({
      name: 'Uses if/else and modulo operator',
      passed: hasControlFlow,
      message: hasControlFlow ? 'Passed' : 'Ensure you use if/else conditional logic with modulo (%)'
    });
    if (hasControlFlow) marks += 1;

    const rEven = await testEvenOdd(8);
    const evenOk = rEven.includes('even');
    checks.push({
      name: 'Evaluates even numbers correctly (e.g. 8 -> even)',
      passed: evenOk,
      message: evenOk ? 'Passed' : `Expected 'even', got '${rEven}'`
    });
    if (evenOk) marks += 1;

    const rOdd = await testEvenOdd(13);
    const oddOk = rOdd.includes('odd');
    checks.push({
      name: 'Evaluates odd numbers correctly (e.g. 13 -> odd)',
      passed: oddOk,
      message: oddOk ? 'Passed' : `Expected 'odd', got '${rOdd}'`
    });
    if (oddOk) marks += 1;

    results.push({
      questionId: 'hw-a1',
      title: 'Problem A1: Even or Odd',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-a1',
      title: 'Problem A1: Even or Odd',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem A2: Palindrome Check (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-a2'] || '';
    const checks = [];
    let marks = 0;

    const testPalindrome = async (seqVal) => {
      await py.runPythonAsync(`
sequence = ${JSON.stringify(seqVal)}
palindrome_result = None
${code}
`);
      const res = getVar('palindrome_result');
      return String(res || '').toLowerCase().trim();
    };

    const r1 = await testPalindrome('racecar');
    const p1Ok = r1.includes('palindrome') && !r1.includes('not');
    checks.push({
      name: 'Identifies word palindrome correctly ("racecar")',
      passed: p1Ok,
      message: p1Ok ? 'Passed' : `Expected 'palindrome', got '${r1}'`
    });
    if (p1Ok) marks += 1;

    const r2 = await testPalindrome('100101001');
    const p2Ok = r2.includes('palindrome') && !r2.includes('not');
    checks.push({
      name: 'Identifies numeric palindrome correctly ("100101001")',
      passed: p2Ok,
      message: p2Ok ? 'Passed' : `Expected 'palindrome', got '${r2}'`
    });
    if (p2Ok) marks += 1;

    const r3 = await testPalindrome('run');
    const p3Ok = r3.includes('not');
    checks.push({
      name: 'Identifies non-palindrome correctly ("run")',
      passed: p3Ok,
      message: p3Ok ? 'Passed' : `Expected 'not palindrome', got '${r3}'`
    });
    if (p3Ok) marks += 1;

    results.push({
      questionId: 'hw-a2',
      title: 'Problem A2: Palindrome Check',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-a2',
      title: 'Problem A2: Palindrome Check',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem A3: Temperature Suggestion (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-a3'] || '';
    const checks = [];
    let marks = 0;

    const testTemp = async (tempVal) => {
      await py.runPythonAsync(`
temperature = ${tempVal}
temp_suggestion = None
${code}
`);
      const res = getVar('temp_suggestion');
      return String(res || '').toLowerCase().trim();
    };

    const hasElif = /elif/i.test(code);
    checks.push({
      name: 'Uses multi-branch if/elif/else structure',
      passed: hasElif,
      message: hasElif ? 'Passed' : 'Ensure you use if, elif, and else to classify temperature ranges'
    });
    if (hasElif) marks += 1;

    const rHot = await testTemp(36);
    const rWalk = await testTemp(28);
    const upperOk = rHot.includes('hot') && (rWalk.includes('walk') || rWalk.includes('perfect'));
    checks.push({
      name: 'Classifies temperatures > 30 (hot) and 20..30 (perfect walk)',
      passed: upperOk,
      message: upperOk ? 'Passed' : `36: '${rHot}', 28: '${rWalk}'`
    });
    if (upperOk) marks += 1;

    const rChilly = await testTemp(18.98);
    const rCold = await testTemp(-5);
    const lowerOk = (rChilly.includes('chilly') || rChilly.includes('jacket')) && rCold.includes('cold');
    checks.push({
      name: 'Classifies temperatures 10..19.99 (chilly) and < 10 (cold)',
      passed: lowerOk,
      message: lowerOk ? 'Passed' : `18.98: '${rChilly}', -5: '${rCold}'`
    });
    if (lowerOk) marks += 1;

    results.push({
      questionId: 'hw-a3',
      title: 'Problem A3: Temperature Suggestion',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-a3',
      title: 'Problem A3: Temperature Suggestion',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem A4: Restaurant Budget (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-a4'] || '';
    const checks = [];
    let marks = 0;

    const testBudget = async (bVal) => {
      await py.runPythonAsync(`
budget = ${bVal}
budget_suggestion = None
${code}
`);
      const res = getVar('budget_suggestion');
      return String(res || '').toLowerCase().trim();
    };

    const r60 = await testBudget(60);
    const fancyOk = r60.includes('fancy');
    checks.push({
      name: 'Budget > 50 gives fancy restaurant',
      passed: fancyOk,
      message: fancyOk ? 'Passed' : `Expected 'fancy', got '${r60}'`
    });
    if (fancyOk) marks += 1;

    const r39 = await testBudget(39);
    const r18 = await testBudget(18.98);
    const midOk = (r39.includes('mid-range') || r39.includes('mid')) && r18.includes('casual');
    checks.push({
      name: 'Continuous brackets for mid-range (30..50) and casual (15..29.99)',
      passed: midOk,
      message: midOk ? 'Passed' : `39: '${r39}', 18.98: '${r18}'`
    });
    if (midOk) marks += 1;

    const r12 = await testBudget(12.5);
    const r4 = await testBudget(4);
    const lowOk = (r12.includes('fast food') || r12.includes('truck')) && (r4.includes('broke') || r4.includes('stay home') || r4.includes('home'));
    checks.push({
      name: 'Classifies fast food (10..14.99) and stay home (< 10)',
      passed: lowOk,
      message: lowOk ? 'Passed' : `12.5: '${r12}', 4: '${r4}'`
    });
    if (lowOk) marks += 1;

    results.push({
      questionId: 'hw-a4',
      title: 'Problem A4: Restaurant Budget',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-a4',
      title: 'Problem A4: Restaurant Budget',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem B1: Movie Recommendation (4 Marks - 1 pt per branch)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-b1'] || '';
    const checks = [];
    let marks = 0;

    const testMovie = async (ageVal, actionVal) => {
      await py.runPythonAsync(`
user_age = ${ageVal}
likes_action = ${actionVal ? 'True' : 'False'}
movie_recommendation = None
${code}
`);
      const res = getVar('movie_recommendation');
      return String(res || '').toLowerCase().trim();
    };

    // Branch 1: Adult + Action
    const b1 = await testMovie(20, true);
    const b1Ok = b1.includes('blockbuster') || b1.includes('action');
    checks.push({
      name: 'Branch 1: Age >= 18 and likes action -> blockbuster action',
      passed: b1Ok,
      message: b1Ok ? 'Passed' : `Got: '${b1}'`
    });
    if (b1Ok) marks += 1;

    // Branch 2: Adult + No Action
    const b2 = await testMovie(25, false);
    const b2Ok = b2.includes('drama') || b2.includes('comedy');
    checks.push({
      name: 'Branch 2: Age >= 18 and no action -> drama or comedy',
      passed: b2Ok,
      message: b2Ok ? 'Passed' : `Got: '${b2}'`
    });
    if (b2Ok) marks += 1;

    // Branch 3: Under 18 + Action
    const b3 = await testMovie(15, true);
    const b3Ok = b3.includes('family') || b3.includes('action-adventure');
    checks.push({
      name: 'Branch 3: Age < 18 and likes action -> family action-adventure',
      passed: b3Ok,
      message: b3Ok ? 'Passed' : `Got: '${b3}'`
    });
    if (b3Ok) marks += 1;

    // Branch 4: Under 18 + No Action
    const b4 = await testMovie(12, false);
    const b4Ok = b4.includes('animated') || b4.includes('fun animated');
    checks.push({
      name: 'Branch 4: Age < 18 and no action -> animated movie',
      passed: b4Ok,
      message: b4Ok ? 'Passed' : `Got: '${b4}'`
    });
    if (b4Ok) marks += 1;

    results.push({
      questionId: 'hw-b1',
      title: 'Problem B1: Movie Recommendation (Nested Conditions)',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-b1',
      title: 'Problem B1: Movie Recommendation (Nested Conditions)',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem C1: Sum of Even Numbers (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-c1'] || '';
    const checks = [];
    let marks = 0;

    const usesWhile = /while\s+/i.test(code);
    checks.push({
      name: 'Uses while loop construct as specified by curriculum',
      passed: usesWhile,
      message: usesWhile ? 'Passed' : 'Problem requires a while loop implementation'
    });
    if (usesWhile) marks += 1;

    await py.runPythonAsync(`
even_sum = None
${code}
`);
    const sumVal = getVar('even_sum');
    const correctSum = (sumVal === 2550);
    checks.push({
      name: 'Calculates correct sum of even numbers 1..100 (2550)',
      passed: correctSum,
      message: correctSum ? 'Passed' : `Expected 2550, got ${sumVal}`
    });
    if (correctSum) marks += 1;

    const loopIncrements = /(\+=|-=|\+\s*1|\+\s*2)/.test(code);
    checks.push({
      name: 'Correct loop variable update progression',
      passed: loopIncrements,
      message: loopIncrements ? 'Passed' : 'Ensure loop variable is properly incremented'
    });
    if (loopIncrements) marks += 1;

    const evenHandling = (/%/i.test(code) || /\+=.*2/.test(code) || /current_num\s*\+=\s*2/.test(code));
    checks.push({
      name: 'Proper even-number sequence handling',
      passed: evenHandling,
      message: evenHandling ? 'Passed' : 'Ensure only even numbers are accumulated'
    });
    if (evenHandling) marks += 1;

    results.push({
      questionId: 'hw-c1',
      title: 'Problem C1: Sum of Even Numbers (1 to 100)',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-c1',
      title: 'Problem C1: Sum of Even Numbers (1 to 100)',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem C2: Multiplication Table (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-c2'] || '';
    const checks = [];
    let marks = 0;

    const usesWhile = /while\s+/i.test(code);
    checks.push({
      name: 'Uses while loop structure',
      passed: usesWhile,
      message: usesWhile ? 'Passed' : 'Ensure you use a while loop'
    });
    if (usesWhile) marks += 1;

    const testTable = async (base) => {
      await py.runPythonAsync(`
base_number = ${base}
table_results = []
multiplier = 1
${code}
`);
      return getVar('table_results') || [];
    };

    const t5 = await testTable(5);
    const expected5 = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
    const len10 = Array.isArray(t5) && t5.length === 10;
    checks.push({
      name: 'Generates exactly 10 table entries (1 through 10)',
      passed: len10,
      message: len10 ? 'Passed' : `Expected length 10, got ${t5?.length || 0}`
    });
    if (len10) marks += 1;

    const matches5 = JSON.stringify(t5) === JSON.stringify(expected5);
    checks.push({
      name: 'Correct table values for base_number = 5',
      passed: matches5,
      message: matches5 ? 'Passed' : `Expected ${JSON.stringify(expected5)}, got ${JSON.stringify(t5)}`
    });
    if (matches5) marks += 1;

    const t3 = await testTable(3);
    const expected3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    const matches3 = JSON.stringify(t3) === JSON.stringify(expected3);
    checks.push({
      name: 'Dynamically computes table for other numbers (e.g. 3)',
      passed: matches3,
      message: matches3 ? 'Passed' : `Table logic failed on base 3`
    });
    if (matches3) marks += 1;

    results.push({
      questionId: 'hw-c2',
      title: 'Problem C2: Multiplication Table (while loop)',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-c2',
      title: 'Problem C2: Multiplication Table (while loop)',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem C3: Repeat Car Name (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-c3'] || '';
    const checks = [];
    let marks = 0;

    const usesWhile = /while\s+/i.test(code);
    checks.push({
      name: 'Uses while loop structure',
      passed: usesWhile,
      message: usesWhile ? 'Passed' : 'Ensure you use a while loop'
    });
    if (usesWhile) marks += 1;

    const testCars = async (car, n) => {
      await py.runPythonAsync(`
car_name = ${JSON.stringify(car)}
n_repeats = ${n}
repeated_cars = []
count = 0
${code}
`);
      return getVar('repeated_cars') || [];
    };

    const c4 = await testCars('Tesla', 4);
    const len4Ok = Array.isArray(c4) && c4.length === 4;
    checks.push({
      name: 'Iterates exactly n times (e.g. 4)',
      passed: len4Ok,
      message: len4Ok ? 'Passed' : `Expected 4 items, got ${c4?.length || 0}`
    });
    if (len4Ok) marks += 1;

    const allMatch = Array.isArray(c4) && c4.every((item) => item === 'Tesla');
    checks.push({
      name: 'Repeats the car name correctly',
      passed: allMatch,
      message: allMatch ? 'Passed' : 'Items do not match car_name'
    });
    if (allMatch) marks += 1;

    const c2 = await testCars('BMW', 2);
    const dynamicOk = Array.isArray(c2) && c2.length === 2 && c2.every((item) => item === 'BMW');
    checks.push({
      name: 'Works dynamically for varying car names and n values',
      passed: dynamicOk,
      message: dynamicOk ? 'Passed' : 'Failed with car_name="BMW" and n=2'
    });
    if (dynamicOk) marks += 1;

    results.push({
      questionId: 'hw-c3',
      title: 'Problem C3: Repeat Car Name n Times (while loop)',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-c3',
      title: 'Problem C3: Repeat Car Name n Times (while loop)',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem C4: Alternating Sum of Squares (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-c4'] || '';
    const checks = [];
    let marks = 0;

    const usesFor = /for\s+.*in\s+/i.test(code);
    checks.push({
      name: 'Uses for loop construct',
      passed: usesFor,
      message: usesFor ? 'Passed' : 'Problem requires a for loop'
    });
    if (usesFor) marks += 1;

    const testAltSquares = async (nVal) => {
      await py.runPythonAsync(`
n_limit = ${nVal}
alternating_sum = 0
${code}
`);
      return getVar('alternating_sum');
    };

    const s5 = await testAltSquares(5);
    const s5Ok = s5 === 15;
    checks.push({
      name: 'Correct calculation for n=5 (1 - 4 + 9 - 16 + 25 = 15)',
      passed: s5Ok,
      message: s5Ok ? 'Passed' : `Expected 15, got ${s5}`
    });
    if (s5Ok) marks += 1;

    const s4 = await testAltSquares(4);
    const s4Ok = s4 === -10;
    checks.push({
      name: 'Correct calculation for n=4 (1 - 4 + 9 - 16 = -10)',
      passed: s4Ok,
      message: s4Ok ? 'Passed' : `Expected -10, got ${s4}`
    });
    if (s4Ok) marks += 1;

    const s1 = await testAltSquares(1);
    const s1Ok = s1 === 1;
    checks.push({
      name: 'Base case handles n=1 correctly (+1)',
      passed: s1Ok,
      message: s1Ok ? 'Passed' : `Expected 1, got ${s1}`
    });
    if (s1Ok) marks += 1;

    results.push({
      questionId: 'hw-c4',
      title: 'Problem C4: Alternating Sum of Squares (for loop)',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-c4',
      title: 'Problem C4: Alternating Sum of Squares (for loop)',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem C5: String Prefixes (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-c5'] || '';
    const checks = [];
    let marks = 0;

    const usesFor = /for\s+.*in\s+/i.test(code);
    checks.push({
      name: 'Uses for loop to build prefix sequence',
      passed: usesFor,
      message: usesFor ? 'Passed' : 'Problem requires a for loop'
    });
    if (usesFor) marks += 1;

    const testPrefixes = async (word) => {
      await py.runPythonAsync(`
prefix_word = ${JSON.stringify(word)}
prefixes = []
${code}
`);
      return getVar('prefixes') || [];
    };

    const pHello = await testPrefixes('hello');
    const expectedHello = ['h', 'he', 'hel', 'hell', 'hello'];
    const pHelloOk = JSON.stringify(pHello) === JSON.stringify(expectedHello);
    checks.push({
      name: 'Builds growing prefixes for "hello" ([\'h\', \'he\', \'hel\', \'hell\', \'hello\'])',
      passed: pHelloOk,
      message: pHelloOk ? 'Passed' : `Expected ${JSON.stringify(expectedHello)}, got ${JSON.stringify(pHello)}`
    });
    if (pHelloOk) marks += 1;

    const pPython = await testPrefixes('python');
    const expectedPython = ['p', 'py', 'pyt', 'pyth', 'pytho', 'python'];
    const pPythonOk = JSON.stringify(pPython) === JSON.stringify(expectedPython);
    checks.push({
      name: 'Builds growing prefixes dynamically for "python"',
      passed: pPythonOk,
      message: pPythonOk ? 'Passed' : `Dynamic test failed for 'python'`
    });
    if (pPythonOk) marks += 1;

    const properOrder = Array.isArray(pHello) && pHello.length === 5 && pHello[0] === 'h' && pHello[4] === 'hello';
    checks.push({
      name: 'Prefixes are in strict ascending order from length 1 to full length',
      passed: properOrder,
      message: properOrder ? 'Passed' : 'Order or length mismatch'
    });
    if (properOrder) marks += 1;

    results.push({
      questionId: 'hw-c5',
      title: 'Problem C5: String Prefixes (for loop)',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-c5',
      title: 'Problem C5: String Prefixes (for loop)',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Problem C6: Factorial (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-c6'] || '';
    const checks = [];
    let marks = 0;

    const usesFor = /for\s+.*in\s+/i.test(code);
    checks.push({
      name: 'Uses for loop iteration for factorial calculation',
      passed: usesFor,
      message: usesFor ? 'Passed' : 'Problem requires a for loop'
    });
    if (usesFor) marks += 1;

    const testFact = async (nVal) => {
      await py.runPythonAsync(`
fact_n = ${nVal}
factorial_result = 1
${code}
`);
      return getVar('factorial_result');
    };

    const f5 = await testFact(5);
    const f5Ok = f5 === 120;
    checks.push({
      name: 'Calculates 5! = 120 correctly',
      passed: f5Ok,
      message: f5Ok ? 'Passed' : `Expected 120, got ${f5}`
    });
    if (f5Ok) marks += 1;

    const f6 = await testFact(6);
    const f6Ok = f6 === 720;
    checks.push({
      name: 'Calculates 6! = 720 correctly',
      passed: f6Ok,
      message: f6Ok ? 'Passed' : `Expected 720, got ${f6}`
    });
    if (f6Ok) marks += 1;

    const f1 = await testFact(1);
    const f1Ok = f1 === 1;
    checks.push({
      name: 'Handles 1! = 1 correctly',
      passed: f1Ok,
      message: f1Ok ? 'Passed' : `Expected 1, got ${f1}`
    });
    if (f1Ok) marks += 1;

    results.push({
      questionId: 'hw-c6',
      title: 'Problem C6: Factorial Calculation (for loop)',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-c6',
      title: 'Problem C6: Factorial Calculation (for loop)',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  return results;
}

/**
 * Automated Grader for Module 3 Final Coding Quiz (6 Questions, 20 Marks Total)
 */
export async function gradeModule3Quiz(codeMap) {
  const py = await getPyodide();
  const results = [];

  const getVar = (varName) => {
    try {
      const v = py.globals.get(varName);
      if (v && typeof v.toJs === 'function') {
        return v.toJs();
      }
      return v;
    } catch (e) {
      return undefined;
    }
  };

  // ---------------------------------------------------------------------------
  // Question 1: Battery Status (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q1'] || '';
    const checks = [];
    let marks = 0;

    const testBattery = async (lvl) => {
      await py.runPythonAsync(`
battery_level = ${lvl}
battery_status = None
${code}
`);
      return String(getVar('battery_status') || '').trim();
    };

    const bHigh = await testBattery(85);
    const highOk = bHigh.toLowerCase() === 'high';
    checks.push({
      name: 'battery_level >= 80 -> "High"',
      passed: highOk,
      message: highOk ? 'Passed' : `Expected 'High', got '${bHigh}'`
    });
    if (highOk) marks += 1;

    const bMed = await testBattery(50);
    const medOk = bMed.toLowerCase() === 'medium';
    checks.push({
      name: 'battery_level >= 30 and < 80 -> "Medium"',
      passed: medOk,
      message: medOk ? 'Passed' : `Expected 'Medium', got '${bMed}'`
    });
    if (medOk) marks += 1;

    const bLow = await testBattery(15);
    const lowOk = bLow.toLowerCase() === 'low';
    checks.push({
      name: 'battery_level < 30 -> "Low"',
      passed: lowOk,
      message: lowOk ? 'Passed' : `Expected 'Low', got '${bLow}'`
    });
    if (lowOk) marks += 1;

    results.push({
      questionId: 'quiz-q1',
      title: 'Question 1: Battery Status (if/elif/else)',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q1',
      title: 'Question 1: Battery Status (if/elif/else)',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 2: Course Access (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q2'] || '';
    const checks = [];
    let marks = 0;

    const testAccess = async (age, perm) => {
      await py.runPythonAsync(`
student_age = ${age}
has_permission = ${perm ? 'True' : 'False'}
access_result = None
${code}
`);
      return String(getVar('access_result') || '').trim();
    };

    const a1 = await testAccess(20, true);
    const a1Ok = a1 === 'Access granted';
    checks.push({
      name: 'Age >= 18 and permission=True -> "Access granted"',
      passed: a1Ok,
      message: a1Ok ? 'Passed' : `Expected 'Access granted', got '${a1}'`
    });
    if (a1Ok) marks += 1;

    const a2 = await testAccess(19, false);
    const a2Ok = a2 === 'Permission required';
    checks.push({
      name: 'Age >= 18 and permission=False -> "Permission required"',
      passed: a2Ok,
      message: a2Ok ? 'Passed' : `Expected 'Permission required', got '${a2}'`
    });
    if (a2Ok) marks += 1;

    const a3 = await testAccess(16, true);
    const a3Ok = a3 === 'Age requirement not met';
    checks.push({
      name: 'Age < 18 -> "Age requirement not met"',
      passed: a3Ok,
      message: a3Ok ? 'Passed' : `Expected 'Age requirement not met', got '${a3}'`
    });
    if (a3Ok) marks += 1;

    results.push({
      questionId: 'quiz-q2',
      title: 'Question 2: Course Access (Nested Conditions)',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q2',
      title: 'Question 2: Course Access (Nested Conditions)',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 3: Countdown Sum (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q3'] || '';
    const checks = [];
    let marks = 0;

    const usesWhile = /while\s+/i.test(code);
    checks.push({
      name: 'Uses while loop structure',
      passed: usesWhile,
      message: usesWhile ? 'Passed' : 'Problem requires a while loop'
    });
    if (usesWhile) marks += 1;

    const testCountdown = async (n) => {
      await py.runPythonAsync(`
countdown_n = ${n}
countdown_sum = 0
${code}
`);
      return getVar('countdown_sum');
    };

    const c4 = await testCountdown(4);
    const c4Ok = c4 === 10;
    checks.push({
      name: 'Correct sum for n=4 (4 + 3 + 2 + 1 = 10)',
      passed: c4Ok,
      message: c4Ok ? 'Passed' : `Expected 10, got ${c4}`
    });
    if (c4Ok) marks += 1;

    const c6 = await testCountdown(6);
    const c6Ok = c6 === 21;
    checks.push({
      name: 'Correct dynamic sum for other values (e.g. n=6 -> 21)',
      passed: c6Ok,
      message: c6Ok ? 'Passed' : `Expected 21, got ${c6}`
    });
    if (c6Ok) marks += 1;

    results.push({
      questionId: 'quiz-q3',
      title: 'Question 3: Countdown Sum (while loop)',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q3',
      title: 'Question 3: Countdown Sum (while loop)',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 4: Sum of Multiples of 3 (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q4'] || '';
    const checks = [];
    let marks = 0;

    const usesForRange = /for\s+.*in\s+range/i.test(code);
    checks.push({
      name: 'Uses for loop with range()',
      passed: usesForRange,
      message: usesForRange ? 'Passed' : 'Problem requires for loop with range()'
    });
    if (usesForRange) marks += 1;

    const testMultiples = async (n) => {
      await py.runPythonAsync(`
multiples_n = ${n}
multiple_sum = 0
${code}
`);
      return getVar('multiple_sum');
    };

    const m10 = await testMultiples(10);
    const m10Ok = m10 === 18; // 3 + 6 + 9 = 18
    checks.push({
      name: 'Correct sum for n=10 (3 + 6 + 9 = 18)',
      passed: m10Ok,
      message: m10Ok ? 'Passed' : `Expected 18, got ${m10}`
    });
    if (m10Ok) marks += 1;

    const m15 = await testMultiples(15);
    const m15Ok = m15 === 45; // 3 + 6 + 9 + 12 + 15 = 45
    checks.push({
      name: 'Correct boundary calculation for n=15 (45)',
      passed: m15Ok,
      message: m15Ok ? 'Passed' : `Expected 45, got ${m15}`
    });
    if (m15Ok) marks += 1;

    const m5 = await testMultiples(5);
    const m5Ok = m5 === 3;
    checks.push({
      name: 'Handles smaller boundaries (e.g. n=5 -> 3)',
      passed: m5Ok,
      message: m5Ok ? 'Passed' : `Expected 3, got ${m5}`
    });
    if (m5Ok) marks += 1;

    results.push({
      questionId: 'quiz-q4',
      title: 'Question 4: Sum of Multiples of 3 (for + range)',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q4',
      title: 'Question 4: Sum of Multiples of 3 (for + range)',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 5: Break and Continue (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q5'] || '';
    const checks = [];
    let marks = 0;

    const usesContinue = /continue\b/.test(code);
    checks.push({
      name: 'Uses continue to skip multiples of 3',
      passed: usesContinue,
      message: usesContinue ? 'Passed' : 'Ensure you use continue when i % 3 == 0'
    });
    if (usesContinue) marks += 1;

    const usesBreak = /break\b/.test(code);
    checks.push({
      name: 'Uses break to terminate loop when i == 17',
      passed: usesBreak,
      message: usesBreak ? 'Passed' : 'Ensure you use break when i == 17'
    });
    if (usesBreak) marks += 1;

    await py.runPythonAsync(`
processed_sum = 0
${code}
`);
    const pSum = getVar('processed_sum');
    // Sum of numbers 1..16 excluding 3, 6, 9, 12, 15:
    // 1+2+4+5+7+8+10+11+13+14+16 = 91
    const pSumOk = pSum === 91;
    checks.push({
      name: 'Correct accumulated sum of processed numbers (91)',
      passed: pSumOk,
      message: pSumOk ? 'Passed' : `Expected 91, got ${pSum}`
    });
    if (pSumOk) marks += 1;

    results.push({
      questionId: 'quiz-q5',
      title: 'Question 5: Loop with break and continue',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q5',
      title: 'Question 5: Loop with break and continue',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 6: Nested Loops Even Sum Pairs (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q6'] || '';
    const checks = [];
    let marks = 0;

    const matchesFor = (code.match(/for\s+/g) || []).length >= 2;
    checks.push({
      name: 'Uses nested loops (at least two for loops)',
      passed: matchesFor,
      message: matchesFor ? 'Passed' : 'Problem requires nested loops'
    });
    if (matchesFor) marks += 1;

    const usesModulo = /%\s*2\s*==\s*0/.test(code) || /%\s*2/.test(code);
    checks.push({
      name: 'Checks parity of (i + j) using modulo',
      passed: usesModulo,
      message: usesModulo ? 'Passed' : 'Ensure condition checks if (i + j) % 2 == 0'
    });
    if (usesModulo) marks += 1;

    await py.runPythonAsync(`
even_sum_pairs = 0
${code}
`);
    const pairCount = getVar('even_sum_pairs');
    // For i in 1..4, j in 1..4:
    // (1,1), (1,3), (2,2), (2,4), (3,1), (3,3), (4,2), (4,4) -> exactly 8 pairs
    const countOk = pairCount === 8;
    checks.push({
      name: 'Correctly counts ordered pairs with even sum (8)',
      passed: countOk,
      message: countOk ? 'Passed' : `Expected 8, got ${pairCount}`
    });
    if (countOk) marks += 2;

    results.push({
      questionId: 'quiz-q6',
      title: 'Question 6: Nested Loops Even Sum Pairs',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q6',
      title: 'Question 6: Nested Loops Even Sum Pairs',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  return results;
}

/**
 * Automated Grader for Module 4 Homework (8 Tasks: H1 - H8, 40 Marks Total)
 */
export async function gradeModule4Homework(codeMap) {
  const py = await getPyodide();
  const results = [];

  const toPlain = (val) => {
    if (val instanceof Map) {
      const obj = {};
      for (const [k, v] of val.entries()) {
        obj[k] = toPlain(v);
      }
      return obj;
    }
    if (Array.isArray(val)) {
      return val.map(toPlain);
    }
    return val;
  };

  const getVar = (varName) => {
    try {
      const v = py.globals.get(varName);
      if (v && typeof v.toJs === 'function') {
        return toPlain(v.toJs({ dict_converter: Object.fromEntries }));
      }
      return toPlain(v);
    } catch (e) {
      return undefined;
    }
  };

  // ---------------------------------------------------------------------------
  // H1 (Task 4.2): Deduplicate List Without Helper Functions (5 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-h1'] || '';
    const checks = [];
    let marks = 0;

    const noForbidden = !/\bset\s*\(/.test(code) && !/\.remove\s*\(/.test(code);
    checks.push({
      name: 'Does not use set() or convenience removal helpers',
      passed: noForbidden,
      message: noForbidden ? 'Passed' : 'Avoid using set() or direct convenience functions'
    });
    if (noForbidden) marks += 1;

    // Test Case 1: Source list
    await py.runPythonAsync(`
numbers = [10, 56, 36, 87, 66, 99, 21, 96, 56, 67, 98, 66, 21, 87, 10, 98]
result_list = []
${code}
if 'result_list' not in locals() and 'l1' in locals():
    result_list = l1
`);
    const r1 = getVar('result_list') || [];
    const expected1 = [10, 56, 36, 87, 66, 99, 21, 96, 67, 98];
    const pass1 = JSON.stringify(r1) === JSON.stringify(expected1);
    checks.push({
      name: 'Correctly deduplicates source example preserving order',
      passed: pass1,
      message: pass1 ? 'Passed' : `Expected [${expected1.join(', ')}], got [${(r1 || []).join(', ')}]`
    });
    if (pass1) marks += 2;

    // Test Case 2: General test list
    await py.runPythonAsync(`
numbers = [1, 2, 2, 3, 1, 4, 3, 5]
result_list = []
${code}
if 'result_list' not in locals() and 'l1' in locals():
    result_list = l1
`);
    const r2 = getVar('result_list') || [];
    const expected2 = [1, 2, 3, 4, 5];
    const pass2 = JSON.stringify(r2) === JSON.stringify(expected2);
    checks.push({
      name: 'Correctly deduplicates alternate test list [1, 2, 2, 3, 1, 4, 3, 5]',
      passed: pass2,
      message: pass2 ? 'Passed' : `Expected [${expected2.join(', ')}], got [${(r2 || []).join(', ')}]`
    });
    if (pass2) marks += 2;

    results.push({
      questionId: 'hw-h1',
      title: 'H1 (Task 4.2): Deduplicate List Without Helper Functions',
      earnedPoints: marks,
      maxPoints: 5,
      passed: marks === 5,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-h1',
      title: 'H1 (Task 4.2): Deduplicate List Without Helper Functions',
      earnedPoints: 0,
      maxPoints: 5,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // H2 (Task 4.7): Filter Numbers Greater Than 10 (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-h2'] || '';
    const checks = [];
    let marks = 0;

    // Test Case 1
    await py.runPythonAsync(`
input_numbers = [4, 12, 7, 25, 9, 10, 31, 2]
greater_than_10 = []
${code}
`);
    const r1 = getVar('greater_than_10') || [];
    const expected1 = [12, 25, 31];
    const pass1 = JSON.stringify(r1) === JSON.stringify(expected1);
    checks.push({
      name: 'Filters elements > 10 from [4, 12, 7, 25, 9, 10, 31, 2]',
      passed: pass1,
      message: pass1 ? 'Passed' : `Expected [${expected1.join(', ')}], got [${(r1 || []).join(', ')}]`
    });
    if (pass1) marks += 2;

    // Test Case 2
    await py.runPythonAsync(`
input_numbers = [1, 10, 11, 5, 20, 100]
greater_than_10 = []
${code}
`);
    const r2 = getVar('greater_than_10') || [];
    const expected2 = [11, 20, 100];
    const pass2 = JSON.stringify(r2) === JSON.stringify(expected2);
    checks.push({
      name: 'Filters elements > 10 from [1, 10, 11, 5, 20, 100]',
      passed: pass2,
      message: pass2 ? 'Passed' : `Expected [${expected2.join(', ')}], got [${(r2 || []).join(', ')}]`
    });
    if (pass2) marks += 1;

    // Test Case 3: Empty edge case
    await py.runPythonAsync(`
input_numbers = [3, 5, 8, 10]
greater_than_10 = []
${code}
`);
    const r3 = getVar('greater_than_10') || [];
    const pass3 = Array.isArray(r3) && r3.length === 0;
    checks.push({
      name: 'Returns empty list when no numbers exceed 10',
      passed: pass3,
      message: pass3 ? 'Passed' : `Expected empty list [], got [${(r3 || []).join(', ')}]`
    });
    if (pass3) marks += 1;

    results.push({
      questionId: 'hw-h2',
      title: 'H2 (Task 4.7): Filter Numbers Greater Than 10',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-h2',
      title: 'H2 (Task 4.7): Filter Numbers Greater Than 10',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // H3 (Task 4.8): Flatten Nested List with List Comprehension (5 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-h3'] || '';
    const checks = [];
    let marks = 0;

    const usesListComp = /\[.*for\s+\w+\s+in\s+.*for\s+\w+\s+in\s+.*\]/s.test(code) || (/\[.*for\s+/s.test(code) && /for\s+/s.test(code));
    checks.push({
      name: 'Uses list comprehension syntax',
      passed: usesListComp,
      message: usesListComp ? 'Passed' : 'Construct must use list comprehension [item for sub in ... for item in sub]'
    });
    if (usesListComp) marks += 2;

    // Test Case 1: Source 2D list
    await py.runPythonAsync(`
nested_list = [[1, 2, 3, 4], [5, 6, 7, 8]]
flat_list = []
${code}
if 'flat_list' not in locals() and 'l2' in locals():
    flat_list = l2
`);
    const r1 = getVar('flat_list') || [];
    const expected1 = [1, 2, 3, 4, 5, 6, 7, 8];
    const pass1 = JSON.stringify(r1) === JSON.stringify(expected1);
    checks.push({
      name: 'Flattens [[1, 2, 3, 4], [5, 6, 7, 8]] into 1D list',
      passed: pass1,
      message: pass1 ? 'Passed' : `Expected [${expected1.join(', ')}], got [${(r1 || []).join(', ')}]`
    });
    if (pass1) marks += 2;

    // Test Case 2: Unequal sublists
    await py.runPythonAsync(`
nested_list = [[10, 20], [30, 40, 50], [60]]
flat_list = []
${code}
if 'flat_list' not in locals() and 'l2' in locals():
    flat_list = l2
`);
    const r2 = getVar('flat_list') || [];
    const expected2 = [10, 20, 30, 40, 50, 60];
    const pass2 = JSON.stringify(r2) === JSON.stringify(expected2);
    checks.push({
      name: 'Flattens varying-length nested list correctly',
      passed: pass2,
      message: pass2 ? 'Passed' : `Expected [${expected2.join(', ')}], got [${(r2 || []).join(', ')}]`
    });
    if (pass2) marks += 1;

    results.push({
      questionId: 'hw-h3',
      title: 'H3 (Task 4.8): Flatten Nested List with List Comprehension',
      earnedPoints: marks,
      maxPoints: 5,
      passed: marks === 5,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-h3',
      title: 'H3 (Task 4.8): Flatten Nested List with List Comprehension',
      earnedPoints: 0,
      maxPoints: 5,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // H4 (Task 4.9): Shift List Elements Right by N Positions (6 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-h4'] || '';
    const checks = [];
    let marks = 0;

    // Test Case 1: Source example [1, 2, 3, 4], n = 2
    await py.runPythonAsync(`
original_list = [1, 2, 3, 4]
n = 2
rotated_list = []
${code}
if 'rotated_list' not in locals() or not rotated_list:
    if 'output' in locals(): rotated_list = output
    elif 'ans' in locals(): rotated_list = ans
`);
    const r1 = getVar('rotated_list') || [];
    const expected1 = [3, 4, 1, 2];
    const pass1 = JSON.stringify(r1) === JSON.stringify(expected1);
    checks.push({
      name: 'Shifts [1, 2, 3, 4] right by 2 -> [3, 4, 1, 2]',
      passed: pass1,
      message: pass1 ? 'Passed' : `Expected [${expected1.join(', ')}], got [${(r1 || []).join(', ')}]`
    });
    if (pass1) marks += 2;

    // Test Case 2: ['a', 'b', 'c', 'd', 'e'], n = 1
    await py.runPythonAsync(`
original_list = ['a', 'b', 'c', 'd', 'e']
n = 1
rotated_list = []
${code}
if 'rotated_list' not in locals() or not rotated_list:
    if 'output' in locals(): rotated_list = output
    elif 'ans' in locals(): rotated_list = ans
`);
    const r2 = getVar('rotated_list') || [];
    const expected2 = ['e', 'a', 'b', 'c', 'd'];
    const pass2 = JSON.stringify(r2) === JSON.stringify(expected2);
    checks.push({
      name: 'Shifts [a, b, c, d, e] right by 1 -> [e, a, b, c, d]',
      passed: pass2,
      message: pass2 ? 'Passed' : `Expected [${expected2.join(', ')}], got [${(r2 || []).join(', ')}]`
    });
    if (pass2) marks += 2;

    // Test Case 3: [10, 20, 30], n = 3 (full rotation)
    await py.runPythonAsync(`
original_list = [10, 20, 30]
n = 3
rotated_list = []
${code}
if 'rotated_list' not in locals() or not rotated_list:
    if 'output' in locals(): rotated_list = output
    elif 'ans' in locals(): rotated_list = ans
`);
    const r3 = getVar('rotated_list') || [];
    const expected3 = [10, 20, 30];
    const pass3 = JSON.stringify(r3) === JSON.stringify(expected3);
    checks.push({
      name: 'Shifts [10, 20, 30] right by 3 -> [10, 20, 30]',
      passed: pass3,
      message: pass3 ? 'Passed' : `Expected [${expected3.join(', ')}], got [${(r3 || []).join(', ')}]`
    });
    if (pass3) marks += 2;

    results.push({
      questionId: 'hw-h4',
      title: 'H4 (Task 4.9): Shift List Elements Right by N Positions',
      earnedPoints: marks,
      maxPoints: 6,
      passed: marks === 6,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-h4',
      title: 'H4 (Task 4.9): Shift List Elements Right by N Positions',
      earnedPoints: 0,
      maxPoints: 6,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // H5 (Task 4.10): Count Frequency of List Elements (5 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-h5'] || '';
    const checks = [];
    let marks = 0;

    // Test Case 1: [1, 2, 2, 3, 3, 3]
    await py.runPythonAsync(`
data_list = [1, 2, 2, 3, 3, 3]
frequency_counts = {}
${code}
if 'frequency_counts' not in locals() or not frequency_counts:
    if 'freq' in locals(): frequency_counts = freq
    elif 'counts' in locals(): frequency_counts = counts
`);
    const r1 = getVar('frequency_counts') || {};
    const pass1 = (r1[1] === 1 || r1['1'] === 1) &&
                  (r1[2] === 2 || r1['2'] === 2) &&
                  (r1[3] === 3 || r1['3'] === 3);
    checks.push({
      name: 'Counts frequency of [1, 2, 2, 3, 3, 3]',
      passed: pass1,
      message: pass1 ? 'Passed' : `Expected {1: 1, 2: 2, 3: 3}, got ${JSON.stringify(r1)}`
    });
    if (pass1) marks += 3;

    // Test Case 2: String list
    await py.runPythonAsync(`
data_list = ['apple', 'banana', 'apple', 'cherry', 'banana', 'banana']
frequency_counts = {}
${code}
if 'frequency_counts' not in locals() or not frequency_counts:
    if 'freq' in locals(): frequency_counts = freq
    elif 'counts' in locals(): frequency_counts = counts
`);
    const r2 = getVar('frequency_counts') || {};
    const pass2 = r2['apple'] === 2 && r2['banana'] === 3 && r2['cherry'] === 1;
    checks.push({
      name: 'Counts frequency of fruit words correctly',
      passed: pass2,
      message: pass2 ? 'Passed' : `Expected {'apple': 2, 'banana': 3, 'cherry': 1}, got ${JSON.stringify(r2)}`
    });
    if (pass2) marks += 2;

    results.push({
      questionId: 'hw-h5',
      title: 'H5 (Task 4.10): Count Frequency of List Elements',
      earnedPoints: marks,
      maxPoints: 5,
      passed: marks === 5,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-h5',
      title: 'H5 (Task 4.10): Count Frequency of List Elements',
      earnedPoints: 0,
      maxPoints: 5,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // H6 (Task 4.12): Find Second Largest Number (5 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-h6'] || '';
    const checks = [];
    let marks = 0;

    // Test Case 1: Source example [12, 35, 1, 10, 34, 1] -> 34
    await py.runPythonAsync(`
num_list = [12, 35, 1, 10, 34, 1]
second_largest = None
${code}
`);
    const r1 = getVar('second_largest');
    const pass1 = Number(r1) === 34;
    checks.push({
      name: 'Finds second largest in [12, 35, 1, 10, 34, 1] -> 34',
      passed: pass1,
      message: pass1 ? 'Passed' : `Expected 34, got ${r1}`
    });
    if (pass1) marks += 3;

    // Test Case 2: Duplicates handling
    await py.runPythonAsync(`
num_list = [100, 45, 88, 92, 100, 95]
second_largest = None
${code}
`);
    const r2 = getVar('second_largest');
    // Either distinct 2nd largest (95) or sorted 2nd index (100)
    const pass2 = Number(r2) === 95 || Number(r2) === 100;
    checks.push({
      name: 'Handles lists with duplicate top values',
      passed: pass2,
      message: pass2 ? 'Passed' : `Expected 95 or 100, got ${r2}`
    });
    if (pass2) marks += 1;

    // Test Case 3: Simple 3 elements
    await py.runPythonAsync(`
num_list = [5, 20, 15]
second_largest = None
${code}
`);
    const r3 = getVar('second_largest');
    const pass3 = Number(r3) === 15;
    checks.push({
      name: 'Finds second largest in [5, 20, 15] -> 15',
      passed: pass3,
      message: pass3 ? 'Passed' : `Expected 15, got ${r3}`
    });
    if (pass3) marks += 1;

    results.push({
      questionId: 'hw-h6',
      title: 'H6 (Task 4.12): Find Second Largest Number',
      earnedPoints: marks,
      maxPoints: 5,
      passed: marks === 5,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-h6',
      title: 'H6 (Task 4.12): Find Second Largest Number',
      earnedPoints: 0,
      maxPoints: 5,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // H7 (Task 4.16): Character Frequency Dictionary (5 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-h7'] || '';
    const checks = [];
    let marks = 0;

    // Test Case 1: "Hello World"
    await py.runPythonAsync(`
raw_string = "Hello World"
char_freq = {}
${code}
`);
    const r1 = getVar('char_freq') || {};
    const expected1 = { 'h': 1, 'e': 1, 'l': 3, 'o': 2, 'w': 1, 'r': 1, 'd': 1 };
    const pass1 = Object.keys(expected1).every((k) => r1[k] === expected1[k]) && !r1[' '];
    checks.push({
      name: 'Calculates char frequency for "Hello World" excluding spaces',
      passed: pass1,
      message: pass1 ? 'Passed' : `Expected ${JSON.stringify(expected1)}, got ${JSON.stringify(r1)}`
    });
    if (pass1) marks += 3;

    // Test Case 2: "Data Structures"
    await py.runPythonAsync(`
raw_string = "Data Structures"
char_freq = {}
${code}
`);
    const r2 = getVar('char_freq') || {};
    const pass2 = r2['d'] === 1 && r2['a'] === 2 && r2['t'] === 3 && r2['s'] === 2 && !r2[' '];
    checks.push({
      name: 'Calculates char frequency for "Data Structures" (case-insensitive, no spaces)',
      passed: pass2,
      message: pass2 ? 'Passed' : `Incorrect frequency counts for 'Data Structures': ${JSON.stringify(r2)}`
    });
    if (pass2) marks += 2;

    results.push({
      questionId: 'hw-h7',
      title: 'H7 (Task 4.16): Character Frequency Dictionary',
      earnedPoints: marks,
      maxPoints: 5,
      passed: marks === 5,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-h7',
      title: 'H7 (Task 4.16): Character Frequency Dictionary',
      earnedPoints: 0,
      maxPoints: 5,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // H8 (Task 4.17): Dictionary of Squares 1 to N (5 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['hw-h8'] || '';
    const checks = [];
    let marks = 0;

    // Test Case 1: n = 3 -> {1: 1, 2: 4, 3: 9}
    await py.runPythonAsync(`
n = 3
squares_dict = {}
${code}
`);
    const r1 = getVar('squares_dict') || {};
    const pass1 = (r1[1] === 1 || r1['1'] === 1) &&
                  (r1[2] === 4 || r1['2'] === 4) &&
                  (r1[3] === 9 || r1['3'] === 9);
    checks.push({
      name: 'Generates {1: 1, 2: 4, 3: 9} for n = 3',
      passed: pass1,
      message: pass1 ? 'Passed' : `Expected {1: 1, 2: 4, 3: 9}, got ${JSON.stringify(r1)}`
    });
    if (pass1) marks += 2;

    // Test Case 2: n = 5
    await py.runPythonAsync(`
n = 5
squares_dict = {}
${code}
`);
    const r2 = getVar('squares_dict') || {};
    const pass2 = (r2[4] === 16 || r2['4'] === 16) && (r2[5] === 25 || r2['5'] === 25);
    checks.push({
      name: 'Correctly scales to n = 5 ({..., 4: 16, 5: 25})',
      passed: pass2,
      message: pass2 ? 'Passed' : `Expected entries for 4 and 5, got ${JSON.stringify(r2)}`
    });
    if (pass2) marks += 2;

    // Test Case 3: n = 1
    await py.runPythonAsync(`
n = 1
squares_dict = {}
${code}
`);
    const r3 = getVar('squares_dict') || {};
    const pass3 = (r3[1] === 1 || r3['1'] === 1) && Object.keys(r3).length === 1;
    checks.push({
      name: 'Base case n = 1 generates {1: 1}',
      passed: pass3,
      message: pass3 ? 'Passed' : `Expected {1: 1}, got ${JSON.stringify(r3)}`
    });
    if (pass3) marks += 1;

    results.push({
      questionId: 'hw-h8',
      title: 'H8 (Task 4.17): Dictionary of Squares 1 to N',
      earnedPoints: marks,
      maxPoints: 5,
      passed: marks === 5,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'hw-h8',
      title: 'H8 (Task 4.17): Dictionary of Squares 1 to N',
      earnedPoints: 0,
      maxPoints: 5,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  return results;
}

/**
 * Automated Grader for Module 4 Coding Quiz (6 Questions: Q1 - Q6, 20 Marks Total)
 */
export async function gradeModule4Quiz(codeMap) {
  const py = await getPyodide();
  const results = [];

  const toPlain = (val) => {
    if (val instanceof Map) {
      const obj = {};
      for (const [k, v] of val.entries()) {
        obj[k] = toPlain(v);
      }
      return obj;
    }
    if (Array.isArray(val)) {
      return val.map(toPlain);
    }
    return val;
  };

  const getVar = (varName) => {
    try {
      const v = py.globals.get(varName);
      if (v && typeof v.toJs === 'function') {
        return toPlain(v.toJs({ dict_converter: Object.fromEntries }));
      }
      return toPlain(v);
    } catch (e) {
      return undefined;
    }
  };

  // ---------------------------------------------------------------------------
  // Question 1: List Operations (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q1'] || '';
    const checks = [];
    let marks = 0;

    await py.runPythonAsync(`
inventory = ["pen", "book", "eraser", "pencil"]
updated_inventory = None
${code}
if updated_inventory is None and 'inventory' in locals():
    updated_inventory = inventory
`);
    const inv = getVar('updated_inventory') || [];
    const expected = ["notebook", "book", "marker", "pencil", "ruler"];

    const removedPen = Array.isArray(inv) && !inv.includes('pen');
    const addedItems = Array.isArray(inv) && inv.includes('marker') && inv.includes('ruler') && inv.includes('notebook');
    checks.push({
      name: 'Modifies, appends, inserts, and removes specified items',
      passed: removedPen && addedItems,
      message: removedPen && addedItems ? 'Passed' : 'Ensure pen is removed, eraser is changed to marker, ruler is appended, and notebook inserted'
    });
    if (removedPen && addedItems) marks += 1;

    const lengthOk = Array.isArray(inv) && inv.length === 5;
    checks.push({
      name: 'Maintains correct final list length (5)',
      passed: lengthOk,
      message: lengthOk ? 'Passed' : `Expected length 5, got ${inv.length}`
    });
    if (lengthOk) marks += 1;

    const exactMatch = JSON.stringify(inv) === JSON.stringify(expected);
    checks.push({
      name: 'Correct sequence: ["notebook", "book", "marker", "pencil", "ruler"]',
      passed: exactMatch,
      message: exactMatch ? 'Passed' : `Got [${(inv || []).join(', ')}]`
    });
    if (exactMatch) marks += 1;

    results.push({
      questionId: 'quiz-q1',
      title: 'Question 1: List Operations',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q1',
      title: 'Question 1: List Operations',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 2: List Comprehension (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q2'] || '';
    const checks = [];
    let marks = 0;

    const usesListComp = /\[.*for\s+\w+\s+in\s+range.*\]/s.test(code) || /\[.*for\s+.*\]/s.test(code);
    checks.push({
      name: 'Uses list comprehension syntax',
      passed: usesListComp,
      message: usesListComp ? 'Passed' : 'Must use list comprehension syntax [x**2 for x in ... if ...]'
    });
    if (usesListComp) marks += 1;

    await py.runPythonAsync(`
odd_squares = []
${code}
`);
    const r = getVar('odd_squares') || [];
    const expected = [1, 9, 25, 49, 81, 121, 169, 225];
    const pass = JSON.stringify(r) === JSON.stringify(expected);
    checks.push({
      name: 'Generates squares of odd numbers from 1 through 15',
      passed: pass,
      message: pass ? 'Passed' : `Expected [${expected.join(', ')}], got [${(r || []).join(', ')}]`
    });
    if (pass) marks += 2;

    results.push({
      questionId: 'quiz-q2',
      title: 'Question 2: List Comprehension',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q2',
      title: 'Question 2: List Comprehension',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 3: Nested Lists (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q3'] || '';
    const checks = [];
    let marks = 0;

    const usesNestedOrComp = (/for\s+.*for\s+/s.test(code) || /\[.*for\s+.*for\s+.*\]/s.test(code));
    checks.push({
      name: 'Uses nested loops or list comprehension',
      passed: usesNestedOrComp,
      message: usesNestedOrComp ? 'Passed' : 'Use nested loops or list comprehension to flatten the matrix'
    });
    if (usesNestedOrComp) marks += 2;

    await py.runPythonAsync(`
matrix = [
  [2, 4, 6],
  [1, 3, 5],
  [8, 10]
]
flat_values = []
${code}
`);
    const r = getVar('flat_values') || [];
    const expected = [2, 4, 6, 1, 3, 5, 8, 10];
    const pass = JSON.stringify(r) === JSON.stringify(expected);
    checks.push({
      name: 'Correctly flattens matrix into [2, 4, 6, 1, 3, 5, 8, 10]',
      passed: pass,
      message: pass ? 'Passed' : `Expected [${expected.join(', ')}], got [${(r || []).join(', ')}]`
    });
    if (pass) marks += 2;

    results.push({
      questionId: 'quiz-q3',
      title: 'Question 3: Nested Lists',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q3',
      title: 'Question 3: Nested Lists',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 4: Tuples (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q4'] || '';
    const checks = [];
    let marks = 0;

    await py.runPythonAsync(`
t1 = ("Python", "Java")
t2 = ("C++", "JavaScript")
languages = None
middle_languages = None
${code}
`);
    const lang = getVar('languages') || [];
    const mid = getVar('middle_languages') || [];

    const expectedLang = ["Python", "Java", "C++", "JavaScript"];
    const expectedMid = ["Java", "C++"];

    const passLang = JSON.stringify(Array.from(lang)) === JSON.stringify(expectedLang);
    checks.push({
      name: 'Concatenates tuples into languages ("Python", "Java", "C++", "JavaScript")',
      passed: passLang,
      message: passLang ? 'Passed' : `Expected ("Python", "Java", "C++", "JavaScript"), got ${JSON.stringify(lang)}`
    });
    if (passLang) marks += 1;

    const passMid = JSON.stringify(Array.from(mid)) === JSON.stringify(expectedMid);
    checks.push({
      name: 'Extracts middle two elements into middle_languages ("Java", "C++")',
      passed: passMid,
      message: passMid ? 'Passed' : `Expected ("Java", "C++"), got ${JSON.stringify(mid)}`
    });
    if (passMid) marks += 2;

    results.push({
      questionId: 'quiz-q4',
      title: 'Question 4: Tuples',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q4',
      title: 'Question 4: Tuples',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 5: Dictionary Access and Update (3 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q5'] || '';
    const checks = [];
    let marks = 0;

    await py.runPythonAsync(`
stock = {
  "pen": 10,
  "book": 4,
  "eraser": 7
}
eraser_stock = None
${code}
`);
    const st = getVar('stock') || {};
    const erStock = getVar('eraser_stock');

    const passBook = st['book'] === 8;
    checks.push({
      name: 'Updates "book" quantity to 8',
      passed: passBook,
      message: passBook ? 'Passed' : `Expected stock["book"] == 8, got ${st['book']}`
    });
    if (passBook) marks += 1;

    const passMarker = st['marker'] === 5;
    checks.push({
      name: 'Adds new entry "marker": 5',
      passed: passMarker,
      message: passMarker ? 'Passed' : `Expected stock["marker"] == 5, got ${st['marker']}`
    });
    if (passMarker) marks += 1;

    const passEraser = Number(erStock) === 7;
    checks.push({
      name: 'Extracts value for "eraser" into eraser_stock (7)',
      passed: passEraser,
      message: passEraser ? 'Passed' : `Expected eraser_stock == 7, got ${erStock}`
    });
    if (passEraser) marks += 1;

    results.push({
      questionId: 'quiz-q5',
      title: 'Question 5: Dictionary Access and Update',
      earnedPoints: marks,
      maxPoints: 3,
      passed: marks === 3,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q5',
      title: 'Question 5: Dictionary Access and Update',
      earnedPoints: 0,
      maxPoints: 3,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  // ---------------------------------------------------------------------------
  // Question 6: Dictionary Processing (4 Marks)
  // ---------------------------------------------------------------------------
  try {
    const code = codeMap['quiz-q6'] || '';
    const checks = [];
    let marks = 0;

    const hasLoop = /for\s+.*in\s+.*:/i.test(code);
    checks.push({
      name: 'Iterates through dictionary items',
      passed: hasLoop,
      message: hasLoop ? 'Passed' : 'Use a for loop to iterate over scores'
    });
    if (hasLoop) marks += 1;

    const hasThreshold = />=\s*80|>=\s*80\.0|>\s*79/i.test(code);
    checks.push({
      name: 'Applies >= 80 threshold condition',
      passed: hasThreshold,
      message: hasThreshold ? 'Passed' : 'Condition must check if score is 80 or greater'
    });
    if (hasThreshold) marks += 1;

    await py.runPythonAsync(`
scores = {
  "Ava": 72,
  "Liam": 91,
  "Noah": 67,
  "Mia": 88,
  "Zoe": 95
}
high_scores = {}
${code}
`);
    const hs = getVar('high_scores') || {};

    const hasCorrectKeys = hs['Liam'] === 91 && hs['Mia'] === 88 && hs['Zoe'] === 95;
    checks.push({
      name: 'Includes only Liam (91), Mia (88), and Zoe (95)',
      passed: hasCorrectKeys,
      message: hasCorrectKeys ? 'Passed' : `Missing or incorrect qualifying entries: ${JSON.stringify(hs)}`
    });
    if (hasCorrectKeys) marks += 1;

    const noExtras = !hs['Ava'] && !hs['Noah'] && Object.keys(hs).length === 3;
    checks.push({
      name: 'Excludes scores under 80 (Ava, Noah)',
      passed: noExtras,
      message: noExtras ? 'Passed' : `Non-qualifying entries were not filtered out: ${JSON.stringify(hs)}`
    });
    if (noExtras) marks += 1;

    results.push({
      questionId: 'quiz-q6',
      title: 'Question 6: Dictionary Processing',
      earnedPoints: marks,
      maxPoints: 4,
      passed: marks === 4,
      checks
    });
  } catch (err) {
    results.push({
      questionId: 'quiz-q6',
      title: 'Question 6: Dictionary Processing',
      earnedPoints: 0,
      maxPoints: 4,
      passed: false,
      checks: [{ name: 'Execution check', passed: false, message: `Python error: ${err.message}` }]
    });
  }

  return results;
}
