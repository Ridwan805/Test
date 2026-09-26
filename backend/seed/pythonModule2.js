import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Assessment from '../models/Assessment.js';

/**
 * Seeds Module 2 — Python Fundamentals with authoritative curriculum from Module 2.pdf
 * - 9 Lessons with static block-based teaching architecture
 * - Graded Homework (40% weight, 40 marks)
 * - Ungraded 3-input Truth Table Checkpoint
 * - Graded Coding Quiz (60% weight, 20 marks)
 * - Module 2 Practice Notebook reference
 * Uses idempotent upsert operations.
 */
export async function seedPythonModule2() {
  console.log('[Seed] Starting Python Module 2 database seeding...');

  // 1. Find or verify Course: Introduction to Python
  const course = await Course.findOne({ slug: 'intro-to-python' });
  if (!course) {
    console.warn('[Seed Warning] intro-to-python course not found. Skipping Module 2 seed.');
    return;
  }

  // 2. Upsert Module 2: Python Fundamentals
  const moduleData = {
    courseId: course._id,
    title: 'Python Fundamentals',
    moduleNumber: 2,
    order: 2,
    description: 'Master core programming fundamentals: variables, dynamic data types, type conversion, string operations, arithmetic & logical operators, and interactive input.',
    published: true
  };

  const module2 = await Module.findOneAndUpdate(
    { courseId: course._id, moduleNumber: 2 },
    { $set: moduleData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Seed] Module 2 verified: ${module2.title} (${module2._id})`);

  // Ensure Module 3 placeholder exists in Module collection so progression lock can be tested
  await Module.findOneAndUpdate(
    { courseId: course._id, moduleNumber: 3 },
    {
      $set: {
        courseId: course._id,
        title: 'Control Flow and Conditional Logic',
        moduleNumber: 3,
        order: 3,
        description: 'Advanced logical branching, multi-condition decision structures, and nested execution paths.',
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
          { title: 'Module 3: Control Flow and Conditional Logic', order: 3 }
        ]
      }
    }
  );

  // 3. Define 9 Lessons + Checkpoint + Assessments
  const lessonsData = [
    // -------------------------------------------------------------------------
    // Lesson 1: Variables and Data Types
    // -------------------------------------------------------------------------
    {
      title: 'Variables and Data Types',
      slug: 'variables-and-data-types',
      lessonNumber: 1,
      order: 1,
      estimatedMinutes: 10,
      content: [
        { type: 'heading', level: 2, text: 'Variables and Data Types' },
        { type: 'heading', level: 3, text: 'What are Variables in Python?' },
        {
          type: 'paragraph',
          text: 'In Python, variables are used to store data that can be manipulated and referenced throughout a program. They act as placeholders for values, which can be of various types, such as numbers, text, or more complex data structures. For example, the current score or progress in a video game can be stored inside a variable.'
        },
        {
          type: 'heading',
          level: 3,
          text: 'What are Data Types in Python?'
        },
        {
          type: 'paragraph',
          text: "In Python, data types define the kind of value a variable can hold. Python is dynamically typed, meaning you don't need to specify the data type explicitly when you declare a variable—it is automatically inferred based on the value assigned."
        },
        {
          type: 'note',
          title: 'The 4 Core Fundamental Data Types',
          text: 'While Python supports many data structures, all beginner programming is built on four core types: Integer, Float, String, and Boolean.'
        },
        {
          type: 'table',
          title: 'Core Data Types at a Glance',
          headers: ['Data Type', 'Description', 'Example Values'],
          rows: [
            ['Integer (int)', 'Whole numbers without any decimal or fraction part.', '25, 10, -5, 0'],
            ['Float (float)', 'Numerical values containing a decimal point.', '36.6, 99.95, -0.75, 42.0'],
            ['String (str)', 'Sequence of text characters enclosed in single or double quotes.', '"Alice", \'Dhaka\', "Python"'],
            ['Boolean (bool)', 'Logical state that can hold only one of two values: True or False.', 'True, False']
          ]
        },
        { type: 'heading', level: 3, text: 'Assigning and Printing Variables' },
        {
          type: 'paragraph',
          text: 'To store a value, use the single equals sign (=) known as the assignment operator. Let us assign an integer value of 10 to a variable called Marks:'
        },
        {
          type: 'code',
          language: 'python',
          code: 'Marks = 10\nprint(Marks)'
        },
        {
          type: 'output',
          text: '10'
        },
        {
          type: 'note',
          title: 'Why?',
          text: 'The value 10 is stored in the variable Marks. Calling print(Marks) references the variable and displays its current value.'
        },
        { type: 'heading', level: 3, text: 'Examples of the Four Core Data Types' },
        {
          type: 'code',
          language: 'python',
          code: '# Integer and Float\nage = 25\ntemperature = 36.6\n\n# Boolean\nis_sunny = True\n\n# String\nname = "Alice"\n\nprint("Age:", age)\nprint("Temperature:", temperature)\nprint("Is it sunny?", is_sunny)\nprint("Scholar Name:", name)'
        },
        {
          type: 'output',
          text: 'Age: 25\nTemperature: 36.6\nIs it sunny? True\nScholar Name: Alice'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 2: Variable Naming and Assignment
    // -------------------------------------------------------------------------
    {
      title: 'Variable Naming and Assignment',
      slug: 'variable-naming-and-assignment',
      lessonNumber: 2,
      order: 2,
      estimatedMinutes: 10,
      content: [
        { type: 'heading', level: 2, text: 'Variable Naming and Assignment Rules' },
        {
          type: 'paragraph',
          text: 'While declaring variables in Python, we must follow strict syntax rules to avoid errors. Variable names must be clear, descriptive, and adhere to Python naming standards.'
        },
        {
          type: 'list',
          items: [
            '1. Single Word Only: Variable names must be a single word without spaces. Spaces will cause a SyntaxError.',
            '2. Underscores for Separation: If you need to separate words, use an underscore (_) e.g., Country_name, city_name, my_name.',
            '3. Alphabetical Start: A variable name must start with a letter (a-z, A-Z) or an underscore. It CANNOT start with a number.',
            '4. Case Sensitivity: Python is case-sensitive. The variables name, Name, and NAME are treated as three completely different variables.',
            '5. No Special Symbols: Symbols like !, @, #, $, %, ^, & are strictly forbidden in variable names.'
          ]
        },
        {
          type: 'table',
          title: 'Correct vs. Incorrect Variable Names (Authoritative Reference)',
          headers: ['Correct Variable Name', 'Incorrect Variable Name', 'Reason for Failure'],
          rows: [
            ['name', 'na me', 'Contains a space between words'],
            ['variable1', '1variable', 'Starts with a number (digit)'],
            ['My_name', 'My-name', 'Hyphens (-) are subtraction operators'],
            ['z1ayn', 'z!yan', 'Contains exclamation mark (!)'],
            ['a', '8a', 'Starts with a number (8)'],
            ['this_variable_is_cool', 'this variable is cool', 'Contains spaces'],
            ['d1gital_T3chn0logY', 'd!gital_T$chn0logY&', 'Contains illegal symbols (!, $, &)'],
            ['Capital', 'C@pital', 'Contains the @ symbol']
          ]
        },
        { type: 'heading', level: 3, text: 'Assigning "None" (Empty Values)' },
        {
          type: 'paragraph',
          text: 'Suppose we want to declare a variable but do not want to give it any initial value yet. In Python, we can assign the special keyword None:'
        },
        {
          type: 'code',
          language: 'python',
          code: 'result = None # No value currently assigned\nprint("Current Result:", result)'
        },
        {
          type: 'output',
          text: 'Current Result: None'
        },
        { type: 'heading', level: 3, text: 'Printing Variables with Text Arguments' },
        {
          type: 'paragraph',
          text: 'In Python, the print() function can take multiple arguments separated by commas. Each comma automatically inserts a single space between the printed items:'
        },
        {
          type: 'code',
          language: 'python',
          code: "Name = 'Alif' # Declaring the variable with a string value\nprint('My name is', Name)"
        },
        {
          type: 'output',
          text: 'My name is Alif'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 3: Type Conversion
    // -------------------------------------------------------------------------
    {
      title: 'Type Conversion',
      slug: 'type-conversion',
      lessonNumber: 3,
      order: 3,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'Conversion from One Data Type to Another' },
        {
          type: 'paragraph',
          text: 'Type conversion (also known as type casting) allows us to change the data type of a value from one form to another. Python provides built-in functions: str(), int(), float(), bool(), and type().'
        },
        {
          type: 'note',
          title: 'The type() Function',
          text: 'The built-in type() function inspects and returns the exact data type of any variable or value, such as <class \'int\'> or <class \'str\'>.'
        },
        { type: 'heading', level: 3, text: '1. Converting Integer to String and Float' },
        {
          type: 'code',
          language: 'python',
          code: "x = 42\nprint('The type of data x is', type(x))\n\n# Convert to string\nstring_x = str(x)\nprint('The type of string_x is', type(string_x))\n\n# Convert to float\nfloat_x = float(x)\nprint('Value of float_x:', float_x)\nprint('The type of float_x is', type(float_x))"
        },
        {
          type: 'output',
          text: "The type of data x is <class 'int'>\nThe type of string_x is <class 'str'>\nValue of float_x: 42.0\nThe type of float_x is <class 'float'>"
        },
        { type: 'heading', level: 3, text: '2. Converting Integers to Boolean' },
        {
          type: 'paragraph',
          text: 'When converting numbers to booleans, any zero value returns False, and any non-zero number returns True:'
        },
        {
          type: 'code',
          language: 'python',
          code: "x = 0\ny = 1\n\nboolean1 = bool(x)\nboolean2 = bool(y)\n\nprint('x (0) in boolean will be:', boolean1)\nprint('y (1) in boolean will be:', boolean2)"
        },
        {
          type: 'output',
          text: 'x (0) in boolean will be: False\ny (1) in boolean will be: True'
        },
        { type: 'heading', level: 3, text: '3. Converting Strings to Integers' },
        {
          type: 'paragraph',
          text: 'To convert a string into an integer, the string must consist strictly of valid numeric digits. Attempting to convert alphabetical words will raise a ValueError:'
        },
        {
          type: 'warning',
          title: 'Syntax & Runtime Error: Converting Alphabetical Strings',
          text: "s = 'Dhaka'\nint(s) # Raises ValueError: invalid literal for int() with base 10: 'Dhaka'"
        },
        {
          type: 'paragraph',
          text: 'The correct approach requires the string to contain valid digits:'
        },
        {
          type: 'code',
          language: 'python',
          code: "num_string = '365'\nprint('Original type:', type(num_string))\n\ninteger_val = int(num_string)\nprint('Converted value:', integer_val)\nprint('Converted type:', type(integer_val))"
        },
        {
          type: 'output',
          text: "Original type: <class 'str'>\nConverted value: 365\nConverted type: <class 'int'>"
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 4: Comments in Python
    // -------------------------------------------------------------------------
    {
      title: 'Comments in Python',
      slug: 'comments-in-python',
      lessonNumber: 4,
      order: 4,
      estimatedMinutes: 8,
      content: [
        { type: 'heading', level: 2, text: 'Commenting in Python' },
        {
          type: 'paragraph',
          text: 'In Python, comments are used to explain code, making it easier to understand, collaborate on, and maintain. Comments are completely ignored by the Python interpreter during program execution.'
        },
        { type: 'heading', level: 3, text: '1. Single-Line Comments (#)' },
        {
          type: 'paragraph',
          text: 'Single-line comments begin with the hash symbol (#). Everything following # on that line is ignored by Python:'
        },
        {
          type: 'code',
          language: 'python',
          code: '# This is a single-line comment explaining the variable\nx = 10 # This assigns 10 to the variable x\nprint("x is:", x)'
        },
        {
          type: 'output',
          text: 'x is: 10'
        },
        { type: 'heading', level: 3, text: '2. Multi-Line Comments (Triple Quotes)' },
        {
          type: 'paragraph',
          text: 'Multi-line comments span multiple lines and can be created using triple single quotes (\'\'\') or triple double quotes ("""). These are also used as documentation strings (docstrings) for functions, modules, and classes:'
        },
        {
          type: 'code',
          language: 'python',
          code: '"""\nThis is a multi-line comment.\nIt spans multiple lines.\nPython reads this as an unassigned string literal and ignores it.\n"""\nprint("Program finished executing.")'
        },
        {
          type: 'output',
          text: 'Program finished executing.'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 5: String Indexing and Slicing
    // -------------------------------------------------------------------------
    {
      title: 'String Indexing and Slicing',
      slug: 'string-indexing-and-slicing',
      lessonNumber: 5,
      order: 5,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'String Indexing and Slicing' },
        {
          type: 'paragraph',
          text: 'Strings are ordered sequences of characters. Indexing allows us to access individual characters in a string. Python strings are zero-indexed, meaning the first character starts at index 0.'
        },
        {
          type: 'table',
          title: 'Positive and Negative Indexing for "hello"',
          headers: ['Positive Index (0 to len-1)', '0', '1', '2', '3', '4'],
          rows: [
            ['Character', 'h', 'e', 'l', 'l', 'o'],
            ['Negative Index (-1 from end)', '-5', '-4', '-3', '-2', '-1']
          ]
        },
        {
          type: 'note',
          title: 'Square Brackets for Indexing',
          text: 'Square brackets [] are used to access elements by index. Positive indexing starts from the beginning (0), while negative indexing starts from the end (-1).'
        },
        {
          type: 'code',
          language: 'python',
          code: "a = 'hello'\nprint('Positive index 0:', a[0])\nprint('Negative index -1 (last char):', a[-1])\nprint('Negative index -3:', a[-3])"
        },
        {
          type: 'output',
          text: 'Positive index 0: h\nNegative index -1 (last char): o\nNegative index -3: l'
        },
        { type: 'heading', level: 3, text: 'Slicing Strings [start:end:step]' },
        {
          type: 'paragraph',
          text: 'Slicing extracts a subpart of a string by specifying a range. The syntax is: string[start:end:step]'
        },
        {
          type: 'list',
          items: [
            'start: the starting index (inclusive).',
            'end: the ending index (exclusive — character at end index is NOT included).',
            'step: the interval at which characters are taken (optional, default is 1).'
          ]
        },
        {
          type: 'code',
          language: 'python',
          code: 'text = "Hello, World!"\n\nprint(text[0:5])  # Substring from index 0 to 4 (5 is excluded)\nprint(text[7:])   # Substring from index 7 to the end\nprint(text[::2])  # Every second character\nprint(text[::-1]) # Reversed string'
        },
        {
          type: 'output',
          text: 'Hello\nWorld!\nHlo ol!\n!dlroW ,olleH'
        },
        {
          type: 'warning',
          title: 'Strings are Immutable',
          text: 'Strings in Python are immutable. Once created, individual characters cannot be reassigned.\n\ntext = "Hello"\ntext[0] = "h" # Raises TypeError: \'str\' object does not support item assignment'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 6: String Methods and Formatting
    // -------------------------------------------------------------------------
    {
      title: 'String Methods and Formatting',
      slug: 'string-methods-and-formatting',
      lessonNumber: 6,
      order: 6,
      estimatedMinutes: 10,
      content: [
        { type: 'heading', level: 2, text: 'Built-in String Methods and Formatting' },
        {
          type: 'paragraph',
          text: 'Python provides essential built-in methods to inspect, convert, and format strings efficiently.'
        },
        { type: 'heading', level: 3, text: 'Core Methods: len(), upper(), lower()' },
        {
          type: 'code',
          language: 'python',
          code: "x = 'python is fun'\nprint('Length of x:', len(x))\n\nup = 'usa'\nprint('Uppercase:', up.upper())\n\nlow = 'NAME'\nprint('Lowercase:', low.lower())"
        },
        {
          type: 'output',
          text: 'Length of x: 13\nUppercase: USA\nLowercase: name'
        },
        { type: 'heading', level: 3, text: 'Modern String Formatting: f-strings' },
        {
          type: 'paragraph',
          text: 'Formatted string literals (f-strings) let you embed expressions and variables directly inside strings by prefixing the quotes with f and enclosing variables in curly braces {}:'
        },
        {
          type: 'code',
          language: 'python',
          code: 'name = "Alice"\nage = 25\nprint(f"My name is {name} and I am {age} years old.")'
        },
        {
          type: 'output',
          text: 'My name is Alice and I am 25 years old.'
        },
        { type: 'heading', level: 3, text: 'The format() Method' },
        {
          type: 'paragraph',
          text: 'Python also supports the .format() method using empty {} placeholders:'
        },
        {
          type: 'code',
          language: 'python',
          code: 'text = "My name is {} and I am {} years old.".format(name, age)\nprint(text)'
        },
        {
          type: 'output',
          text: 'My name is Alice and I am 25 years old.'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 7: User Input
    // -------------------------------------------------------------------------
    {
      title: 'User Input',
      slug: 'user-input',
      lessonNumber: 7,
      order: 7,
      estimatedMinutes: 10,
      content: [
        { type: 'heading', level: 2, text: 'Handling User Input in Python' },
        {
          type: 'paragraph',
          text: 'The built-in input() function allows a program to accept user input during runtime. When called, the program halts and waits for the user to type something on the keyboard and press Enter.'
        },
        {
          type: 'code',
          language: 'python',
          code: "name = input('Enter your name: ')\nprint('Hello', name, '!')"
        },
        {
          type: 'note',
          title: 'Critical Rule: input() ALWAYS Returns a String',
          text: 'Even if the user types a number like 25, input() returns the string "25". To perform mathematical calculations, you must explicitly convert the input using int() or float().'
        },
        { type: 'heading', level: 3, text: 'Numerical Input with Type Conversion' },
        {
          type: 'code',
          language: 'python',
          code: "age = int(input('Enter your age: '))\nprint('Your age is:', age)\nprint('The type of age is:', type(age))"
        },
        {
          type: 'output',
          text: "Enter your age: 24\nYour age is: 24\nThe type of age is: <class 'int'>"
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 8: Arithmetic Operators
    // -------------------------------------------------------------------------
    {
      title: 'Arithmetic Operators',
      slug: 'arithmetic-operators',
      lessonNumber: 8,
      order: 8,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'Arithmetic Operators' },
        {
          type: 'paragraph',
          text: 'Operators are special symbols that perform computations on operands. Python provides seven essential arithmetic operators.'
        },
        {
          type: 'table',
          title: 'The 7 Arithmetic Operators',
          headers: ['Operator', 'Name', 'Description', 'Example', 'Output'],
          rows: [
            ['+', 'Addition', 'Adds two numbers; also concatenates strings', '10 + 30', '40'],
            ['-', 'Subtraction', 'Subtracts the right operand from the left', '10 - 30', '-20'],
            ['*', 'Multiplication', 'Multiplies two numbers', '10 * 5', '50'],
            ['/', 'Division', 'Divides operands; always returns a float', '10 / 4', '2.5'],
            ['%', 'Modulus', 'Returns the remainder of a division', '10 % 4', '2'],
            ['//', 'Floor Division', 'Integer division discarding remainder', '10 // 4', '2'],
            ['**', 'Exponentiation', 'Raises base to the power of exponent', '2 ** 3', '8']
          ]
        },
        { type: 'heading', level: 3, text: 'String Concatenation with (+)' },
        {
          type: 'paragraph',
          text: 'When applied to strings, the + operator joins them together (known as string concatenation):'
        },
        {
          type: 'code',
          language: 'python',
          code: "first_name = 'Taskin'\nlast_name = 'Khan'\nfull_name = first_name + ' ' + last_name\nprint('My name is', full_name)"
        },
        {
          type: 'output',
          text: 'My name is Taskin Khan'
        },
        { type: 'heading', level: 3, text: 'Division vs. Floor Division vs. Modulus' },
        {
          type: 'code',
          language: 'python',
          code: 'a = 10\nb = 4\n\nprint("Division (/):", a / b)        # 2.5 (float)\nprint("Floor Division (//):", a // b) # 2 (integer quotient)\nprint("Modulus (%):", a % b)          # 2 (remainder)'
        },
        {
          type: 'output',
          text: 'Division (/): 2.5\nFloor Division (//): 2\nModulus (%): 2'
        },
        {
          type: 'note',
          title: 'Official Graded Homework Milestone',
          text: 'You have now completed the core arithmetic and foundational sections. Up next is the official Module 2 Homework assessment (40 marks, worth 40% of your Module 2 grade).'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 9: Relational and Logical Operators
    // -------------------------------------------------------------------------
    {
      title: 'Relational and Logical Operators',
      slug: 'relational-and-logical-operators',
      lessonNumber: 9,
      order: 9,
      estimatedMinutes: 12,
      content: [
        { type: 'heading', level: 2, text: 'Relational and Logical Operators' },
        {
          type: 'paragraph',
          text: 'Relational operators compare two values and evaluate to a Boolean result (True or False).'
        },
        {
          type: 'table',
          title: 'Relational Operators in Python',
          headers: ['Operator', 'Meaning', 'Example', 'Result'],
          rows: [
            ['==', 'Equal to', '3 == 3', 'True'],
            ['!=', 'Not equal to', '5 != 3', 'True'],
            ['<', 'Less than', '4 < 10', 'True'],
            ['>', 'Greater than', '5 > 3', 'True'],
            ['>=', 'Greater than or equal to', '36 >= -96', 'True'],
            ['<=', 'Less than or equal to', '-96 <= -10', 'True']
          ]
        },
        { type: 'heading', level: 3, text: 'Logical Operators (and, or, not)' },
        {
          type: 'paragraph',
          text: 'Logical operators combine multiple boolean expressions together.'
        },
        {
          type: 'table',
          title: 'Logical AND (All inputs must be True)',
          headers: ['Input A', 'Input B', 'Output (A and B)'],
          rows: [
            ['True', 'True', 'True'],
            ['True', 'False', 'False'],
            ['False', 'True', 'False'],
            ['False', 'False', 'False']
          ]
        },
        {
          type: 'table',
          title: 'Logical OR (At least one input must be True)',
          headers: ['Input A', 'Input B', 'Output (A or B)'],
          rows: [
            ['True', 'True', 'True'],
            ['True', 'False', 'True'],
            ['False', 'True', 'True'],
            ['False', 'False', 'False']
          ]
        },
        {
          type: 'table',
          title: 'Logical NOT (Inverts Truth Value)',
          headers: ['Input', 'Output (not input)'],
          rows: [
            ['True', 'False'],
            ['False', 'True']
          ]
        },
        { type: 'heading', level: 3, text: 'Evaluating Combined Logical Expressions' },
        {
          type: 'code',
          language: 'python',
          code: 'input_a = (9 + 4) > 3       # True (13 > 3)\ninput_b = 6 <= (12 - 6)     # True (6 <= 6)\nprint("A and B:", input_a and input_b)\n\nexp1 = 7*7 + 6 + (14/2) < (600/60) # False (62 < 10)\nexp2 = 93/3 + 63 == (23+24) * 2     # True (94 == 94)\nprint("exp1 or exp2:", exp1 or exp2)'
        },
        {
          type: 'output',
          text: 'A and B: True\nexp1 or exp2: True'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Final Checkpoint: 3-Input Truth Table Checkpoint (Ungraded)
    // -------------------------------------------------------------------------
    {
      title: 'Final Checkpoint: 3-Input Truth Tables',
      slug: 'checkpoint-truth-tables',
      lessonNumber: 10,
      order: 10,
      estimatedMinutes: 8,
      content: [
        { type: 'heading', level: 2, text: 'Final Checkpoint: 3-Input Truth Tables' },
        {
          type: 'paragraph',
          text: 'Before attempting the final Coding Quiz, let us solidify multi-condition reasoning with three boolean inputs: A, B, and C.'
        },
        {
          type: 'note',
          title: 'Checkpoint Rule: Ungraded Concept Reinforcement',
          text: 'This checkpoint is ungraded and exists to ensure you can trace compound expressions like (A and B and C) and (A or B or C).'
        },
        {
          type: 'table',
          title: '3-Input Truth Table for (A and B and C)',
          headers: ['A', 'B', 'C', 'A and B and C'],
          rows: [
            ['True', 'True', 'True', 'True'],
            ['True', 'True', 'False', 'False'],
            ['True', 'False', 'True', 'False'],
            ['True', 'False', 'False', 'False'],
            ['False', 'True', 'True', 'False'],
            ['False', 'True', 'False', 'False'],
            ['False', 'False', 'True', 'False'],
            ['False', 'False', 'False', 'False']
          ]
        },
        {
          type: 'table',
          title: '3-Input Truth Table for (A or B or C)',
          headers: ['A', 'B', 'C', 'A or B or C'],
          rows: [
            ['True', 'True', 'True', 'True'],
            ['True', 'True', 'False', 'True'],
            ['True', 'False', 'True', 'True'],
            ['True', 'False', 'False', 'True'],
            ['False', 'True', 'True', 'True'],
            ['False', 'True', 'False', 'True'],
            ['False', 'False', 'True', 'True'],
            ['False', 'False', 'False', 'False (Only when all are False)']
          ]
        },
        {
          type: 'checkpoint',
          title: 'Checkpoint Verification: Interactive Python Test',
          instructions: 'Run this test to evaluate the compound expressions across sample values:',
          code: 'A, B, C = True, False, True\nprint("A and B and C:", A and B and C)\nprint("A or B or C:", A or B or C)'
        }
      ]
    }
  ];

  // Upsert all lessons idempotently
  for (const item of lessonsData) {
    await Lesson.findOneAndUpdate(
      { courseId: course._id, slug: item.slug },
      {
        $set: {
          courseId: course._id,
          moduleId: module2._id,
          title: item.title,
          lessonNumber: item.lessonNumber,
          order: item.order,
          estimatedMinutes: item.estimatedMinutes,
          content: item.content,
          published: true
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`[Seed] Seeded ${lessonsData.length} lessons for Module 2.`);

  // 4. Upsert Module 2 Graded Assessments (Homework & Quiz)
  // Assessment 1: Homework (40 Marks, 40% weight)
  const homeworkAssessment = {
    courseId: course._id,
    moduleId: module2._id,
    slug: 'module-2-homework',
    type: 'homework',
    title: 'Module 2 Official Graded Homework',
    description: 'Solve the 5 authoritative homework problems from Module 2 covering input, rectangle calculations, temperature conversion, and digit extraction.',
    maxPoints: 40,
    weight: 0.40,
    notebookPath: 'module-2-homework.ipynb',
    published: true,
    questions: [
      {
        id: 'hw-q1',
        title: 'Problem 1: User Input Operations (Addition, Subtraction, Multiplication)',
        instructions: 'Accept two numbers and calculate addition_result, subtraction_result, and multiplication_result.',
        maxPoints: 8,
        targetVariables: ['addition_result', 'subtraction_result', 'multiplication_result'],
        order: 1
      },
      {
        id: 'hw-q2',
        title: 'Problem 2: Rectangle Area and Perimeter',
        instructions: 'Calculate area = length * breadth and perimeter = 2 * (length + breadth).',
        maxPoints: 8,
        targetVariables: ['area', 'perimeter'],
        order: 2
      },
      {
        id: 'hw-q3',
        title: 'Problem 3: Temperature Conversion (Celsius ↔ Fahrenheit)',
        instructions: 'Convert celsius_input to fahrenheit_result, and fahrenheit_input to celsius_result.',
        maxPoints: 8,
        targetVariables: ['fahrenheit_result', 'celsius_result'],
        order: 3
      },
      {
        id: 'hw-q4',
        title: 'Problem 4: Leftmost Digit Extraction',
        instructions: 'Extract leftmost_digit from num_4digit using floor division (//).',
        maxPoints: 8,
        targetVariables: ['leftmost_digit'],
        order: 4
      },
      {
        id: 'hw-q5',
        title: 'Problem 5: Rightmost Digit Extraction',
        instructions: 'Extract rightmost_digit from num_input using modulus (%) or floor operations.',
        maxPoints: 8,
        targetVariables: ['rightmost_digit'],
        order: 5
      }
    ]
  };

  await Assessment.findOneAndUpdate(
    { courseId: course._id, moduleId: module2._id, type: 'homework' },
    { $set: homeworkAssessment },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // Assessment 2: Coding Quiz (20 Marks, 60% weight)
  const quizAssessment = {
    courseId: course._id,
    moduleId: module2._id,
    slug: 'module-2-coding-quiz',
    type: 'quiz',
    title: 'Module 2 Official Final Coding Quiz',
    description: 'Comprehensive 6-question coding quiz integrating variables, types, arithmetic, strings, relational and logical operators.',
    maxPoints: 20,
    weight: 0.60,
    notebookPath: 'module-2-coding-quiz.ipynb',
    published: true,
    questions: [
      {
        id: 'quiz-q1',
        title: 'Question 1: Input and Type Conversion',
        instructions: 'Convert price_text to float price, and quantity_text to integer quantity.',
        maxPoints: 3,
        targetVariables: ['price', 'quantity'],
        order: 1
      },
      {
        id: 'quiz-q2',
        title: 'Question 2: Arithmetic Operators',
        instructions: 'Calculate total_cost, half_cost, whole_units_per_pack, and remaining_units.',
        maxPoints: 4,
        targetVariables: ['total_cost', 'half_cost', 'whole_units_per_pack', 'remaining_units'],
        order: 2
      },
      {
        id: 'quiz-q3',
        title: 'Question 3: Strings and Formatting',
        instructions: 'Create full_name with one space, full_name_upper using .upper(), and name_length using len().',
        maxPoints: 4,
        targetVariables: ['full_name', 'full_name_upper', 'name_length'],
        order: 3
      },
      {
        id: 'quiz-q4',
        title: 'Question 4: String Indexing and Slicing',
        instructions: 'Extract first_char, last_char, first_three, and reversed_word from word.',
        maxPoints: 3,
        targetVariables: ['first_char', 'last_char', 'first_three', 'reversed_word'],
        order: 4
      },
      {
        id: 'quiz-q5',
        title: 'Question 5: Relational Operators',
        instructions: 'Evaluate same_value (==), quantity_larger (>), and different_value (!=).',
        maxPoints: 3,
        targetVariables: ['same_value', 'quantity_larger', 'different_value'],
        order: 5
      },
      {
        id: 'quiz-q6',
        title: 'Question 6: Logical Operators',
        instructions: 'Evaluate logic_and (and), logic_or (or), and logic_not (not).',
        maxPoints: 3,
        targetVariables: ['logic_and', 'logic_or', 'logic_not'],
        order: 6
      }
    ]
  };

  await Assessment.findOneAndUpdate(
    { courseId: course._id, moduleId: module2._id, type: 'quiz' },
    { $set: quizAssessment },
    { upsert: true, setDefaultsOnInsert: true }
  );

  console.log('[Seed] Module 2 assessments seeded successfully.');
}
