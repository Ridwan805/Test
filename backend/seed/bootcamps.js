import Bootcamp from '../models/Bootcamp.js';

export async function seedBootcamps() {
  console.log('[Seed] Ensuring Bootcamps collection is populated...');

  const bootcampsData = [
    {
      title: 'Introduction to Python',
      slug: 'intro-to-python',
      tagline: 'A comprehensive, cohort-based foundational bootcamp mastering Python programming from first principles.',
      description: 'An intensive, structured bootcamp covering the core foundations of Python programming with hands-on exercises, code labs, and real-world projects.',
      duration: '6 Weeks',
      format: 'Cohort-Based Intensive',
      level: 'Beginner',
      tuition: 'Free',
      price: 0,
      techIcon: 'PY',
      techClass: 'tech-python',
      topics: ['Syntax & Logic', 'Data Structures', 'Code Labs', 'Scripting Projects'],
      totalLessons: 5,
      order: 1,
      is_published: true,
      modules: [
        { title: 'Module 1: Getting Started with Python', description: 'Orientation to Python syntax, IDEs, and first script.', order: 1 },
        { title: 'Module 2: Data Structures & Control Flow', description: 'Lists, dictionaries, conditionals, and loops.', order: 2 },
        { title: 'Module 3: Functions & Modular Programming', description: 'Reusable code, parameters, and variable scope.', order: 3 },
        { title: 'Module 4: Working with Files & Data', description: 'Reading CSVs, handling exceptions, and data ingestion.', order: 4 },
        { title: 'Module 5: Capstone Computational Project', description: 'End-to-end applied data automation project.', order: 5 }
      ]
    },
    {
      title: 'Introduction to R',
      slug: 'intro-to-r',
      tagline: 'Master statistical computing, exploratory data analysis, and tidyverse workflows.',
      description: 'An intensive bootcamp introducing the R programming language for statistical computing, data visualization with ggplot2, and data manipulation with dplyr. Designed for aspiring empirical researchers, economists, and data analysts.',
      duration: '6 Weeks',
      format: 'Cohort-Based Intensive',
      level: 'Beginner',
      tuition: 'Free',
      price: 0,
      techIcon: 'R',
      techClass: 'tech-r',
      topics: ['Statistical Computing', 'ggplot2 Visualization', 'tidyverse & dplyr', 'Reproducible Analysis'],
      totalLessons: 5,
      order: 2,
      is_published: true,
      modules: [
        { title: 'Module 1: Getting Started with R & RStudio', description: 'Orientation to statistical computing, RStudio IDE, and vectors.', order: 1 },
        { title: 'Module 2: Data Wrangling with dplyr & tidyr', description: 'Filtering, mutating, grouping, and tidying messy datasets.', order: 2 },
        { title: 'Module 3: Data Visualization with ggplot2', description: 'Grammar of graphics, aesthetics, and publication-ready charts.', order: 3 },
        { title: 'Module 4: Exploratory Data Analysis & Statistics', description: 'Distributions, hypothesis testing, and summary statistics.', order: 4 },
        { title: 'Module 5: Applied Econometric Modeling in R', description: 'Linear regression, diagnostics, and reproducible reports with Quarto.', order: 5 }
      ]
    }
  ];

  for (const bData of bootcampsData) {
    await Bootcamp.findOneAndUpdate(
      { slug: bData.slug },
      { $set: bData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`[Seed] Bootcamp verified in bootcamps collection: ${bData.title}`);
  }
}
