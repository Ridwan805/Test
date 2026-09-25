import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';

/**
 * Seeds or updates the "Introduction to Python" bootcamp, Module 1, and its 5 lessons
 * using the authoritative content from the Module 1 PDF.
 * Uses safe upsert patterns to prevent duplicates.
 */
export async function seedPythonModule1() {
  console.log('[Seed] Starting Python Module 1 database seeding...');

  // 1. Upsert Introduction to Python Course
  const courseData = {
    title: 'Introduction to Python',
    slug: 'intro-to-python',
    tagline: 'A comprehensive, cohort-based foundational bootcamp mastering Python programming.',
    description: 'An intensive, structured bootcamp covering the core foundations of Python programming with hands-on exercises, code labs, and real-world projects.',
    courseType: 'bootcamp',
    accessType: 'authenticated',
    price: 0,
    level: 'Beginner',
    duration: '6 Weeks',
    thumbnail: '',
    published: true,
    is_published: true,
    order: 1
  };

  const course = await Course.findOneAndUpdate(
    { slug: 'intro-to-python' },
    { $set: courseData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Seed] Course verified: ${course.title} (${course._id})`);

  // 2. Upsert Module 1: Getting Started with Python
  const moduleData = {
    courseId: course._id,
    title: 'Getting Started with Python',
    moduleNumber: 1,
    order: 1,
    description: 'An essential orientation to the Python language, its widespread real-world applications, development environments, and your very first program.',
    published: true
  };

  const module1 = await Module.findOneAndUpdate(
    { courseId: course._id, moduleNumber: 1 },
    { $set: moduleData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Seed] Module 1 verified: ${module1.title} (${module1._id})`);

  // Update embedded modules on Course for backward compatibility with existing components
  await Course.updateOne(
    { _id: course._id },
    {
      $set: {
        modules: [
          { title: 'Module 1: Getting Started with Python', order: 1 }
        ]
      }
    }
  );

  // 3. Define 5 Lessons with Structured Content from PDF
  const lessonsData = [
    {
      title: 'What is Python?',
      slug: 'what-is-python',
      lessonNumber: 1,
      order: 1,
      estimatedMinutes: 8,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'What is Python?'
        },
        {
          type: 'paragraph',
          text: 'Python is a popular and versatile programming language that is used for many purposes, including building websites, creating software, automating repetitive tasks, and analyzing data.'
        },
        {
          type: 'note',
          title: 'Key Characteristic: Beginner-Friendly yet Powerful',
          text: 'Python is known for being beginner-friendly because its syntax is simple and easy to learn. Despite its simplicity, Python is powerful enough to handle complex problems efficiently, often requiring less code compared to other programming languages.'
        },
        {
          type: 'paragraph',
          text: 'People from various fields, such as data science, machine learning, automation, and software development, rely on Python because it is flexible and can be used in many different applications.'
        },
        {
          type: 'cards',
          title: 'Core Disciplines Powered by Python',
          cards: [
            {
              title: 'Data Science & Analytics',
              description: 'Manipulating complex datasets, statistical modeling, and extracting actionable business intelligence.',
              tag: 'Analytics'
            },
            {
              title: 'Machine Learning & AI',
              description: 'Training neural networks, predictive algorithms, and automated decision-making pipelines.',
              tag: 'Artificial Intelligence'
            },
            {
              title: 'Web & Software Development',
              description: 'Architecting scalable server-side applications, microservices, and web APIs.',
              tag: 'Full-Stack'
            },
            {
              title: 'Workflow Automation',
              description: 'Streamlining repetitive operations, web scraping, data collection, and batch tasks.',
              tag: 'Productivity'
            }
          ]
        }
      ],
      published: true
    },
    {
      title: 'Why is Python Popular?',
      slug: 'why-is-python-popular',
      lessonNumber: 2,
      order: 2,
      estimatedMinutes: 10,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Why is Python Popular?'
        },
        {
          type: 'paragraph',
          text: 'Python is a beginner-friendly programming language, meaning anyone can learn and use it without needing a background in software engineering or computer science. Its simple and readable syntax makes it easy for newcomers to pick up and start coding right away.'
        },
        {
          type: 'note',
          title: 'The Core Question: "Why choose Python?"',
          text: 'You might wonder: "If we can do everything Python does using other programming languages, why choose Python?" The answer lies in Python\'s efficiency and simplicity. Python allows you to solve complex problems quickly and with fewer lines of code compared to other languages. This not only saves time but also makes your code easier to read, write, and maintain.'
        },
        {
          type: 'heading',
          level: 3,
          text: 'Vast Ecosystem of Libraries and Frameworks'
        },
        {
          type: 'paragraph',
          text: 'Another reason for Python\'s popularity is its vast collection of libraries and frameworks. These tools make it ideal for specialized tasks like data analysis, machine learning, web development, and automation.'
        },
        {
          type: 'paragraph',
          text: 'Python\'s versatility means it can adapt to a wide range of needs, whether you\'re creating a website, analyzing large datasets, or automating repetitive tasks. This flexibility, combined with its ease of use, is why Python is a top choice for beginners and professionals alike.'
        },
        {
          type: 'link',
          title: 'Python in 100 Seconds (Video Overview)',
          url: 'https://www.youtube.com/watch?v=Y8Tko2YC5hA',
          text: 'Watch this concise video introduction exploring why Python has become the world\'s most popular language.'
        }
      ],
      published: true
    },
    {
      title: 'What Can Python Be Used For?',
      slug: 'what-can-python-be-used-for',
      lessonNumber: 3,
      order: 3,
      estimatedMinutes: 12,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'How Python Can Help Us'
        },
        {
          type: 'paragraph',
          text: 'Python can help us in many ways, thanks to its versatility and wide range of applications. Here are key areas where Python is especially helpful:'
        },
        {
          type: 'cards',
          title: 'Key Application Domains',
          cards: [
            {
              title: 'Data Analysis',
              description: 'Python simplifies working with data, allowing users to clean, process, and analyze large datasets efficiently. Libraries like Pandas and NumPy make it easy to handle structured data and perform complex calculations.',
              tag: 'Pandas & NumPy'
            },
            {
              title: 'Machine Learning',
              description: 'Python is widely used in machine learning and artificial intelligence. Libraries like TensorFlow, PyTorch, and Scikit-learn enable developers to build, train, and deploy machine learning models with ease.',
              tag: 'TensorFlow & PyTorch'
            },
            {
              title: 'Data Visualization',
              description: 'Python makes it simple to create informative and visually appealing charts, graphs, and dashboards. Tools like Matplotlib, Seaborn, and Plotly allow users to present data insights clearly.',
              tag: 'Matplotlib & Seaborn'
            },
            {
              title: 'Game Development',
              description: 'Python can be used to develop games, especially smaller-scale or indie projects. Libraries like Pygame provide tools to create interactive 2D games.',
              tag: 'Pygame'
            },
            {
              title: 'Web Development',
              description: 'Python is popular for building websites and web applications. Frameworks like Django and Flask streamline the process of creating robust and scalable web solutions.',
              tag: 'Django & Flask'
            },
            {
              title: 'Automation',
              description: 'Python is excellent for automating repetitive tasks, such as web scraping, file management, and data entry, making workflows more efficient.',
              tag: 'Scripting'
            },
            {
              title: 'Scripting and Prototyping',
              description: 'Python\'s simplicity and speed make it ideal for writing scripts or creating prototypes before scaling up to larger projects.',
              tag: 'Prototyping'
            },
            {
              title: 'Scientific Computing',
              description: 'Python is widely used in fields like physics, chemistry, and biology for simulations and research due to its scientific libraries, such as SciPy and SymPy.',
              tag: 'SciPy & SymPy'
            }
          ]
        },
        {
          type: 'link',
          title: 'Comprehensive Guide: What is Python Used For?',
          url: 'https://www.futurelearn.com/info/blog/what-is-python-used-for',
          text: 'Explore additional real-world case studies and industry applications of Python.'
        }
      ],
      published: true
    },
    {
      title: 'IDEs and Getting Started',
      slug: 'ides-and-getting-started',
      lessonNumber: 4,
      order: 4,
      estimatedMinutes: 10,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Python Basics and Installations'
        },
        {
          type: 'paragraph',
          text: 'We use IDEs to run Python codes. The full form of IDE is Integrated Development Environment, which is a software application that helps programmers develop software code efficiently.'
        },
        {
          type: 'heading',
          level: 3,
          text: 'Major IDEs for Python Development'
        },
        {
          type: 'cards',
          title: 'Popular Development Environments',
          cards: [
            {
              title: 'Visual Studio Code (VS Code)',
              description: 'A versatile, lightweight, highly extensible code editor widely favored in professional software development.',
              tag: 'Code Editor'
            },
            {
              title: 'Google Colab',
              description: 'A zero-setup cloud notebook environment executing Python in the browser with free GPU access.',
              tag: 'Cloud Notebook'
            },
            {
              title: 'PyCharm',
              description: 'A dedicated, feature-packed IDE specifically crafted for Python engineering by JetBrains.',
              tag: 'Full IDE'
            },
            {
              title: 'Jupyter Notebooks',
              description: 'An interactive computing environment ideal for running cells of Python, analyzing data, and rendering visualizations inline.',
              tag: 'Data Science'
            }
          ]
        },
        {
          type: 'heading',
          level: 3,
          text: 'Environment Installation'
        },
        {
          type: 'link',
          title: 'Jupyter Notebook Setup Video Guide',
          url: 'https://www.youtube.com/watch?v=IMrxB8Mq5KU',
          text: 'Step-by-step tutorial on installing and launching Jupyter Notebook on your machine.'
        }
      ],
      published: true
    },
    {
      title: 'Your First Python Program',
      slug: 'your-first-python-program',
      lessonNumber: 5,
      order: 5,
      estimatedMinutes: 12,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Running Your First Code'
        },
        {
          type: 'paragraph',
          text: 'In Python, we display output to the screen using the print() function. Here is how we print the classic "Hello World!" message:'
        },
        {
          type: 'code',
          language: 'python',
          code: 'print("Hello World!")'
        },
        {
          type: 'output',
          text: 'Hello World!'
        },
        {
          type: 'heading',
          level: 3,
          text: 'Breaking Down the Code'
        },
        {
          type: 'paragraph',
          text: 'First, we used the function print() which gives us the output. (We will learn more about functions in future modules). Inside the parentheses, we pass the parameter: a parameter is the input provided to a function. Here, we supply "Hello World!" as the input.'
        },
        {
          type: 'note',
          title: 'Quotation Marks Rule',
          text: 'Look carefully: while writing Hello World!, we put " " (double quotes) around the text. We can also use \' \' (single quotes). You must supply matching quotes around text (strings), otherwise Python will report a syntax error.'
        },
        {
          type: 'heading',
          level: 3,
          text: 'Common Syntax Errors (What NOT to Do)'
        },
        {
          type: 'warning',
          title: 'Error 1: Missing Quotation Marks',
          text: 'If you omit quotation marks around words, Python attempts to parse them as variable names or keywords:'
        },
        {
          type: 'code',
          language: 'python',
          code: 'print(Hello World!)'
        },
        {
          type: 'output',
          text: 'SyntaxError: invalid syntax. Perhaps you forgot a comma?'
        },
        {
          type: 'warning',
          title: 'Error 2: Mismatched Quotation Marks',
          text: 'Opening with a single quote and closing with a double quote (or vice-versa) results in an unterminated string literal:'
        },
        {
          type: 'code',
          language: 'python',
          code: "print('Hello World!\")\n# or\nprint(\"Hello World!')"
        },
        {
          type: 'output',
          text: 'SyntaxError: unterminated string literal (detected at line 1)'
        },
        {
          type: 'paragraph',
          text: 'We will learn more about errors and how to handle them in subsequent lessons.'
        },
        {
          type: 'heading',
          level: 3,
          text: 'Printing Numbers Without Quotes'
        },
        {
          type: 'paragraph',
          text: 'Another important distinction: numbers do not need any quotation marks. For example:'
        },
        {
          type: 'code',
          language: 'python',
          code: 'print(100)'
        },
        {
          type: 'output',
          text: '100'
        },
        {
          type: 'note',
          title: 'Key Takeaway',
          text: 'Text and strings require matching enclosing quotes (either single or double). Numbers can be printed directly as numeric values without quotation marks.'
        }
      ],
      published: true
    }
  ];

  for (const l of lessonsData) {
    await Lesson.findOneAndUpdate(
      { courseId: course._id, slug: l.slug },
      {
        $set: {
          ...l,
          courseId: course._id,
          moduleId: module1._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`[Seed] Lesson verified: ${l.title} (${l.slug})`);
  }

  console.log('[Seed] Python Module 1 database seeding successfully completed!');
  return { course, module: module1, lessonsCount: lessonsData.length };
}

export default seedPythonModule1;
