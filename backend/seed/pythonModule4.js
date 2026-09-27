import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Assessment from '../models/Assessment.js';

/**
 * Seeds Module 4 — Data Structures with authoritative curriculum from Module 4.pdf
 * - 9 Lessons with structured static content blocks and visual aids
 * - Graded Homework (40 marks, 40% weight: 8 selected source problems)
 * - Graded Coding Quiz (20 marks, 60% weight: 6 comprehensive questions)
 * - Module 4 Practice Notebook reference
 * - Module 5 placeholder with progression gate
 * Uses idempotent upsert operations.
 */
export async function seedPythonModule4() {
  console.log('[Seed] Starting Python Module 4 database seeding...');

  // 1. Find or verify Course: Introduction to Python
  const course = await Course.findOne({ slug: 'intro-to-python' });
  if (!course) {
    console.warn('[Seed Warning] intro-to-python course not found. Skipping Module 4 seed.');
    return;
  }

  // 2. Upsert Module 4: Data Structures
  const moduleData = {
    courseId: course._id,
    title: 'Data Structures',
    moduleNumber: 4,
    order: 4,
    description: 'Master Python data organization: lists, indexing, slicing, mutability, list methods, list comprehension, nested lists, tuples, and dictionary key-value mappings.',
    published: true
  };

  const module4 = await Module.findOneAndUpdate(
    { courseId: course._id, moduleNumber: 4 },
    { $set: moduleData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Seed] Module 4 verified: ${module4.title} (${module4._id})`);

  // Ensure Module 5 placeholder exists for progression gate testing
  await Module.findOneAndUpdate(
    { courseId: course._id, moduleNumber: 5 },
    {
      $set: {
        courseId: course._id,
        title: 'Functions and Modular Programming',
        moduleNumber: 5,
        order: 5,
        description: 'Advanced Python engineering: custom functions, parameters, return values, scope, recursion, and modular code architecture.',
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
          { title: 'Module 4: Data Structures', order: 4 },
          { title: 'Module 5: Functions and Modular Programming', order: 5 }
        ]
      }
    }
  );

  // 3. Define the 9 Lessons from authoritative Module 4.pdf
  const lessonsData = [
    // -------------------------------------------------------------------------
    // Lesson 1: Introduction to Data Structures and Lists
    // -------------------------------------------------------------------------
    {
      title: 'Introduction to Data Structures and Lists',
      slug: 'intro-to-data-structures-and-lists',
      lessonNumber: 1,
      order: 1,
      estimatedMinutes: 10,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'What is a Data Structure?'
        },
        {
          type: 'paragraph',
          text: 'A data structure is a specialized way of organizing, managing, and storing data so that it can be accessed, modified, and processed efficiently. Different problems demand different data structures: some require ordered collections, some need fast key lookups, and others demand fixed immutable sequences.'
        },
        {
          type: 'paragraph',
          text: 'In Python, mastering data structures is the cornerstone of writing clean, scalable, and memory-efficient code. In this module, we focus on three core structures: Lists, Tuples, and Dictionaries.'
        },
        {
          type: 'note',
          title: 'KEY CONCEPT: Three Core Data Structures',
          text: 'Lists: Ordered, mutable collections defined by square brackets []. Tuples: Ordered, immutable sequences defined by parentheses (). Dictionaries: Unordered or insertion-ordered key-value mappings defined by curly braces {}.'
        },
        {
          type: 'heading',
          level: 2,
          text: 'Introduction to Python Lists'
        },
        {
          type: 'paragraph',
          text: 'A list allows you to store multiple items in a single variable. A list can hold items of any data type—integers, floats, strings, booleans, and even other lists—and can be changed after creation (mutable).'
        },
        {
          type: 'code',
          language: 'python',
          code: '# Creating various types of lists\nlist1 = []                                    # Empty list\nlist2 = [1, 2, 3, 6, 4, 5, 9]                 # List of integers\nlist3 = [\'hello\', \'world\', \'full\', \'comma\']   # List of strings\nlist4 = [1, "apple", 3.14, True]              # List with mixed data types\n\nprint("Integer list:", list2)\nprint("String list:", list3)\nprint("Mixed list:", list4)'
        },
        {
          type: 'output',
          text: 'Integer list: [1, 2, 3, 6, 4, 5, 9]\nString list: [\'hello\', \'world\', \'full\', \'comma\']\nMixed list: [1, \'apple\', 3.14, True]'
        },
        {
          type: 'checkpoint',
          title: 'PRACTICE TASK 4.1: Favourite Car Brands',
          instructions: 'Create a list containing your favourite car brands (e.g. ["BMW", "Tesla", "Audi", "Porsche"]) and print the entire list. (Ungraded Concept Check)',
          code: 'cars = ["Tesla", "BMW", "Porsche", "Audi"]\nprint(cars)',
          language: 'python'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 2: List Indexing, Slicing, Concatenation and Mutability
    // -------------------------------------------------------------------------
    {
      title: 'List Indexing, Slicing, Concatenation and Mutability',
      slug: 'list-indexing-slicing-mutability',
      lessonNumber: 2,
      order: 2,
      estimatedMinutes: 12,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Accessing Elements: Positive and Negative Indexing'
        },
        {
          type: 'paragraph',
          text: 'Python lists are zero-indexed: the first item is at index 0, the second at index 1, and so on. Negative indices count backward from the end: index -1 refers to the last element, -2 to the second to last.'
        },
        {
          type: 'code',
          language: 'python',
          code: 'fruits = ["apple", "banana", "cherry", "date"]\n\n# Positive indexing\nprint("First fruit:", fruits[0])\nprint("Second fruit:", fruits[1])\n\n# Negative indexing\nprint("Last fruit:", fruits[-1])\nprint("Second to last:", fruits[-2])'
        },
        {
          type: 'output',
          text: 'First fruit: apple\nSecond fruit: banana\nLast fruit: date\nSecond to last: cherry'
        },
        {
          type: 'heading',
          level: 2,
          text: 'List Slicing and Step Reversal'
        },
        {
          type: 'paragraph',
          text: 'Slicing extracts a sublist using the syntax list[start:stop:step]. The start index is inclusive, while the stop index is exclusive. Omitting start begins at 0; omitting stop goes to the end. A step of -1 cleanly reverses the list.'
        },
        {
          type: 'code',
          language: 'python',
          code: 'fruits = ["apple", "banana", "cherry", "date"]\n\nprint("fruits[1:3]:", fruits[1:3])   # Index 1 and 2\nprint("fruits[:2]:", fruits[:2])     # Up to index 2 (exclusive)\nprint("Reversed fruits:", fruits[::-1]) # Reverse list with step -1'
        },
        {
          type: 'output',
          text: "fruits[1:3]: ['banana', 'cherry']\nfruits[:2]: ['apple', 'banana']\nReversed fruits: ['date', 'cherry', 'banana', 'apple']"
        },
        {
          type: 'heading',
          level: 2,
          text: 'List Concatenation and In-Place Mutability'
        },
        {
          type: 'paragraph',
          text: 'You can concatenate two lists into a brand new combined list using the + operator. Furthermore, because lists are mutable, you can assign new values directly to any valid index.'
        },
        {
          type: 'code',
          language: 'python',
          code: 'l1 = [\'morocco\', \'iran\', \'iraq\', \'somalia\']\nl2 = [\'canada\', \'jamaica\', \'Kuiet\']\n\n# Concatenation\nl3 = l1 + l2\nprint("Concatenated list:", l3)\n\n# Mutability: updating index 4 in-place\nl3[4] = \'Korea\'\nprint("Updated list:", l3)'
        },
        {
          type: 'output',
          text: "Concatenated list: ['morocco', 'iran', 'iraq', 'somalia', 'canada', 'jamaica', 'Kuiet']\nUpdated list: ['morocco', 'iran', 'iraq', 'somalia', 'Korea', 'jamaica', 'Kuiet']"
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 3: List Methods
    // -------------------------------------------------------------------------
    {
      title: 'List Methods',
      slug: 'list-methods',
      lessonNumber: 3,
      order: 3,
      estimatedMinutes: 14,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Built-in List Methods'
        },
        {
          type: 'paragraph',
          text: 'Python provides several essential built-in methods to dynamically manipulate lists: append(), remove(), extend(), pop(), and insert().'
        },
        {
          type: 'heading',
          level: 3,
          text: '1. append(item) — Add a single item at the end'
        },
        {
          type: 'code',
          language: 'python',
          code: 'l1 = [\'morocco\', \'iran\', \'iraq\', \'somalia\', \'canada\', \'jamaica\', \'Kuiet\']\nl1.append(\'bolivia\')\nprint(l1)'
        },
        {
          type: 'output',
          text: "['morocco', 'iran', 'iraq', 'somalia', 'canada', 'jamaica', 'Kuiet', 'bolivia']"
        },
        {
          type: 'heading',
          level: 3,
          text: '2. remove(item) — Remove the first matching element'
        },
        {
          type: 'code',
          language: 'python',
          code: 'l1 = [\'morocco\', \'iran\', \'iraq\', \'somalia\', \'canada\', \'jamaica\', \'Kuiet\']\nl1.remove(\'morocco\')\nprint(l1)'
        },
        {
          type: 'output',
          text: "['iran', 'iraq', 'somalia', 'canada', 'jamaica', 'Kuiet']"
        },
        {
          type: 'heading',
          level: 3,
          text: '3. extend(iterable) — Add multiple elements to the end'
        },
        {
          type: 'paragraph',
          text: 'extend() unpacks an iterable and appends each element individually to the list.'
        },
        {
          type: 'note',
          title: 'SOURCE ACCURACY NOTICE',
          text: 'In the original PDF, the text described extend() but the accompanying code typed .append([99,100]) while expecting a flattened list. For executable precision, the correct method to unpack and add multiple values is .extend([99, 100]).'
        },
        {
          type: 'code',
          language: 'python',
          code: 'num = [1, 2, 32, 6, 5]\nnum.extend([99, 100])\nprint(num)'
        },
        {
          type: 'output',
          text: '[1, 2, 32, 6, 5, 99, 100]'
        },
        {
          type: 'heading',
          level: 3,
          text: '4. pop([index]) — Remove and return item by index (or last)'
        },
        {
          type: 'code',
          language: 'python',
          code: 'l1 = [\'morocco\', \'iran\', \'iraq\', \'somalia\', \'canada\', \'jamaica\', \'Kuiet\']\nremoved_item = l1.pop(3)  # Removes index 3 ("somalia")\nprint("Removed:", removed_item)\nprint("Remaining:", l1)'
        },
        {
          type: 'output',
          text: "Removed: somalia\nRemaining: ['morocco', 'iran', 'iraq', 'canada', 'jamaica', 'Kuiet']"
        },
        {
          type: 'heading',
          level: 3,
          text: '5. insert(index, item) — Insert at a specific index'
        },
        {
          type: 'code',
          language: 'python',
          code: 'l1 = [\'morocco\', \'iran\', \'iraq\', \'canada\', \'jamaica\', \'Kuiet\']\nl1.insert(3, \'lebanon\')  # Inserts at index 3, shifting others right\nprint(l1)'
        },
        {
          type: 'output',
          text: "['morocco', 'iran', 'iraq', 'lebanon', 'canada', 'jamaica', 'Kuiet']"
        },
        {
          type: 'heading',
          level: 2,
          text: 'Algorithmic Example 4.2: Extending Without Functions'
        },
        {
          type: 'paragraph',
          text: 'Suppose we have [10, 20, 30, 40] and want to extend it up to 150 by steps of 10 without using append() or extend(). We can use concatenation += with single-element lists [i].'
        },
        {
          type: 'code',
          language: 'python',
          code: 'l1 = [10, 20, 30, 40]\nfor i in range(50, 151, 10):\n    l1 += [i]\nprint(l1)'
        },
        {
          type: 'output',
          text: '[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]'
        },
        {
          type: 'heading',
          level: 2,
          text: 'Algorithmic Example 4.3: In-Place Duplicate Removal'
        },
        {
          type: 'paragraph',
          text: 'We can iterate through a list with an outer loop and an inner while loop to compare elements and remove duplicate occurrences.'
        },
        {
          type: 'code',
          language: 'python',
          code: 'l1 = [10, 56, 36, 87, 66, 99, 21, 96, 56, 67, 98, 66, 21, 87, 10, 98]\n\ni = 0\nwhile i < len(l1):\n    j = i + 1\n    while j < len(l1):\n        if l1[i] == l1[j]:\n            l1.pop(j)\n        else:\n            j += 1\n    i += 1\n\nprint("Deduplicated list:", l1)'
        },
        {
          type: 'output',
          text: 'Deduplicated list: [10, 56, 36, 87, 66, 99, 21, 96, 67, 98]'
        },
        {
          type: 'checkpoint',
          title: 'UNGRADED PRACTICE TASKS 4.3 – 4.5',
          instructions: 'Practice list modification (Ungraded):\n- Task 4.3: Add "kiwi" to ["apple", "orange"]\n- Task 4.4: Remove the second element from [10, 20, 30, 40]\n- Task 4.5: Insert "Noah" at index 3 in ["Alex", "John", "Nolan", "Candler", "Joey"]',
          code: '# Task 4.3\nfruits = ["apple", "orange"]\nfruits.append("kiwi")\n\n# Task 4.4\nnums = [10, 20, 30, 40]\nnums.pop(1)\n\n# Task 4.5\nnames = ["Alex", "John", "Nolan", "Candler", "Joey"]\nnames.insert(3, "Noah")\n\nprint(fruits)\nprint(nums)\nprint(names)',
          language: 'python'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 4: List Comprehension
    // -------------------------------------------------------------------------
    {
      title: 'List Comprehension',
      slug: 'list-comprehension',
      lessonNumber: 4,
      order: 4,
      estimatedMinutes: 12,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'What is List Comprehension?'
        },
        {
          type: 'paragraph',
          text: 'List comprehension offers a shorter, more concise syntax when you want to create a new list based on the values of an existing iterable. Instead of initializing an empty list, looping, and appending, list comprehension condenses the logic into a single readable line.'
        },
        {
          type: 'note',
          title: 'SYNTAX FORMULA',
          text: '[expression for item in iterable if condition]'
        },
        {
          type: 'heading',
          level: 3,
          text: 'Comparing Standard Loops vs. List Comprehension'
        },
        {
          type: 'code',
          language: 'python',
          code: '# Traditional multi-line approach\neven_nums_trad = []\nfor i in range(1, 21):\n    if i % 2 == 0:\n        even_nums_trad.append(i)\n\n# Modern list comprehension approach\neven_nums_comp = [i for i in range(1, 21) if i % 2 == 0]\n\nprint("Traditional:", even_nums_trad)\nprint("Comprehension:", even_nums_comp)'
        },
        {
          type: 'output',
          text: 'Traditional: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]\nComprehension: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]'
        },
        {
          type: 'heading',
          level: 2,
          text: 'Mathematical Transformations with List Comprehension'
        },
        {
          type: 'paragraph',
          text: 'You can apply mathematical operators directly within the expression portion, such as squaring numbers from 1 to 10:'
        },
        {
          type: 'code',
          language: 'python',
          code: 'squares = [x**2 for x in range(1, 11)]\nprint("Squares 1 to 10:", squares)'
        },
        {
          type: 'output',
          text: 'Squares 1 to 10: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]'
        },
        {
          type: 'checkpoint',
          title: 'PRACTICE TASK 4.6: Odd Numbers with List Comprehension',
          instructions: 'Write a Python program using list comprehension to produce a list containing all odd numbers from 1 to 30. (Ungraded Concept Check)',
          code: 'odd_list = [x for x in range(1, 31) if x % 2 != 0]\nprint(odd_list)',
          language: 'python'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 5: Nested Lists and List Processing
    // -------------------------------------------------------------------------
    {
      title: 'Nested Lists and List Processing',
      slug: 'nested-lists-and-processing',
      lessonNumber: 5,
      order: 5,
      estimatedMinutes: 14,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Understanding Nested Lists (2D Collections)'
        },
        {
          type: 'paragraph',
          text: 'A list can store any data type, including other lists. When a list contains sublists, it is called a nested list (commonly used to represent 2D matrices, tables, or grids).'
        },
        {
          type: 'code',
          language: 'python',
          code: 'matrix = [[1, 2, 6, 3], [4, 5, 6, 7]]\nprint("Full 2D list:", matrix)\nprint("First row:", matrix[0])\nprint("Item at row 1, col 2:", matrix[1][2])'
        },
        {
          type: 'output',
          text: 'Full 2D list: [[1, 2, 6, 3], [4, 5, 6, 7]]\nFirst row: [1, 2, 6, 3]\nItem at row 1, col 2: 6'
        },
        {
          type: 'heading',
          level: 2,
          text: 'Flattening Nested Lists'
        },
        {
          type: 'paragraph',
          text: 'Flattening means taking a 2D nested list and extracting all inner elements into a single flat 1D list. We can accomplish this with nested for loops.'
        },
        {
          type: 'code',
          language: 'python',
          code: 'nested = [[1, 2, 3, 4], [5, 6, 7, 8]]\nflat = []\n\nfor sublist in nested:\n    for item in sublist:\n        flat.append(item)\n\nprint("Flattened list:", flat)'
        },
        {
          type: 'output',
          text: 'Flattened list: [1, 2, 3, 4, 5, 6, 7, 8]'
        },
        {
          type: 'checkpoint',
          title: 'PRACTICE TASK 4.11: String Concatenation',
          instructions: 'Write a program to concatenate all elements in [\'Python\', \'is\', \'awesome\'] into a single string. (Ungraded Concept Check)',
          code: 'words = [\'Python\', \'is\', \'awesome\']\nsentence = " ".join(words)\nprint("Result:", sentence)',
          language: 'python'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 6: Tuples
    // -------------------------------------------------------------------------
    {
      title: 'Tuples',
      slug: 'tuples',
      lessonNumber: 6,
      order: 6,
      estimatedMinutes: 12,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'What is a Tuple?'
        },
        {
          type: 'paragraph',
          text: 'A tuple is an ordered collection of elements enclosed in parentheses (). The primary difference between a list and a tuple is that tuples are immutable: once created, elements cannot be modified, added, or removed.'
        },
        {
          type: 'code',
          language: 'python',
          code: 't1 = (1, 2, 3, 4, 5, 6, 7)\nt2 = (\'R\', \'S\', \'T\', \'U\')\nt3 = (1, "apple", 3.14, True)\nt4 = (\'a\', [6, 5, 8, 9, 6], (\'fname\', \'mname\', \'lname\'))  # Nested structures\n\nprint("t1:", t1)\nprint("t4 with mixed nesting:", t4)'
        },
        {
          type: 'output',
          text: "t1: (1, 2, 3, 4, 5, 6, 7)\nt4 with mixed nesting: ('a', [6, 5, 8, 9, 6], ('fname', 'mname', 'lname'))"
        },
        {
          type: 'heading',
          level: 2,
          text: 'Converting Between Tuples and Lists'
        },
        {
          type: 'paragraph',
          text: 'Because tuples are immutable, when you need to update a tuple, standard Python practice is to convert the tuple into a list using list(), perform the modifications, and convert it back into a tuple using tuple().'
        },
        {
          type: 'code',
          language: 'python',
          code: 't1 = (5, 6, 7, 8, 9, 10)\n\n# Convert to list\ntemp_list = list(t1)\ntemp_list.append(11)\n\n# Convert back to tuple\nt1 = tuple(temp_list)\nprint("Updated tuple:", t1)'
        },
        {
          type: 'output',
          text: 'Updated tuple: (5, 6, 7, 8, 9, 10, 11)'
        },
        {
          type: 'checkpoint',
          title: 'PRACTICE TASKS 4.13A & 4.14: Tuple Operations',
          instructions: 'Practice tuple concatenation and slicing (Ungraded):\n- Task 4.13A: Concatenate (1, 2, 3) and (4, 5, 6)\n- Task 4.14: Extract slice [2:5] from (1, 2, 3, 4, 5, 6, 7)',
          code: '# Task 4.13A: Concatenation\nt1 = (1, 2, 3)\nt2 = (4, 5, 6)\nt_comb = t1 + t2\nprint("Combined tuple:", t_comb)\n\n# Task 4.14: Slicing\nt = (1, 2, 3, 4, 5, 6, 7)\nslice_result = t[2:5]\nprint("Sliced tuple:", slice_result)',
          language: 'python'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 7: Introduction to Dictionaries
    // -------------------------------------------------------------------------
    {
      title: 'Introduction to Dictionaries',
      slug: 'intro-to-dictionaries',
      lessonNumber: 7,
      order: 7,
      estimatedMinutes: 12,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'What is a Dictionary?'
        },
        {
          type: 'paragraph',
          text: 'A dictionary is a built-in Python data structure that stores data in key-value pairs. Dictionaries are enclosed in curly braces {}, where each key is separated from its value by a colon :. Keys must be unique and immutable, while values can be of any data type.'
        },
        {
          type: 'note',
          title: 'DICTIONARY SYNTAX',
          text: 'dictionary_name = { key1: value1, key2: value2, key3: value3 }'
        },
        {
          type: 'heading',
          level: 2,
          text: 'Accessing Values: Bracket Notation vs. get()'
        },
        {
          type: 'paragraph',
          text: 'You can retrieve a value using square bracket notation dict[key] or by calling the safe get(key) method. If a key does not exist, bracket notation raises a KeyError, whereas get() gracefully returns None (or a custom fallback default).'
        },
        {
          type: 'code',
          language: 'python',
          code: 'phonebook = {\'Alice\': \'123-456\', \'Bob\': \'987-654\', \'Jack\': \'123-654\'}\nages = {\'Alice\': 22, \'Bob\': 45, \'Jack\': 36}\n\n# Direct bracket access\nprint("Alice phone:", phonebook[\'Alice\'])\n\n# Safe get() method access\nprint("Bob age:", ages.get(\'Bob\'))\nprint("Unknown person:", ages.get(\'Charlie\', "Not Found"))'
        },
        {
          type: 'output',
          text: 'Alice phone: 123-456\nBob age: 45\nUnknown person: Not Found'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 8: Dictionary Methods and Updates
    // -------------------------------------------------------------------------
    {
      title: 'Dictionary Methods and Updates',
      slug: 'dictionary-methods-and-updates',
      lessonNumber: 8,
      order: 8,
      estimatedMinutes: 15,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Dictionary Inspection Methods: keys(), values(), items()'
        },
        {
          type: 'paragraph',
          text: 'Python provides view methods to inspect the components of a dictionary: keys() returns all keys, values() returns all values, and items() returns key-value pairs as tuples.'
        },
        {
          type: 'code',
          language: 'python',
          code: 'menu = {1: \'Coffee\', 2: \'Tea\', 3: \'Black Coffee\', 4: \'Green Tea\', 5: \'Oreo Shake\'}\n\nprint("Keys:", list(menu.keys()))\nprint("Values:", list(menu.values()))\nprint("Items:", list(menu.items()))'
        },
        {
          type: 'output',
          text: "Keys: [1, 2, 3, 4, 5]\nValues: ['Coffee', 'Tea', 'Black Coffee', 'Green Tea', 'Oreo Shake']\nItems: [(1, 'Coffee'), (2, 'Tea'), (3, 'Black Coffee'), (4, 'Green Tea'), (5, 'Oreo Shake')]"
        },
        {
          type: 'heading',
          level: 2,
          text: 'Modifying, Updating, and Removing Dictionary Items'
        },
        {
          type: 'paragraph',
          text: 'You can update values in-place by assigning to an existing key, add new pairs with update(), remove a specific key with pop(key), or empty the dictionary with clear().'
        },
        {
          type: 'code',
          language: 'python',
          code: 'colors = {\n    \'red\': \'#FF0000\',\n    \'green\': \'#00FF00\',\n    \'blue\': \'#0000FF\',\n    \'white\': \'#800080\'  # Incorrect hex in source\n}\n\n# In-place correction\ncolors[\'white\'] = \'#FFFFFF\'\nprint("Corrected white:", colors[\'white\'])\n\n# Using update() to add multiple pairs\ncolors.update({\'yellow\': \'#FFFF00\', \'black\': \'#000000\'})\nprint("Updated keys count:", len(colors))'
        },
        {
          type: 'output',
          text: 'Corrected white: #FFFFFF\nUpdated keys count: 6'
        },
        {
          type: 'heading',
          level: 2,
          text: 'Nested Values in Dictionaries'
        },
        {
          type: 'paragraph',
          text: 'Dictionary values can themselves be lists or other nested objects. We can mutate inner values using standard list methods.'
        },
        {
          type: 'code',
          language: 'python',
          code: 'student = {\n    \'Name\': \'Ben\',\n    \'age\': 23,\n    \'Occupation\': \'student\',\n    \'email\': [\'ben@yahoo.com\']\n}\n\n# Append another email to the list value\nstudent[\'email\'] += [\'ben214@gmail.com\']\nprint("Student emails:", student[\'email\'])'
        },
        {
          type: 'output',
          text: "Student emails: ['ben@yahoo.com', 'ben214@gmail.com']"
        },
        {
          type: 'checkpoint',
          title: 'UNGRADED PRACTICE TASKS 4.13B & 4.15',
          instructions: 'Practice dictionary iteration and merging (Ungraded):\n- Task 4.13B: Filter names with marks > 70 from {\'Alex\':87, \'Ben\':89, \'Ross\':78, \'Ted\':66, \'Phil\':68, \'Cam\':90}\n- Task 4.15: Merge d1 = {\'Harry\':15, \'Draco\':8, \'Nevil\':19} and d2 = {\'Ginie\':18, \'Luna\':14}',
          code: '# Task 4.13B\nmarks = {\'Alex\': 87, \'Ben\': 89, \'Ross\': 78, \'Ted\': 66, \'Phil\': 68, \'Cam\': 90}\nhonors = [name for name, score in marks.items() if score > 70]\nprint("Students with marks > 70:", honors)\n\n# Task 4.15\nd1 = {\'Harry\': 15, \'Draco\': 8, \'Nevil\': 19}\nd2 = {\'Ginie\': 18, \'Luna\': 14}\nmerged = d1.copy()\nmerged.update(d2)\nprint("Merged dictionary:", merged)',
          language: 'python'
        }
      ]
    },

    // -------------------------------------------------------------------------
    // Lesson 9: Applied Data Structure Problems
    // -------------------------------------------------------------------------
    {
      title: 'Applied Data Structure Problems',
      slug: 'applied-data-structure-problems',
      lessonNumber: 9,
      order: 9,
      estimatedMinutes: 12,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Choosing the Right Data Structure'
        },
        {
          type: 'paragraph',
          text: 'Writing efficient Python code requires choosing the appropriate data structure for each scenario. Here is an architectural comparison of the core data structures:'
        },
        {
          type: 'cards',
          title: 'Data Structure Comparison Matrix',
          cards: [
            {
              title: 'List []',
              tag: 'Ordered & Mutable',
              description: 'Use when you need an ordered sequence of elements that will grow, shrink, or be modified throughout execution (e.g. tracking items, collecting results).'
            },
            {
              title: 'Tuple ()',
              tag: 'Ordered & Immutable',
              description: 'Use for fixed collections of values that should never be altered (e.g. geographic coordinates, RGB color codes, database records).'
            },
            {
              title: 'Dictionary {}',
              tag: 'Key-Value Mapping',
              description: 'Use when fast lookups by identifier are needed, or when structuring associative entities (e.g. phonebooks, student grades, configuration settings).'
            }
          ]
        },
        {
          type: 'heading',
          level: 2,
          text: 'Data Structure Selection Scenarios'
        },
        {
          type: 'paragraph',
          text: '1. "When would I use a list?" — Storing shopping cart items, queueing tasks, or collecting dynamic user inputs.'
        },
        {
          type: 'paragraph',
          text: '2. "When would I use a tuple?" — Representing fixed dimensions (width, height), latitude/longitude coordinates, or preventing accidental modifications.'
        },
        {
          type: 'paragraph',
          text: '3. "When would I use a dictionary?" — Storing inventory prices by item name, tracking student scores by name, or counting word frequencies.'
        },
        {
          type: 'note',
          title: 'NEXT STEP: GRADED ASSESSMENTS',
          text: 'You have mastered the core curriculum of Module 4! Complete the Module 4 Graded Homework (40 Marks, 40% weight) and the Final Coding Quiz (20 Marks, 60% weight). Earning a combined Module Grade of at least 80% unlocks Module 5.'
        }
      ]
    }
  ];

  // Upsert all 9 lessons
  for (const lesson of lessonsData) {
    await Lesson.findOneAndUpdate(
      { courseId: course._id, moduleId: module4._id, slug: lesson.slug },
      {
        $set: {
          courseId: course._id,
          moduleId: module4._id,
          title: lesson.title,
          slug: lesson.slug,
          lessonNumber: lesson.lessonNumber,
          order: lesson.order,
          estimatedMinutes: lesson.estimatedMinutes,
          content: lesson.content,
          published: true
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log('[Seed] 9 Lessons for Module 4 seeded successfully.');

  // ---------------------------------------------------------------------------
  // 4. Seed Module 4 Assessments
  // ---------------------------------------------------------------------------

  // Assessment 1: Graded Homework (40 Marks, 40% weight)
  const homeworkAssessment = {
    courseId: course._id,
    moduleId: module4._id,
    slug: 'module-4-homework',
    type: 'homework',
    title: 'Module 4 Official Graded Homework',
    description: '8 graded problem tasks covering duplicate removal, filtering with list comprehension, nested list flattening, list rotation, frequency counting, second largest discovery, and dictionary mapping.',
    maxPoints: 40,
    weight: 0.40,
    notebookPath: 'module-4-homework.ipynb',
    published: true,
    questions: [
      {
        id: 'hw-h1',
        title: 'H1 (Task 4.2): Deduplicate List Without Helper Functions',
        instructions: 'Given a list numbers, remove all duplicate values without using direct duplicate-removal helper methods. Store the deduplicated list in result_list.',
        maxPoints: 5,
        targetVariables: ['result_list'],
        order: 1
      },
      {
        id: 'hw-h2',
        title: 'H2 (Task 4.7): Filter Numbers Greater Than 10',
        instructions: 'Given an integer list input_numbers, produce a list of all elements greater than 10. Store in greater_than_10.',
        maxPoints: 4,
        targetVariables: ['greater_than_10'],
        order: 2
      },
      {
        id: 'hw-h3',
        title: 'H3 (Task 4.8): Flatten Nested List with List Comprehension',
        instructions: 'Flatten the 2D nested list nested_list into a single 1D list using list comprehension. Store in flat_list.',
        maxPoints: 5,
        targetVariables: ['flat_list'],
        order: 3
      },
      {
        id: 'hw-h4',
        title: 'H4 (Task 4.9): Shift List Elements Right by N Positions',
        instructions: 'Given a list original_list and an integer n, shift all elements to the right by n positions. Store in rotated_list.',
        maxPoints: 6,
        targetVariables: ['rotated_list'],
        order: 4
      },
      {
        id: 'hw-h5',
        title: 'H5 (Task 4.10): Count Frequency of List Elements',
        instructions: 'Count the frequency of each element in data_list. Return a dictionary frequency_counts mapping each element to its count.',
        maxPoints: 5,
        targetVariables: ['frequency_counts'],
        order: 5
      },
      {
        id: 'hw-h6',
        title: 'H6 (Task 4.12): Find Second Largest Number',
        instructions: 'Find the second largest number in num_list. Store the second largest value in second_largest.',
        maxPoints: 5,
        targetVariables: ['second_largest'],
        order: 6
      },
      {
        id: 'hw-h7',
        title: 'H7 (Task 4.16): Character Frequency Dictionary',
        instructions: 'Given a string raw_string, convert characters to lowercase, exclude spaces, and calculate the frequency of each character. Store the resulting dictionary in char_freq.',
        maxPoints: 5,
        targetVariables: ['char_freq'],
        order: 7
      },
      {
        id: 'hw-h8',
        title: 'H8 (Task 4.17): Dictionary of Squares 1 to N',
        instructions: 'Given positive integer n, create a dictionary squares_dict where keys are integers 1 through n and values are their squares.',
        maxPoints: 5,
        targetVariables: ['squares_dict'],
        order: 8
      }
    ]
  };

  await Assessment.findOneAndUpdate(
    { courseId: course._id, moduleId: module4._id, type: 'homework' },
    { $set: homeworkAssessment },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // Assessment 2: Coding Quiz (20 Marks, 60% weight)
  const quizAssessment = {
    courseId: course._id,
    moduleId: module4._id,
    slug: 'module-4-coding-quiz',
    type: 'quiz',
    title: 'Module 4 Official Final Coding Quiz',
    description: 'Rigorous 6-question coding quiz testing transfer of list mutation, list comprehension, 2D processing, tuple immutability, and dictionary manipulation.',
    maxPoints: 20,
    weight: 0.60,
    notebookPath: 'module-4-coding-quiz.ipynb',
    published: true,
    questions: [
      {
        id: 'quiz-q1',
        title: 'Question 1: List Operations (Mutation & Methods)',
        instructions: 'Given inventory = ["pen", "book", "eraser", "pencil"], modify "eraser" to "marker", append "ruler", insert "notebook" at index 1, and remove "pen". Store final list in updated_inventory.',
        maxPoints: 3,
        targetVariables: ['updated_inventory'],
        order: 1
      },
      {
        id: 'quiz-q2',
        title: 'Question 2: List Comprehension (Odd Squares)',
        instructions: 'Using list comprehension, create a list containing the squares of all odd numbers from 1 through 15. Store in odd_squares.',
        maxPoints: 3,
        targetVariables: ['odd_squares'],
        order: 2
      },
      {
        id: 'quiz-q3',
        title: 'Question 3: Nested Lists (Matrix Flattening)',
        instructions: 'Given matrix = [[2, 4, 6], [1, 3, 5], [8, 10]], flatten all values into a single 1D list stored in flat_values.',
        maxPoints: 4,
        targetVariables: ['flat_values'],
        order: 3
      },
      {
        id: 'quiz-q4',
        title: 'Question 4: Tuple Concatenation and Slicing',
        instructions: 'Given t1 = ("Python", "Java") and t2 = ("C++", "JavaScript"), concatenate them into languages, then extract the middle two elements into middle_languages.',
        maxPoints: 3,
        targetVariables: ['languages', 'middle_languages'],
        order: 4
      },
      {
        id: 'quiz-q5',
        title: 'Question 5: Dictionary Access and Update',
        instructions: 'Given stock = {"pen": 10, "book": 4, "eraser": 7}, update "book" to 8, add "marker": 5, and extract the value for "eraser" into eraser_stock.',
        maxPoints: 3,
        targetVariables: ['stock', 'eraser_stock'],
        order: 5
      },
      {
        id: 'quiz-q6',
        title: 'Question 6: Dictionary Processing (Threshold Filtering)',
        instructions: 'Given scores = {"Ava": 72, "Liam": 91, "Noah": 67, "Mia": 88, "Zoe": 95}, create high_scores containing only entries with scores 80 or greater.',
        maxPoints: 4,
        targetVariables: ['high_scores'],
        order: 6
      }
    ]
  };

  await Assessment.findOneAndUpdate(
    { courseId: course._id, moduleId: module4._id, type: 'quiz' },
    { $set: quizAssessment },
    { upsert: true, setDefaultsOnInsert: true }
  );

  console.log('[Seed] Module 4 assessments seeded successfully.');
}
