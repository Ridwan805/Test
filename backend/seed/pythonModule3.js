import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Assessment from '../models/Assessment.js';

/**
 * Seeds Module 3 — Control Flow and Loops with authoritative curriculum from Module 3.pdf
 * - 10 Lessons with structured static content blocks and visual flowcharts
 * - Graded Homework (40 marks, 40% weight: Section A 12m, Section B 4m, Section C 24m)
 * - Graded Coding Quiz (20 marks, 60% weight: 6 comprehensive questions)
 * - Module 3 Practice Notebook reference
 * - Module 4 placeholder with progression gate
 * Uses idempotent upsert operations.
 */
export async function seedPythonModule3() {
  console.log('[Seed] Starting Python Module 3 database seeding...');

  // 1. Find or verify Course: Introduction to Python
  const course = await Course.findOne({ slug: 'intro-to-python' });
  if (!course) {
    console.warn('[Seed Warning] intro-to-python course not found. Skipping Module 3 seed.');
    return;
  }

  // 2. Upsert Module 3: Control Flow and Loops
  const moduleData = {
    courseId: course._id,
    title: 'Control Flow and Loops',
    moduleNumber: 3,
    order: 3,
    description: 'Master program decision-making and repetition: if-elif-else conditionals, nested logic, while loops, for loops, range(), break, continue, and indentation rules.',
    published: true
  };

  const module3 = await Module.findOneAndUpdate(
    { courseId: course._id, moduleNumber: 3 },
    { $set: moduleData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Seed] Module 3 verified: ${module3.title} (${module3._id})`);

  // Ensure Module 4 placeholder exists for progression gate testing
  await Module.findOneAndUpdate(
    { courseId: course._id, moduleNumber: 4 },
    {
      $set: {
        courseId: course._id,
        title: 'Functions and Data Structures',
        moduleNumber: 4,
        order: 4,
        description: 'Advanced Python engineering: custom functions, parameters, return values, lists, tuples, dictionaries, and modular code architecture.',
        published: true
      }
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // Update embedded modules on Course document
  await Course.updateOne(
    { _id: course._id },
    {
      $set: {
        modules: [
          { title: 'Module 1: Getting Started with Python', order: 1 },
          { title: 'Module 2: Python Fundamentals', order: 2 },
          { title: 'Module 3: Control Flow and Loops', order: 3 },
          { title: 'Module 4: Functions and Data Structures', order: 4 }
        ]
      }
    }
  );

  // 3. Define the 10 Lessons from authoritative Module 3.pdf
  const lessonsData = [
    // -------------------------------------------------------------------------
    // Lesson 1: Introduction to Control Flow and Indentation
    // -------------------------------------------------------------------------
    {
      title: 'Introduction to Control Flow and Indentation',
      slug: 'control-flow-and-indentation',
      lessonNumber: 1,
      order: 1,
      estimatedMinutes: 10,
      content: [
        { type: 'heading', level: 2, text: 'Introduction to Control Flow and Indentation' },
        { type: 'heading', level: 3, text: 'What is Control Flow in Python?' },
        {
          type: 'paragraph',
          text: 'Control flow in Python refers to how statements in a program are executed, particularly when it comes to making decisions or repeating actions. By default, Python executes code line-by-line from top to bottom. Control flow constructs alter this linear path based on logic and evaluation.'
        },
        {
          type: 'note',
          title: 'Two Pillars of Control Flow',
          text: 'Python provides two fundamental mechanisms to control program execution:\n1. Conditional Statements (if, elif, else) — choose which blocks to execute.\n2. Loops (while, for) — repeat a block of code multiple times.'
        },
        { type: 'heading', level: 3, text: 'Indentation: Python’s Block Delimiter' },
        {
          type: 'paragraph',
          text: 'Unlike other languages that use curly braces { } or keywords like begin/end to define blocks of code, Python uses indentation (whitespace). In Python, indentation defines the block of code that belongs to a specific control structure. Where we use control flow, we MUST indent the inner statements, or Python will raise an IndentationError.'
        },
        {
          type: 'table',
          title: 'Basic Conditional Decision Flow',
          headers: ['Step', 'Action', 'Result'],
          rows: [
            ['1. Evaluate Condition', 'Python checks if the expression evaluates to True or False.', 'Logical True / False'],
            ['2. True Branch (Yes)', 'Indented statements directly under the if header execute.', 'Code Runs'],
            ['3. False Branch (No)', 'Indented statements are skipped entirely; execution resumes after.', 'Code Skipped']
          ]
        },
        { type: 'heading', level: 3, text: 'First Conditional Example: The if Statement' },
        {
          type: 'paragraph',
          text: 'The if statement checks if a condition is True. If it is, the code inside the indented if block runs. If False, the program skips that block entirely.'
        },
        {
          type: 'codeExample',
          code: 'age = 18\nif age >= 18:\n    print("You are eligible to vote.")'
        },
        {
          type: 'output',
          text: 'You are eligible to vote.'
        },
        {
          type: 'explanation',
          text: 'Here, the variable age holds 18. The relational comparison 18 >= 18 evaluates to True. Because the condition is True, the indented print() statement inside the block executes.'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 2: if, else, and elif
    // -------------------------------------------------------------------------
    {
      title: 'if, else, and elif Statements',
      slug: 'if-else-and-elif',
      lessonNumber: 2,
      order: 2,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'Branching Logic: if, else, and elif' },
        { type: 'heading', level: 3, text: 'The else Statement' },
        {
          type: 'paragraph',
          text: 'The else statement allows you to execute one block of code if the condition is True, and an alternative block if the condition is False. It acts as a fallback default branch.'
        },
        {
          type: 'codeExample',
          code: 'age = 16\nif age >= 18:\n    print("You are eligible to vote.")\nelse:\n    print("You are not eligible to vote.")'
        },
        {
          type: 'output',
          text: 'You are not eligible to vote.'
        },
        {
          type: 'explanation',
          text: 'Since age is 16, age >= 18 is False. Python bypasses the if block and immediately enters the indented else block, printing the notification.'
        },
        { type: 'heading', level: 3, text: 'The elif Statement (Chained Conditions)' },
        {
          type: 'paragraph',
          text: 'The elif (short for "else if") statement is used when you have multiple conditions to evaluate sequentially. Python tests each condition from top to bottom. Only the FIRST condition that evaluates to True will be executed; subsequent elif and else blocks are skipped.'
        },
        {
          type: 'codeExample',
          code: 'score = 85\nif score >= 90:\n    print("Grade: A")\nelif score >= 80:\n    print("Grade: B")\nelse:\n    print("Grade: C")'
        },
        {
          type: 'output',
          text: 'Grade: B'
        },
        {
          type: 'explanation',
          text: 'Evaluation sequence:\n1. score >= 90 (85 >= 90) is False. Skip.\n2. score >= 80 (85 >= 80) is True. Execute "Grade: B"!\n3. The remaining else block is skipped.'
        },
        {
          type: 'note',
          title: 'Curriculum Note on Source Consistency',
          text: 'In some printed slides of Module 3, a stray comment `#output: 85` appears beside the else block. Executing the code demonstrates that with score = 85, Python accurately evaluates the second branch and produces "Grade: B".'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 3: Nested if-else
    // -------------------------------------------------------------------------
    {
      title: 'Nested if-else Statements',
      slug: 'nested-if-else',
      lessonNumber: 3,
      order: 3,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'Nested if-else Decision Structures' },
        { type: 'heading', level: 3, text: 'What are Nested Conditions?' },
        {
          type: 'paragraph',
          text: 'Nested conditions refer to placing an if, elif, or else statement inside another if or else block. This allows you to model multi-stage decisions where the second check is only relevant if the first check succeeded.'
        },
        {
          type: 'codeExample',
          code: 'age = 20\nhas_ticket = True\n\nif age >= 18:\n    if has_ticket:\n        print("You are allowed to enter the event.")\n    else:\n        print("You need a ticket to enter.")\nelse:\n    print("You are too young to enter.")'
        },
        {
          type: 'output',
          text: 'You are allowed to enter the event.'
        },
        {
          type: 'explanation',
          text: 'Step-by-step evaluation:\n1. Outer Condition: age >= 18 (20 >= 18) is True. Python enters the outer block.\n2. Inner Condition: has_ticket is True. Python prints "You are allowed to enter the event."\n3. The outer else block is completely bypassed.'
        },
        {
          type: 'warning',
          title: 'Indentation Levels in Nested Blocks',
          text: 'Notice that the inner if and else statements are indented by 4 spaces. The code statements inside the inner if block are indented by 8 spaces (two levels). Consistent indentation is mandatory.'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 4: Introduction to Loops and while Loops
    // -------------------------------------------------------------------------
    {
      title: 'Introduction to Loops and while Loops',
      slug: 'loops-and-while-loops',
      lessonNumber: 4,
      order: 4,
      estimatedMinutes: 15,
      content: [
        { type: 'heading', level: 2, text: 'Introduction to Loops and while Loops' },
        { type: 'heading', level: 3, text: 'Why Do We Need Loops?' },
        {
          type: 'paragraph',
          text: 'Suppose we want to print numbers from 1 to 5. We could write 5 print() statements. But what if we needed to print 100, 1,000, or 10,000 numbers? Writing thousands of duplicate lines is time-consuming, unmaintainable, and error-prone. Loops allow us to execute a block of code repeatedly until a specific stopping condition is met.'
        },
        {
          type: 'note',
          title: 'The Two Types of Loops in Python',
          text: '1. while Loop — repeats as long as a condition evaluates to True.\n2. for Loop — iterates over a collection, sequence, or range of values.'
        },
        { type: 'heading', level: 3, text: 'The while Loop Syntax and Mechanism' },
        {
          type: 'paragraph',
          text: 'A while loop repeatedly executes its block as long as its condition remains True. This is ideal when the exact number of iterations is not known in advance, but depends on dynamic conditions.'
        },
        {
          type: 'table',
          title: 'while Loop Execution Cycle',
          headers: ['Phase', 'Description'],
          rows: [
            ['Start', 'Program reaches the while header.'],
            ['Condition Check', 'Python evaluates while condition. If True, proceed to body. If False, exit loop.'],
            ['Loop Body', 'Execute all indented statements.'],
            ['Update Variable', 'Modify the loop variable (e.g., x -= 1) so condition eventually becomes False.'],
            ['Loop Back', 'Return to Condition Check and repeat.']
          ]
        },
        {
          type: 'codeExample',
          code: 'x = 10\nwhile x > 0:\n    print(x)\n    x -= 1\n\nprint("loop completed")'
        },
        {
          type: 'output',
          text: '10\n9\n8\n7\n6\n5\n4\n3\n2\n1\nloop completed'
        },
        {
          type: 'warning',
          title: 'Avoiding Infinite Loops',
          text: 'Notice line 4: `x -= 1`. Updating the loop variable is crucial! If you omit the decrement, x remains 10 indefinitely, the condition x > 0 never becomes False, and the program is stuck in an infinite loop.'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 5: for Loops
    // -------------------------------------------------------------------------
    {
      title: 'for Loops and Sequence Iteration',
      slug: 'for-loops',
      lessonNumber: 5,
      order: 5,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'The for Loop in Python' },
        { type: 'heading', level: 3, text: 'Iterating Over Sequences' },
        {
          type: 'paragraph',
          text: 'In Python, a for loop is used to iterate over a sequence (such as a string, list, tuple, or range object) and execute a block of code for each element in that sequence. Unlike the while loop, a for loop is typically used when the sequence of items is known ahead of time.'
        },
        {
          type: 'codeExample',
          code: 'for i in "python":\n    print(i)'
        },
        {
          type: 'output',
          text: 'p\ny\nt\nh\no\nn'
        },
        {
          type: 'explanation',
          text: 'In this example, `i` is the temporary loop variable and `"python"` is the string sequence. On iteration 1, i = "p". On iteration 2, i = "y", and so on until every character has been processed. Python handles advancing to the next item automatically!'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 6: The range() Function
    // -------------------------------------------------------------------------
    {
      title: 'The range() Function',
      slug: 'range-function',
      lessonNumber: 6,
      order: 6,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'Generating Numeric Sequences with range()' },
        { type: 'heading', level: 3, text: 'What is the range() Function?' },
        {
          type: 'paragraph',
          text: 'The range() function generates an immutable sequence of integers. It accepts one, two, or three arguments: start, stop, and step.'
        },
        {
          type: 'table',
          title: 'The Three Forms of range()',
          headers: ['Form', 'Arguments', 'Values Generated'],
          rows: [
            ['range(stop)', 'range(5)', '0, 1, 2, 3, 4 (stop is exclusive)'],
            ['range(start, stop)', 'range(2, 6)', '2, 3, 4, 5 (start inclusive, stop exclusive)'],
            ['range(start, stop, step)', 'range(1, 10, 2)', '1, 3, 5, 7, 9 (increments by step)']
          ]
        },
        { type: 'heading', level: 3, text: 'Iterating with range(start, stop, step)' },
        {
          type: 'paragraph',
          text: 'Let us see how to print all even numbers from 1 to 20 using range with a step size of 2:'
        },
        {
          type: 'codeExample',
          code: 'for i in range(2, 21, 2):\n    print(i)'
        },
        {
          type: 'output',
          text: '2\n4\n6\n8\n10\n12\n14\n16\n18\n20'
        },
        {
          type: 'explanation',
          text: 'We start at 2 (since 1 is not even). We specify 21 as the stop value so that 20 is included (because the stop value is exclusive). The step of 2 advances the counter by 2 on every cycle.'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 7: Conditions Inside Loops
    // -------------------------------------------------------------------------
    {
      title: 'Conditions Inside Loops',
      slug: 'conditions-inside-loops',
      lessonNumber: 7,
      order: 7,
      estimatedMinutes: 14,
      content: [
        { type: 'heading', level: 2, text: 'Combining Loops with Conditional Logic' },
        { type: 'heading', level: 3, text: 'Why Place Conditions Inside Loops?' },
        {
          type: 'paragraph',
          text: 'Placing if/else conditions inside loops allows programs to inspect each individual iteration, filter specific values, or terminate loops when an event occurs.'
        },
        { type: 'heading', level: 3, text: 'Example 1: Filtering Multiples with a for Loop' },
        {
          type: 'codeExample',
          code: 'n = 10\nfor i in range(1, n + 1):\n    if i % 3 == 0:\n        print(f"{i} is a multiple of 3.")\n    else:\n        print(f"{i} is not a multiple of 3.")'
        },
        {
          type: 'output',
          text: '1 is not a multiple of 3.\n2 is not a multiple of 3.\n3 is a multiple of 3.\n4 is not a multiple of 3.\n5 is not a multiple of 3.\n6 is a multiple of 3.\n7 is not a multiple of 3.\n8 is not a multiple of 3.\n9 is a multiple of 3.\n10 is not a multiple of 3.'
        },
        { type: 'heading', level: 3, text: 'Example 2: Limited Password Attempts with while' },
        {
          type: 'paragraph',
          text: 'A common real-world application is limiting user login attempts. The while loop tracks the number of tries, and an inner condition checks credentials.'
        },
        {
          type: 'codeExample',
          code: 'correct_password = "python123"\nattempts = 0\nmax_attempts = 3\n\nwhile attempts < max_attempts:\n    password = "secret"  # simulated user entry\n    if password == correct_password:\n        print("Access granted!")\n        break\n    else:\n        attempts += 1\n        print(f"Incorrect password. {max_attempts - attempts} attempts left.")\n\nif attempts == max_attempts:\n    print("Too many incorrect attempts. Access denied.")'
        },
        {
          type: 'explanation',
          text: 'If the user provides the correct password, the break statement terminates the loop immediately. If incorrect, attempts increments until max_attempts is reached, triggering the access denial.'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 8: Nested Loops
    // -------------------------------------------------------------------------
    {
      title: 'Nested Loops',
      slug: 'nested-loops',
      lessonNumber: 8,
      order: 8,
      estimatedMinutes: 14,
      content: [
        { type: 'heading', level: 2, text: 'Nested Loops: Loops Inside Loops' },
        { type: 'heading', level: 3, text: 'How Nested Loops Work' },
        {
          type: 'paragraph',
          text: 'A nested loop is a loop placed inside the body of another loop. For every single iteration of the outer loop, the inner loop runs completely through all of its iterations from start to finish.'
        },
        {
          type: 'codeExample',
          code: 'person1 = ["mango", "orange", "pineapple"]\nperson2 = ["jackfruit", "mango", "licchi"]\ncounter = 0\n\nfor i in person1:\n    for j in person2:\n        if i == j:\n            counter += 1\n            print(f"{i} is common in both")\n\nif counter == 0:\n    print("Both have unique fruits")'
        },
        {
          type: 'output',
          text: 'mango is common in both'
        },
        {
          type: 'explanation',
          text: 'The outer loop selects person1 item "mango". The inner loop tests it against "jackfruit", "mango", and "licchi". When i == j matches, counter increments and the message prints.'
        },
        {
          type: 'note',
          title: 'Curriculum Scope Note',
          text: 'While lists are introduced here to demonstrate matching collections, you are only assessed on loop control structures, comparisons, and indentation logic in Module 3.'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 9: break, continue, and pass
    // -------------------------------------------------------------------------
    {
      title: 'Loop Controls: break, continue, and pass',
      slug: 'break-continue-pass',
      lessonNumber: 9,
      order: 9,
      estimatedMinutes: 14,
      content: [
        { type: 'heading', level: 2, text: 'Loop Control Statements: break, continue, and pass' },
        { type: 'heading', level: 3, text: 'Summary of the Three Keywords' },
        {
          type: 'table',
          title: 'Comparison of Loop Control Statements',
          headers: ['Statement', 'Primary Purpose', 'Behavior on Execution'],
          rows: [
            ['break', 'Premature exit', 'Terminates the loop immediately and jumps to code following the loop.'],
            ['continue', 'Skip iteration', 'Skips remaining statements in current cycle and jumps to next iteration.'],
            ['pass', 'Syntax placeholder', 'Does nothing; acts as a dummy statement where code is required syntactically.']
          ]
        },
        { type: 'heading', level: 3, text: 'The break Statement' },
        {
          type: 'codeExample',
          code: 'for num in range(1, 10):\n    if num == 5:\n        break\n    print(num)'
        },
        {
          type: 'output',
          text: '1\n2\n3\n4'
        },
        {
          type: 'explanation',
          text: 'As soon as num reaches 5, `break` executes and the loop terminates. Numbers 5 through 9 are never printed.'
        },
        { type: 'heading', level: 3, text: 'The continue Statement' },
        {
          type: 'codeExample',
          code: 'for num in range(1, 10):\n    if num % 2 == 0:\n        continue\n    print(num)'
        },
        {
          type: 'output',
          text: '1\n3\n5\n7\n9'
        },
        {
          type: 'explanation',
          text: 'When num is even (num % 2 == 0), `continue` skips the print(num) call and moves immediately to the next number. Therefore, only odd numbers are printed.'
        },
        { type: 'heading', level: 3, text: 'The pass Statement' },
        {
          type: 'codeExample',
          code: 'for i in range(5):\n    pass  # Placeholder for future implementation\n\nprint("Loop with pass finished without error!")'
        },
        {
          type: 'output',
          text: 'Loop with pass finished without error!'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 10: Indentation Recap and Common Control-Flow Errors
    // -------------------------------------------------------------------------
    {
      title: 'Indentation Recap and Common Control-Flow Errors',
      slug: 'indentation-recap-and-errors',
      lessonNumber: 10,
      order: 10,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'Indentation Recap and Common Control-Flow Errors' },
        { type: 'heading', level: 3, text: 'Why Indentation Governs Python' },
        {
          type: 'paragraph',
          text: 'In Python, indentation is not cosmetic—it dictates program structure and variable scope. A block of code begins when an indentation level increases and ends when the indentation returns to the previous level.'
        },
        {
          type: 'codeComparison',
          leftTitle: '✓ Correct Indentation',
          leftCode: 'for i in range(5):\n    print(i)\nprint("Done")',
          rightTitle: '✗ Incorrect (IndentationError)',
          rightCode: 'for i in range(5):\nprint(i)\nprint("Done")'
        },
        { type: 'heading', level: 3, text: 'Top 4 Common Control-Flow Mistakes to Avoid' },
        {
          type: 'table',
          title: 'Common Beginner Mistakes and Fixes',
          headers: ['Mistake', 'Example', 'Corrected Solution'],
          rows: [
            ['Missing Colon (SyntaxError)', 'if x > 5', 'Add colon: if x > 5:'],
            ['Single = in Condition', 'if x = 10:', 'Use comparison ==: if x == 10:'],
            ['Inconsistent Indent (Tabs vs Spaces)', 'Mixing 4 spaces and Tab', 'Use 4 spaces consistently throughout.'],
            ['Infinite while Loop', 'while x > 0 without decrement', 'Ensure condition variable is updated inside loop body.']
          ]
        },
        {
          type: 'note',
          title: 'You Are Ready for Graded Assessment',
          text: 'You have mastered Python control flow! Proceed to the Practice Notebook to experiment freely, then complete the Graded Homework (40%) and Coding Quiz (60%) to unlock Module 4.'
        }
      ]
    }
  ];

  // Upsert all 10 lessons
  for (const lessonItem of lessonsData) {
    await Lesson.findOneAndUpdate(
      { courseId: course._id, moduleId: module3._id, lessonNumber: lessonItem.lessonNumber },
      {
        $set: {
          courseId: course._id,
          moduleId: module3._id,
          title: lessonItem.title,
          slug: lessonItem.slug,
          lessonNumber: lessonItem.lessonNumber,
          order: lessonItem.order,
          estimatedMinutes: lessonItem.estimatedMinutes,
          content: lessonItem.content,
          published: true
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`[Seed] 10 Lessons for Module 3 seeded successfully.`);

  // ---------------------------------------------------------------------------
  // 4. Seed Module 3 Assessments
  // ---------------------------------------------------------------------------

  // Assessment 1: Graded Homework (40 Marks, 40% weight)
  const homeworkAssessment = {
    courseId: course._id,
    moduleId: module3._id,
    slug: 'module-3-homework',
    type: 'homework',
    title: 'Module 3 Official Graded Homework',
    description: '11 comprehensive problems spanning Section A: Conditionals (12m), Section B: Nested Conditions (4m), and Section C: Loops (24m).',
    maxPoints: 40,
    weight: 0.40,
    notebookPath: 'module-3-homework.ipynb',
    published: true,
    questions: [
      {
        id: 'hw-a1',
        title: 'Problem A1: Even or Odd',
        instructions: 'Determine whether integer number is even or odd. Set result = "even" or "odd".',
        maxPoints: 3,
        targetVariables: ['result'],
        order: 1
      },
      {
        id: 'hw-a2',
        title: 'Problem A2: Palindrome Check',
        instructions: 'Check if text is a palindrome. Set is_palindrome = True or False.',
        maxPoints: 3,
        targetVariables: ['is_palindrome'],
        order: 2
      },
      {
        id: 'hw-a3',
        title: 'Problem A3: Temperature Suggestion',
        instructions: 'Classify temperature into continuous ranges: hot (>30), perfect (20..30), chilly (10..<20), or cold (<10).',
        maxPoints: 3,
        targetVariables: ['suggestion'],
        order: 3
      },
      {
        id: 'hw-a4',
        title: 'Problem A4: Restaurant Budget',
        instructions: 'Suggest dining options based on continuous budget tiers (>50, 30..50, 15..<30, 10..<15, <10).',
        maxPoints: 3,
        targetVariables: ['recommendation'],
        order: 4
      },
      {
        id: 'hw-b1',
        title: 'Problem B1: Movie Recommendation (Nested Conditions)',
        instructions: 'Use nested if-else to recommend movies based on age (>=18 vs <18) and likes_action (True vs False).',
        maxPoints: 4,
        targetVariables: ['movie_recommendation'],
        order: 5
      },
      {
        id: 'hw-c1',
        title: 'Problem C1: Sum of Even Numbers (while loop)',
        instructions: 'Use a while loop to find the sum of all even numbers between 1 and 100. Store in even_sum.',
        maxPoints: 4,
        targetVariables: ['even_sum'],
        order: 6
      },
      {
        id: 'hw-c2',
        title: 'Problem C2: Multiplication Table (while loop)',
        instructions: 'Use a while loop to compute the multiplication table of number up to 10. Store list in table_results.',
        maxPoints: 4,
        targetVariables: ['table_results'],
        order: 7
      },
      {
        id: 'hw-c3',
        title: 'Problem C3: Repeat Car Name (while loop)',
        instructions: 'Use a while loop to repeat car_name n times. Store list in car_list.',
        maxPoints: 4,
        targetVariables: ['car_list'],
        order: 8
      },
      {
        id: 'hw-c4',
        title: 'Problem C4: Alternating Sum of Squares (for loop)',
        instructions: 'Calculate alternating sum of squares 1..n (odd squared added, even squared subtracted). Store in alternating_sum.',
        maxPoints: 4,
        targetVariables: ['alternating_sum'],
        order: 9
      },
      {
        id: 'hw-c5',
        title: 'Problem C5: String Prefixes (for loop)',
        instructions: 'Generate all prefixes of word using a for loop. Store list in prefixes.',
        maxPoints: 4,
        targetVariables: ['prefixes'],
        order: 10
      },
      {
        id: 'hw-c6',
        title: 'Problem C6: Factorial (for loop)',
        instructions: 'Calculate the factorial of positive integer n using a for loop. Store in factorial_result.',
        maxPoints: 4,
        targetVariables: ['factorial_result'],
        order: 11
      }
    ]
  };

  await Assessment.findOneAndUpdate(
    { courseId: course._id, moduleId: module3._id, type: 'homework' },
    { $set: homeworkAssessment },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // Assessment 2: Coding Quiz (20 Marks, 60% weight)
  const quizAssessment = {
    courseId: course._id,
    moduleId: module3._id,
    slug: 'module-3-coding-quiz',
    type: 'quiz',
    title: 'Module 3 Official Final Coding Quiz',
    description: 'Rigorous 6-question coding quiz testing transfer of conditional statements, nested logic, while loops, for loops, break/continue, and nested iteration.',
    maxPoints: 20,
    weight: 0.60,
    notebookPath: 'module-3-coding-quiz.ipynb',
    published: true,
    questions: [
      {
        id: 'quiz-q1',
        title: 'Question 1: Battery Status (if/elif/else)',
        instructions: 'Determine battery_status based on battery_level: "High" (>=80), "Medium" (>=30), or "Low" (<30).',
        maxPoints: 3,
        targetVariables: ['battery_status'],
        order: 1
      },
      {
        id: 'quiz-q2',
        title: 'Question 2: Course Access (Nested Conditions)',
        instructions: 'Evaluate access_result using nested if-else based on age (>=18) and has_permission (True/False).',
        maxPoints: 3,
        targetVariables: ['access_result'],
        order: 2
      },
      {
        id: 'quiz-q3',
        title: 'Question 3: Countdown Sum (while loop)',
        instructions: 'Calculate the sum of all integers from n down to 1 using a while loop. Store in countdown_sum.',
        maxPoints: 3,
        targetVariables: ['countdown_sum'],
        order: 3
      },
      {
        id: 'quiz-q4',
        title: 'Question 4: Multiples of 3 (for + range)',
        instructions: 'Calculate the sum of all multiples of 3 from 1 through n using for and range(). Store in multiple_sum.',
        maxPoints: 4,
        targetVariables: ['multiple_sum'],
        order: 4
      },
      {
        id: 'quiz-q5',
        title: 'Question 5: Break and Continue (Loop Controls)',
        instructions: 'Iterate 1..20; skip multiples of 3 with continue, stop when reaching 17 with break. Store accumulated sum in processed_sum.',
        maxPoints: 3,
        targetVariables: ['processed_sum'],
        order: 5
      },
      {
        id: 'quiz-q6',
        title: 'Question 6: Nested Loops Even Sum Pairs',
        instructions: 'Using nested loops for i and j from 1 through 4, count ordered pairs where (i + j) % 2 == 0. Store in even_sum_pairs.',
        maxPoints: 4,
        targetVariables: ['even_sum_pairs'],
        order: 6
      }
    ]
  };

  await Assessment.findOneAndUpdate(
    { courseId: course._id, moduleId: module3._id, type: 'quiz' },
    { $set: quizAssessment },
    { upsert: true, setDefaultsOnInsert: true }
  );

  console.log('[Seed] Module 3 assessments seeded successfully.');
}
