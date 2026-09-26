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

    py.setStdout({ batched: (msg) => { stdout += msg + '\n'; } });
    py.setStderr({ batched: (msg) => { stderr += msg + '\n'; } });

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
