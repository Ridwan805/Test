import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';

/**
 * Seeds or updates the "Introduction to R" bootcamp, Module 1, and its lessons.
 * Uses safe upsert patterns to prevent duplicates.
 */
export async function seedRModule1() {
  console.log('[Seed] Starting R Module 1 database seeding...');

  // 1. Upsert Introduction to R Course
  const courseData = {
    title: 'Introduction to R',
    slug: 'intro-to-r',
    tagline: 'Master statistical computing, exploratory data analysis, and tidyverse workflows.',
    description: 'An intensive bootcamp introducing the R programming language for statistical computing, data visualization with ggplot2, and data manipulation with dplyr. Designed for aspiring empirical researchers, economists, and data analysts.',
    courseType: 'bootcamp',
    accessType: 'authenticated',
    price: 0,
    level: 'Beginner',
    duration: '6 Weeks',
    thumbnail: '',
    published: true,
    is_published: true,
    order: 2
  };

  const course = await Course.findOneAndUpdate(
    { slug: 'intro-to-r' },
    { $set: courseData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Seed] Course verified: ${course.title} (${course._id})`);

  // 2. Upsert Module 1: Getting Started with R & RStudio
  const moduleData = {
    courseId: course._id,
    title: 'Getting Started with R & RStudio',
    moduleNumber: 1,
    order: 1,
    description: 'An orientation to R for statistical computing, setting up RStudio, understanding core data structures, and writing reproducible analysis scripts.',
    published: true
  };

  const module1 = await Module.findOneAndUpdate(
    { courseId: course._id, moduleNumber: 1 },
    { $set: moduleData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Seed] Module 1 verified: ${module1.title} (${module1._id})`);

  // Update embedded modules on Course
  await Course.updateOne(
    { _id: course._id },
    {
      $set: {
        modules: [
          { title: 'Module 1: Getting Started with R & RStudio', order: 1 }
        ]
      }
    }
  );

  // 3. Define 5 Lessons with Structured Content
  const lessonsData = [
    {
      title: 'What is R and Why Use It?',
      slug: 'what-is-r-and-why-use-it',
      lessonNumber: 1,
      order: 1,
      estimatedMinutes: 8,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'What is R?'
        },
        {
          type: 'paragraph',
          text: 'R is a programming language and free software environment designed specifically for statistical computing, graphical data analysis, and scientific research. Originally developed by Ross Ihaka and Robert Gentleman at the University of Auckland, R has become the standard in academia, econometric analysis, and quantitative research.'
        },
        {
          type: 'note',
          title: 'Purpose-Built for Data & Statistics',
          text: 'Unlike general-purpose programming languages where data structures are external libraries, R was built from the ground up with vectors, matrices, and statistical distributions as native primitives.'
        },
        {
          type: 'cards',
          title: 'Why Economists & Data Scientists Choose R',
          cards: [
            {
              title: 'Statistical Modeling',
              description: 'Built-in functions for regression, hypothesis testing, time-series forecasting, and ANOVA.',
              tag: 'Core Statistics'
            },
            {
              title: 'Publication-Grade Graphics',
              description: 'Create exceptional, publication-quality visualizations using the Grammar of Graphics in ggplot2.',
              tag: 'Visualization'
            },
            {
              title: 'The Tidyverse Ecosystem',
              description: 'A cohesive suite of modern packages designed to make data cleaning and manipulation intuitive.',
              tag: 'Productivity'
            },
            {
              title: 'Reproducible Research',
              description: 'Generate reports, academic papers, and interactive dashboards using R Markdown and Quarto.',
              tag: 'Open Science'
            }
          ]
        }
      ],
      published: true
    },
    {
      title: 'The RStudio Environment & Workspace',
      slug: 'rstudio-environment-and-workspace',
      lessonNumber: 2,
      order: 2,
      estimatedMinutes: 10,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Mastering RStudio IDE'
        },
        {
          type: 'paragraph',
          text: 'RStudio (by Posit) is the premier Integrated Development Environment (IDE) for R. It integrates code editing, console execution, variable inspection, and graphical plots into four clean quadrants.'
        },
        {
          type: 'cards',
          title: 'The 4 Panes of RStudio',
          cards: [
            {
              title: 'Source Editor (Top-Left)',
              description: 'Where you write, edit, and save your .R scripts and Quarto documents.',
              tag: 'Editor'
            },
            {
              title: 'Console (Bottom-Left)',
              description: 'Interactive execution shell where R runs commands and prints immediate evaluations.',
              tag: 'Interactive'
            },
            {
              title: 'Environment & History (Top-Right)',
              description: 'Displays all loaded data frames, vectors, and function definitions in current memory.',
              tag: 'Inspector'
            },
            {
              title: 'Files, Plots & Help (Bottom-Right)',
              description: 'Browse local directories, preview rendered charts, and search CRAN package documentation.',
              tag: 'Output'
            }
          ]
        },
        {
          type: 'code',
          language: 'r',
          caption: 'Basic R Session Check',
          code: '# Check your active R version and working directory\nversion$version.string\ngetwd()'
        }
      ],
      published: true
    },
    {
      title: 'Vectors and Basic Data Types',
      slug: 'vectors-and-basic-data-types',
      lessonNumber: 3,
      order: 3,
      estimatedMinutes: 12,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Data Types and Atomic Vectors'
        },
        {
          type: 'paragraph',
          text: 'In R, the fundamental data structure is the vector. Even a single number is actually a vector of length 1! There are five primary atomic data types: Numeric (doubles), Integer, Character (strings), Logical (TRUE/FALSE), and Factor (categorical data).'
        },
        {
          type: 'code',
          language: 'r',
          caption: 'Creating Vectors with the c() Combine Function',
          code: '# Numeric vector\ngdp_growth <- c(2.1, 1.8, 3.4, -0.5, 2.7)\n\n# Character vector\ncountries <- c("USA", "Germany", "Japan", "UK", "Canada")\n\n# Logical vector\nis_positive <- gdp_growth > 0\nprint(is_positive)\n\n# Vectorized operations (applied element-by-element automatically!)\ngdp_percentage <- gdp_growth / 100\nprint(gdp_percentage)'
        },
        {
          type: 'note',
          title: 'Vectorized Arithmetic',
          text: 'Notice that in R, you do not need loops to apply math to every element. Operations like `gdp_growth * 2` operate on every number in parallel.'
        }
      ],
      published: true
    },
    {
      title: 'Data Frames and Tibbles',
      slug: 'data-frames-and-tibbles',
      lessonNumber: 4,
      order: 4,
      estimatedMinutes: 15,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Working with Tabular Data'
        },
        {
          type: 'paragraph',
          text: 'A data frame is a 2-dimensional tabular structure where each column can contain a different data type (unlike a matrix, which must be homogeneous). In modern R, the tidyverse uses enhanced data frames known as "tibbles".'
        },
        {
          type: 'code',
          language: 'r',
          caption: 'Constructing and Inspecting a Data Frame',
          code: '# Creating a simple economic panel dataset\necon_data <- data.frame(\n  country = c("US", "DE", "JP", "UK"),\n  inflation = c(3.2, 2.5, 1.8, 4.1),\n  unemployment = c(3.8, 3.1, 2.6, 4.2)\n)\n\n# View structure and summary\nstr(econ_data)\nsummary(econ_data)\n\n# Extract a column with $\nmean_inflation <- mean(econ_data$inflation)\nprint(mean_inflation)'
        }
      ],
      published: true
    },
    {
      title: 'Your First R Script & Data Visualization',
      slug: 'your-first-r-script-and-visualization',
      lessonNumber: 5,
      order: 5,
      estimatedMinutes: 15,
      content: [
        {
          type: 'heading',
          level: 2,
          text: 'Plotting Data with ggplot2'
        },
        {
          type: 'paragraph',
          text: 'Data visualization is one of the superpower capabilities of R. Using ggplot2, we build graphs layer by layer: data + aesthetics (mapping variables to axes) + geometries (points, bars, lines).'
        },
        {
          type: 'code',
          language: 'r',
          caption: 'Creating a Scatter Plot with ggplot2',
          code: '# Install and load tidyverse\n# install.packages("tidyverse")\nlibrary(ggplot2)\n\n# Quick exploratory scatter plot with built-in mtcars dataset\nggplot(data = mtcars, aes(x = wt, y = mpg)) +\n  geom_point(color = "#1F3A5F", size = 3) +\n  geom_smooth(method = "lm", color = "#A8823C", se = TRUE) +\n  labs(\n    title = "Vehicle Efficiency vs. Weight",\n    subtitle = "Inverse relationship between vehicle curb weight and miles per gallon",\n    x = "Weight (1,000 lbs)",\n    y = "Miles Per Gallon (MPG)"\n  ) +\n  theme_minimal()'
        },
        {
          type: 'note',
          title: 'Congratulations on Completing Module 1!',
          text: 'You have explored the fundamentals of R, its data types, tabular structures, and generated your first publication-grade plot.'
        }
      ],
      published: true
    }
  ];

  // 4. Upsert each lesson
  for (const les of lessonsData) {
    const saved = await Lesson.findOneAndUpdate(
      { courseId: course._id, slug: les.slug },
      {
        $set: {
          ...les,
          courseId: course._id,
          moduleId: module1._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`[Seed] Lesson verified: ${saved.title} (Lesson #${saved.lessonNumber})`);
  }

  console.log(`[Seed] R Module 1 seeded successfully with ${lessonsData.length} lessons!`);
}
