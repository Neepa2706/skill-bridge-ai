import { initDatabase, execute, queryOne, db } from './database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { recalculateStudentMatches, generatePreparationPlan } from '../services/ai/opportunityMatchingEngine.js';

export async function seedDatabase() {
  console.log('[Seed] Starting database seed...');
  initDatabase();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. SEED USERS & PROFILES
  const users = [
    {
      id: 'usr-student-1',
      email: 'student@skillbridge.ai',
      name: 'Alex Rivera',
      role: 'student',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      phone: '+1 (555) 234-5678'
    },
    {
      id: 'usr-college-1',
      email: 'college@skillbridge.ai',
      name: 'Prof. Arthur Vance',
      role: 'college',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      phone: '+1 (555) 456-7890'
    },
    {
      id: 'usr-recruiter-1',
      email: 'recruiter@skillbridge.ai',
      name: 'Marcus Reed',
      role: 'recruiter',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      phone: '+1 (555) 678-9012'
    },
    {
      id: 'usr-mentor-1',
      email: 'mentor@skillbridge.ai',
      name: 'Dr. Sarah Chen',
      role: 'mentor',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      phone: '+1 (555) 890-1234'
    },
    {
      id: 'usr-admin-1',
      email: 'admin@skillbridge.ai',
      name: 'Elena Rostova (Admin)',
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
      phone: '+1 (555) 012-3456'
    }
  ];

  for (const u of users) {
    execute(
      `INSERT OR REPLACE INTO users (id, email, password_hash, name, role, avatar_url, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.email, passwordHash, u.name, u.role, u.avatarUrl, u.phone]
    );
  }

  // Student Profile
  execute(
    `INSERT OR REPLACE INTO student_profiles (
      id, user_id, college_name, department, year_of_study, education_details,
      career_interest, target_role_id, current_level, programming_languages_json,
      communication_languages_json, learning_preferences_json, career_readiness_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'prof-student-1',
      'usr-student-1',
      'Stanford Institute of Technology',
      'Computer Science & Engineering',
      3,
      'B.Tech in Computer Science & Engineering (GPA: 3.8/4.0)',
      'Software Developer',
      'role-software-dev',
      'Intermediate',
      JSON.stringify(['Python', 'JavaScript', 'SQL', 'C++']),
      JSON.stringify(['English', 'Japanese', 'German']),
      JSON.stringify(['Interactive Projects', 'Video Tutorials', 'Timed Coding Contests']),
      78.5
    ]
  );

  // College & Department
  execute(
    `INSERT OR REPLACE INTO colleges (id, user_id, name, code, contact_email, address, established_year)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['col-1', 'usr-college-1', 'Stanford Institute of Technology', 'SIT-CA', 'placement@sit.edu', '450 Serra Mall, Stanford, CA', 1891]
  );
  execute(
    `INSERT OR REPLACE INTO departments (id, college_id, name, code, hod_name)
     VALUES (?, ?, ?, ?, ?)`,
    ['dept-1', 'col-1', 'Computer Science & Engineering', 'CSE', 'Dr. Donald Knuth Jr.']
  );

  // Company
  execute(
    `INSERT OR REPLACE INTO companies (id, user_id, name, website, industry, description, logo_url, verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'comp-1',
      'usr-recruiter-1',
      'Nexus Technologies',
      'https://nexustechnologies.io',
      'Cloud Software & AI Systems',
      'Pioneering enterprise scalable intelligence infrastructure for global cloud platforms.',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=128&q=80',
      1
    ]
  );

  // Mentor Profile
  execute(
    `INSERT OR REPLACE INTO mentors (
      id, user_id, name, expertise_json, bio, years_experience, current_company, rating, hourly_rate, available_slots_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'men-1',
      'usr-mentor-1',
      'Dr. Sarah Chen',
      JSON.stringify(['System Architecture', 'Distributed Systems', 'FAANG Mock Interviews', 'DSA Mastery']),
      'Principal Distributed Systems Architect with 12+ years experience mentoring 500+ students into top tier tech placements.',
      12,
      'Apex Cloud Infrastructure',
      4.95,
      0, // Pro bono for students
      JSON.stringify([
        'Tomorrow, 4:00 PM - 5:00 PM',
        'Friday, 10:00 AM - 11:00 AM',
        'Saturday, 2:00 PM - 3:00 PM'
      ])
    ]
  );

  // 2. SEED SKILLS & TARGET ROLES
  const skillsList = [
    { id: 'skl-py', name: 'Python', category: 'coding', desc: 'Core Python, OOP, list comprehensions, generators, standard library.' },
    { id: 'skl-dsa', name: 'Data Structures & Algorithms', category: 'coding', desc: 'Arrays, Trees, Graphs, Dynamic Programming, Complexity.' },
    { id: 'skl-sql', name: 'Database Systems & SQL', category: 'technical', desc: 'Relational design, indexing, ACID transactions, query optimization.' },
    { id: 'skl-arch', name: 'Web & API Architecture', category: 'technical', desc: 'REST, GraphQL, microservices, caching, stateless session design.' },
    { id: 'skl-ps', name: 'Problem Solving & Logic', category: 'coding', desc: 'Analytical deduction, boundary condition analysis, invariant preservation.' },
    { id: 'skl-cs', name: 'Computer Science Fundamentals', category: 'technical', desc: 'OS threads/processes, memory management, networks, concurrency.' },
    { id: 'skl-en', name: 'English Communication', category: 'communication', desc: 'Professional workplace dialogue, presentation, technical articulation.' },
    { id: 'skl-ja', name: 'Japanese Communication', category: 'communication', desc: 'Business Japanese (丁寧語), conversational fluency, technical vocabulary.' },
    { id: 'skl-de', name: 'German Communication', category: 'communication', desc: 'Professional German communication, engineering discussion, fluency.' }
  ];

  for (const s of skillsList) {
    execute(
      `INSERT OR REPLACE INTO skills (id, name, category, description) VALUES (?, ?, ?, ?)`,
      [s.id, s.name, s.category, s.desc]
    );
  }

  // Target Roles
  const targetRoles = [
    { id: 'role-software-dev', title: 'Software Developer', desc: 'Designs, implements, and maintains scalable software applications and services.', category: 'Software Engineering' },
    { id: 'role-data-analyst', title: 'Data Analyst', desc: 'Transforms raw business datasets into actionable metrics, models, and SQL pipelines.', category: 'Data & Analytics' },
    { id: 'role-ai-engineer', title: 'AI / ML Engineer', desc: 'Builds, fine-tunes, and deploys predictive and generative machine learning architectures.', category: 'Artificial Intelligence' },
    { id: 'role-fullstack-dev', title: 'Full Stack Developer', desc: 'Builds end-to-end client applications, modern APIs, and persistent database layers.', category: 'Full Stack Engineering' }
  ];

  for (const tr of targetRoles) {
    execute(
      `INSERT OR REPLACE INTO target_roles (id, title, description, category) VALUES (?, ?, ?, ?)`,
      [tr.id, tr.title, tr.desc, tr.category]
    );
  }

  // Student Verified Skills
  const studentInitialSkills = [
    { skillId: 'skl-py', level: 65, verified: 65 },
    { skillId: 'skl-dsa', level: 42, verified: 42 },
    { skillId: 'skl-sql', level: 60, verified: 60 },
    { skillId: 'skl-arch', level: 55, verified: 55 },
    { skillId: 'skl-ps', level: 58, verified: 58 },
    { skillId: 'skl-cs', level: 68, verified: 68 },
    { skillId: 'skl-en', level: 75, verified: 75 },
    { skillId: 'skl-ja', level: 35, verified: 35 },
    { skillId: 'skl-de', level: 30, verified: 30 }
  ];

  for (const ss of studentInitialSkills) {
    execute(
      `INSERT OR REPLACE INTO student_skills (id, user_id, skill_id, current_level, verified_score)
       VALUES (?, ?, ?, ?, ?)`,
      [`ss-${ss.skillId}`, 'usr-student-1', ss.skillId, ss.level, ss.verified]
    );
  }

  // Initial Skill Gaps
  const studentGaps = [
    { skillId: 'skl-dsa', current: 42, req: 75, status: 'critical', gapPct: 33, prio: 1 },
    { skillId: 'skl-ps', current: 58, req: 80, status: 'critical', gapPct: 22, prio: 2 },
    { skillId: 'skl-py', current: 65, req: 75, status: 'needs_improvement', gapPct: 10, prio: 3 },
    { skillId: 'skl-sql', current: 60, req: 65, status: 'needs_improvement', gapPct: 5, prio: 4 },
    { skillId: 'skl-en', current: 75, req: 70, status: 'good', gapPct: 0, prio: 5 }
  ];

  for (const g of studentGaps) {
    execute(
      `INSERT OR REPLACE INTO skill_gaps (id, user_id, target_role_id, skill_id, current_level, required_level, gap_status, gap_percentage, priority_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`sg-${g.skillId}`, 'usr-student-1', 'role-software-dev', g.skillId, g.current, g.req, g.status, g.gapPct, g.prio]
    );
  }

  // 3. SEED COURSES, MODULES, LESSONS (STEP 7 CURRICULUM)
  const courses = [
    {
      id: 'crs-py-201',
      title: 'Python Programming Fundamentals',
      slug: 'python-programming-fundamentals',
      desc: 'Master core Python from scratch, from foundational variables, data types, and control flow to functions, modular architecture, and real-world CLI projects.',
      category: 'Software Engineering',
      primarySkillId: 'skl-py',
      difficulty: 'Beginner',
      provider: 'SkillBridge Academy',
      language: 'English',
      estimatedDuration: '18 Hours',
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=500&q=80',
      hours: 18,
      tier: 'required',
      status: 'published'
    },
    {
      id: 'crs-dsa-101',
      title: 'Data Structures & Algorithms from Zero to Mastery',
      slug: 'dsa-zero-to-mastery',
      desc: 'Master computational complexity, linear arrays, linked lists, trees, graphs, and dynamic programming patterns for top-tier technical interviews.',
      category: 'Computer Science',
      primarySkillId: 'skl-dsa',
      difficulty: 'Intermediate',
      provider: 'SkillBridge Tech Labs',
      language: 'English',
      estimatedDuration: '24 Hours',
      thumbnail: 'https://images.unsplash.com/photo-1516116211227-bbc13c733359?auto=format&fit=crop&w=500&q=80',
      hours: 24,
      tier: 'required',
      status: 'published'
    },
    {
      id: 'crs-sql-301',
      title: 'High-Performance SQL & Relational Database Architecture',
      slug: 'high-performance-sql',
      desc: 'Deep dive into indexes, execution plans, ACID transactions, and database scaling under heavy concurrent load.',
      category: 'Data Engineering',
      primarySkillId: 'skl-sql',
      difficulty: 'Intermediate',
      provider: 'Enterprise DB Systems',
      language: 'English',
      estimatedDuration: '15 Hours',
      thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=500&q=80',
      hours: 15,
      tier: 'recommended',
      status: 'published'
    }
  ];

  for (const c of courses) {
    execute(
      `INSERT OR REPLACE INTO courses (id, title, slug, description, category, primary_skill_id, difficulty, thumbnail, estimated_hours, tier, provider, language, status, estimated_duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.title, c.slug, c.desc, c.category, c.primarySkillId, c.difficulty, c.thumbnail, c.hours, c.tier, c.provider, c.language, c.status, c.estimatedDuration]
    );
  }

  // Course Skills Mapping
  const courseSkillsData = [
    { courseId: 'crs-py-201', skillId: 'skl-py', type: 'primary' },
    { courseId: 'crs-py-201', skillId: 'skl-ps', type: 'secondary' },
    { courseId: 'crs-dsa-101', skillId: 'skl-dsa', type: 'primary' },
    { courseId: 'crs-dsa-101', skillId: 'skl-ps', type: 'secondary' },
    { courseId: 'crs-sql-301', skillId: 'skl-sql', type: 'primary' },
    { courseId: 'crs-sql-301', skillId: 'skl-arch', type: 'secondary' }
  ];

  for (const cs of courseSkillsData) {
    execute(
      `INSERT OR REPLACE INTO course_skills (course_id, skill_id, relationship_type)
       VALUES (?, ?, ?)`,
      [cs.courseId, cs.skillId, cs.type]
    );
  }

  // MODULES & LESSONS FOR PYTHON (crs-py-201)
  const modulesPy = [
    {
      id: 'mod-py-1',
      courseId: 'crs-py-201',
      title: 'Module 1 — Python Basics',
      description: 'Foundational syntax, environments, primitive types, and operator mechanics.',
      sequence: 1,
      orderIndex: 1,
      estimatedDuration: '4 Hours'
    },
    {
      id: 'mod-py-2',
      courseId: 'crs-py-201',
      title: 'Module 2 — Control Flow',
      description: 'Decision trees, conditional branching, and deterministic loop constructs.',
      sequence: 2,
      orderIndex: 2,
      estimatedDuration: '5 Hours'
    },
    {
      id: 'mod-py-3',
      courseId: 'crs-py-201',
      title: 'Module 3 — Functions',
      description: 'Decomposing problems into reusable procedures, scopes, and modular components.',
      sequence: 3,
      orderIndex: 3,
      estimatedDuration: '6 Hours'
    }
  ];

  for (const m of modulesPy) {
    execute(
      `INSERT OR REPLACE INTO modules (id, course_id, title, description, sequence, order_index, estimated_duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.courseId, m.title, m.description, m.sequence, m.orderIndex, m.estimatedDuration]
    );
  }

  const lessonsPy = [
    {
      id: 'les-py-1',
      moduleId: 'mod-py-1',
      title: 'Lesson 1 — Introduction to Python',
      description: 'Discover what makes Python the premier language for systems engineering, web backends, and AI.',
      contentType: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
      duration: 18,
      sequence: 1,
      orderIndex: 1,
      learningObjectives: [
        'Understand Python philosophy, readability, and the role of the interpreter',
        'Learn how Python code is parsed into bytecode and executed by the PVM',
        'Set up a development environment and execute your first Python program'
      ],
      content: `### Welcome to Python Programming Fundamentals\n\nPython is an interpreted, high-level, dynamically typed language engineered by Guido van Rossum in 1991. It emphasizes code readability, rapid developer iteration, and an extraordinarily rich standard library.\n\n#### Why Python for Placement Readiness?\n1. **Ubiquity**: Python powers systems at Google, Meta, Netflix, and NASA.\n2. **Expressiveness**: Clean syntax minimizes boilerplate code, enabling you to focus on algorithmic logic.\n3. **Full-Stack Relevance**: From microservices with FastAPI to machine learning with PyTorch, Python spans the entire engineering spectrum.\n\n#### The Execution Lifecycle\nWhen you run \`python main.py\`:\n- The Python interpreter parses source code into an Abstract Syntax Tree (AST).\n- The compiler generates Python Bytecode (\`.pyc\` cache).\n- The Python Virtual Machine (PVM) interprets bytecode into CPU instructions.\n\n\`\`\`python\n# Your first Python statement\nprint("Hello, SkillBridge AI!")\n\`\`\``,
      examples: [
        'Executing a script: `python -m hello.py`',
        'Checking Python version: `python --version`'
      ],
      keyPoints: [
        'Python is interpreted and dynamically typed',
        'Indentation is mandatory and defines block scope',
        'Extensive standard library provides batteries-included functionality'
      ],
      relatedSkills: ['Python', 'Programming Fundamentals']
    },
    {
      id: 'les-py-2',
      moduleId: 'mod-py-1',
      title: 'Lesson 2 — Variables and Data Types',
      description: 'Master variables as memory references, primitive scalars, and Python type conversion rules.',
      contentType: 'article',
      videoUrl: null,
      duration: 15,
      sequence: 2,
      orderIndex: 2,
      learningObjectives: [
        'Understand variables as references to objects in memory',
        'Master the fundamental scalar data types: int, float, str, and bool',
        'Learn dynamic typing, duck typing, and explicit type casting',
        'Examine immutability in primitive values'
      ],
      content: `### Variables in Python\n\nUnlike static languages like C++ or Java where variables are strongly typed memory containers, a Python variable is a **named reference** (or label) that points to an object stored on the heap.\n\n#### 1. Variable Assignment\n\`\`\`python\nx = 42             # Integer object 42 allocated; x references it\ny = 3.14159        # Float object\nname = "SkillBridge" # String object\nis_enrolled = True # Boolean object\n\`\`\`\n\n#### 2. Python Scalar Types\n- **\`int\`**: Arbitrary precision signed integers (no 32-bit overflow limitation in Python 3!)\n- **\`float\`**: IEEE 754 double-precision floating point numbers\n- **\`str\`**: Immutable UTF-8 sequence of Unicode characters\n- **\`bool\`**: Subclass of integer with values \`True\` (1) and \`False\` (0)\n\n#### 3. Dynamic Typing & Mutability\nYou can reassign a variable to a different type at any time:\n\`\`\`python\nstatus = "Beginner"\nstatus = 1  # Valid dynamic reassignment\n\`\`\`\nStrings, integers, and floats are **immutable**. Operations that modify them construct new objects in memory rather than mutating in place.`,
      examples: [
        'Type introspection: `type(42)` returns `<class \'int\'>`',
        'Explicit casting: `int("100") + 50` produces `150`',
        'F-string formatting: `f"Candidate: {name}, Status: {status}"`'
      ],
      keyPoints: [
        'Variables are named pointers to heap-allocated objects',
        'Primitives (int, float, str, bool) are immutable in Python',
        'Python uses automatic reference counting and cyclic garbage collection'
      ],
      relatedSkills: ['Python', 'Programming Fundamentals']
    },
    {
      id: 'les-py-3',
      moduleId: 'mod-py-1',
      title: 'Lesson 3 — Operators and Expressions',
      description: 'Learn arithmetic, logical comparison, identity, and membership operators with precedence mechanics.',
      contentType: 'interactive',
      videoUrl: null,
      duration: 20,
      sequence: 3,
      orderIndex: 3,
      learningObjectives: [
        'Execute mathematical operations including floor division and modulus',
        'Apply comparison operators for conditional assertions',
        'Distinguish between value equality (`==`) and identity (`is`)',
        'Harness short-circuit boolean evaluation with `and`, `or`, and `not`'
      ],
      content: `### Operators in Python\n\nOperators are special symbols that perform computations on operands. Python provides rich operator support designed to match mathematical intuition.\n\n#### Arithmetic Operators\n- Addition: \`+\`\n- Subtraction: \`-\`\n- Multiplication: \`*\`\n- True Division: \`/\` (always returns float, e.g. \`7 / 2 == 3.5\`)\n- Floor Division: \`//\` (truncates fractional component, e.g. \`7 // 2 == 3\`)\n- Modulus: \`%\` (remainder after division, e.g. \`7 % 2 == 1\`)\n- Exponentiation: \`**\` (e.g. \`2 ** 8 == 256\`)\n\n#### Comparison & Logical Invariants\n\`\`\`python\na = [1, 2, 3]\nb = [1, 2, 3]\nprint(a == b)  # True (values are equivalent)\nprint(a is b)  # False (different memory addresses)\n\`\`\`\n\n#### Short-Circuit Evaluation\nIn \`X and Y\`, if \`X\` is false, Python never evaluates \`Y\` because the conjunction cannot be true. In \`X or Y\`, if \`X\` is true, \`Y\` is skipped.`,
      examples: [
        'Modulus check for parity: `n % 2 == 0` identifies even numbers',
        'Chained comparisons: `10 < score <= 100` evaluates concisely in Python',
        'Membership test: `"admin" in user_roles` operates in O(1) on sets'
      ],
      keyPoints: [
        '`/` performs float division; `//` performs floor division',
        '`==` checks value equality; `is` checks exact memory identity',
        'Boolean operators employ short-circuit evaluation'
      ],
      relatedSkills: ['Python', 'Problem Solving & Logic']
    },
    {
      id: 'les-py-4',
      moduleId: 'mod-py-2',
      title: 'Lesson 4 — Conditions and Branching',
      description: 'Architect deterministic decision branches with if, elif, else, and ternary expressions.',
      contentType: 'article',
      videoUrl: null,
      duration: 16,
      sequence: 1,
      orderIndex: 1,
      learningObjectives: [
        'Construct multi-path decision trees using if/elif/else',
        'Evaluate truthiness rules for Python objects',
        'Implement clean guard clauses to avoid deep nesting'
      ],
      content: `### Control Flow: Conditional Branching\n\nPrograms must make decisions based on real-world inputs. Python uses \`if\`, \`elif\`, and \`else\` statements controlled strictly by indentation.\n\n#### Structure\n\`\`\`python\nscore = 85\n\nif score >= 90:\n    grade = "A"\nelif score >= 75:\n    grade = "B"\nelif score >= 60:\n    grade = "C"\nelse:\n    grade = "D"\n\`\`\`\n\n#### Truth Value Testing (Truthiness)\nIn Python, the following evaluate to \`False\`:\n- \`None\` and \`False\`\n- Zero of any numeric type: \`0\`, \`0.0\`, \`0j\`\n- Empty sequences and collections: \`""\`, \`()\`, \`[]\`, \`{}\`, \`set()\`\n\nEverything else evaluates to \`True\`!\n\n#### Guard Clause Pattern\nPrefer early returns over deeply nested statements:\n\`\`\`python\ndef process_application(student):\n    if not student.email_verified:\n        return "Verification Required"\n    if student.score < 70:\n        return "Improvement Recommended"\n    return "Ready for Placement"\n\`\`\``,
      examples: [
        'One-line ternary operator: `status = "Eligible" if score >= 75 else "Review"`',
        'Empty collection check: `if not items: print("List is empty")`'
      ],
      keyPoints: [
        'Indentation indicates nested code blocks (4 spaces recommended)',
        'Empty collections and zero values are naturally falsy',
        'Guard clauses improve code readability and maintainability'
      ],
      relatedSkills: ['Python', 'Problem Solving & Logic']
    },
    {
      id: 'les-py-5',
      moduleId: 'mod-py-2',
      title: 'Lesson 5 — Loops and Iterations',
      description: 'Master for loops with range(), while loops, loop control keywords, and the else clause.',
      contentType: 'interactive',
      videoUrl: null,
      duration: 22,
      sequence: 2,
      orderIndex: 2,
      learningObjectives: [
        'Iterate over sequences using for-in and range() generator',
        'Manage stateful loops with while and safeguard against infinite cycles',
        'Utilize break, continue, and pass strategically',
        'Understand Python loop-else behavior'
      ],
      content: `### Loops and Iteration Mechanics\n\nLoops allow repetitive execution of code blocks across datasets and numerical sequences.\n\n#### 1. The \`for\` Loop\nPython \`for\` loops operate as iterators over collections:\n\`\`\`python\nfor i in range(5):\n    print(f"Cycle {i}")  # Prints 0, 1, 2, 3, 4\n\`\`\`\n\n#### 2. The \`while\` Loop\nExecutes while a condition evaluates to truthy:\n\`\`\`python\nattempts = 0\nwhile attempts < 3:\n    attempts += 1\n\`\`\`\n\n#### 3. Break, Continue & Else\n- **\`break\`**: Immediately terminates the innermost loop.\n- **\`continue\`**: Skips remainder of current cycle and proceeds to next iteration.\n- **\`else\` block**: Executes ONLY if loop completed naturally without hitting a \`break\`!\n\n\`\`\`python\nfor num in [2, 4, 6, 8]:\n    if num % 2 != 0:\n        print("Found odd number")\n        break\nelse:\n    print("All numbers are even!")\n\`\`\``,
      examples: [
        'Enumerate with index: `for idx, val in enumerate(skills): print(idx, val)`',
        'Zip two sequences: `for name, score in zip(names, scores): print(name, score)`'
      ],
      keyPoints: [
        'Python for loops iterate over iterable objects using protocol iter() and next()',
        '`range(start, stop, step)` generates numbers on demand without allocating entire lists',
        'Loop else statements run when no break statement occurred'
      ],
      relatedSkills: ['Python', 'Problem Solving & Logic']
    },
    {
      id: 'les-py-6',
      moduleId: 'mod-py-3',
      title: 'Lesson 6 — Functions and Scope',
      description: 'Define pure functions, understand parameter passing by object reference, and the LEGB scope hierarchy.',
      contentType: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=9Os0o3wzS_I',
      duration: 20,
      sequence: 1,
      orderIndex: 1,
      learningObjectives: [
        'Define procedures and mathematical functions with def and return',
        'Master the LEGB (Local, Enclosing, Global, Built-in) scope resolution rule',
        'Understand pass-by-object-reference semantics'
      ],
      content: `### Modular Code with Python Functions\n\nFunctions encapsulate reusable logic, improve maintainability, and reduce code duplication across software architectures.\n\n#### Declaring a Function\n\`\`\`python\ndef calculate_readiness(completed_modules, total_modules):\n    \"\"\"Calculates student readiness percentage.\"\"\"\n    if total_modules == 0:\n        return 0.0\n    return round((completed_modules / total_modules) * 100, 2)\n\`\`\`\n\n#### Scope Resolution: The LEGB Rule\nWhen Python resolves a variable name, it looks in this exact priority:\n1. **Local (L)**: Names defined inside the function.\n2. **Enclosing (E)**: Names defined in enclosing enclosing functions (closures).\n3. **Global (G)**: Names defined at the module top level.\n4. **Built-in (B)**: Pre-assigned built-in names (e.g. \`len\`, \`range\`, \`print\`).\n\n#### Pass-by-Object-Reference\nPython passes argument references by value:\n- Modifying a mutable argument (like a \`list\` or \`dict\`) inside the function reflects in the caller.\n- Reassigning the parameter variable inside the function rebinds the local name without changing the caller object.`,
      examples: [
        'Docstring documentation: accessible via `help(calculate_readiness)`',
        'Default return: Functions without a return statement return `None` implicitly'
      ],
      keyPoints: [
        'Functions are first-class citizens in Python and can be passed as arguments',
        'Variables follow the LEGB scope search order',
        'Mutable default arguments should be avoided (use None sentinel pattern)'
      ],
      relatedSkills: ['Python', 'Programming Fundamentals']
    },
    {
      id: 'les-py-7',
      moduleId: 'mod-py-3',
      title: 'Lesson 7 — Parameters and Return Values',
      description: 'Master positional, keyword, default parameters, *args variable packing, **kwargs dictionaries, and unpacking.',
      contentType: 'article',
      videoUrl: null,
      duration: 18,
      sequence: 2,
      orderIndex: 2,
      learningObjectives: [
        'Configure default parameter values with safe sentinel values',
        'Handle arbitrary numbers of positional arguments with *args',
        'Process arbitrary keyword configurations with **kwargs',
        'Return multiple values as tuples and unpack cleanly'
      ],
      content: `### Advanced Parameter Mechanics in Python\n\nPython functions offer immense flexibility in how arguments are passed and received.\n\n#### 1. Positional & Keyword Arguments\n\`\`\`python\ndef register_student(name, role="student", verified=False):\n    return {"name": name, "role": role, "verified": verified}\n\n# Calling with positional and keyword arguments\nregister_student("Alex Rivera", verified=True)\n\`\`\`\n\n#### 2. Variable Arguments: *args and **kwargs\n- **\`*args\`**: Collects extra positional arguments into a \`tuple\`.\n- **\`**kwargs\`**: Collects extra keyword arguments into a \`dict\`.\n\n\`\`\`python\ndef log_telemetry(event_name, *tags, **metadata):\n    print(f"Event: {event_name}")\n    print(f"Tags: {tags}")        # tuple\n    print(f"Meta: {metadata}")    # dict\n\nlog_telemetry(\"lesson_completed\", \"python\", \"core\", duration_sec=920, score=100)\n\`\`\`\n\n#### 3. Multiple Return Values\nPython functions can return multiple values separated by commas, which packs them into a tuple:\n\`\`\`python\ndef get_stats(scores):\n    return min(scores), max(scores), sum(scores) / len(scores)\n\nlowest, highest, average = get_stats([80, 92, 74, 88])\n\`\`\``,
      examples: [
        'Argument unpacking: `coords = (12.5, 45.8); plot_point(*coords)`',
        'Keyword argument dictionary unpacking: `requests.post(url, **config)`'
      ],
      keyPoints: [
        '*args collects variadic positional parameters into a tuple',
        '**kwargs collects keyword parameters into a dictionary',
        'Multiple return values automatically pack and unpack as tuples'
      ],
      relatedSkills: ['Python', 'Software Engineering']
    },
    {
      id: 'les-py-8',
      moduleId: 'mod-py-3',
      title: 'Lesson 8 — Project: Command-Line Task Manager',
      description: 'Build a modular CLI application applying functions, file persistence, error handling, and structured data.',
      contentType: 'project',
      videoUrl: null,
      duration: 45,
      sequence: 3,
      orderIndex: 3,
      learningObjectives: [
        'Synthesize variables, collections, loops, and functions into a complete application',
        'Implement CRUD operations (Create, Read, Update, Delete) via standard terminal inputs',
        'Handle runtime exceptions gracefully without crashing the user session'
      ],
      content: `### Capstone Project: CLI Task Manager\n\n#### Objective\nDesign and build an interactive terminal task manager that allows a developer to add tasks, view tasks by priority, mark tasks complete, and save data to disk.\n\n#### Functional Requirements:\n1. **Task Model**: Each task has an ID, title, priority (\`High\`, \`Medium\`, \`Low\`), and completion status (\`Pending\`, \`Done\`).\n2. **Interactive Menu Loop**:\n   - Option 1: View all active tasks formatted as a clean table.\n   - Option 2: Add a new task with title and priority validation.\n   - Option 3: Mark a task as completed by ID.\n   - Option 4: Filter tasks by priority.\n   - Option 5: Exit application.\n3. **Modular Architecture**: Separate user interface presentation from task data storage.\n\n#### Starter Architecture Blueprint:\n\`\`\`python\ntasks = []\n\ndef add_task(title, priority=\"Medium\"):\n    task = {\n        \"id\": len(tasks) + 1,\n        \"title\": title,\n        \"priority\": priority,\n        \"completed\": False\n    }\n    tasks.append(task)\n    return task\n\ndef mark_complete(task_id):\n    for task in tasks:\n        if task[\"id\"] == task_id:\n            task[\"completed\"] = True\n            return True\n    return False\n\`\`\`\n\n#### Expected Deliverables:\n- A cleanly structured \`task_manager.py\` file with docstrings for all functions.\n- Validated user input handling protecting against non-integer ID entries.`,
      examples: [
        'Adding a task: `add_task("Implement Binary Search", "High")`',
        'Listing tasks in terminal with status emojis: `[✓] Task 1: Setup virtualenv`'
      ],
      keyPoints: [
        'Encapsulate business logic into discrete single-responsibility functions',
        'Store task records using dictionaries inside a master list collection',
        'Validate inputs to prevent unexpected runtime crashes'
      ],
      relatedSkills: ['Python', 'Problem Solving & Logic', 'Software Engineering']
    }
  ];

  for (const l of lessonsPy) {
    execute(
      `INSERT OR REPLACE INTO lessons (
        id, module_id, title, description, content_type, content, video_url, duration, duration_minutes,
        sequence, order_index, status, learning_objectives_json, examples_json, key_points_json, related_skills_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        l.id,
        l.moduleId,
        l.title,
        l.description,
        l.contentType,
        l.content,
        l.videoUrl,
        l.duration,
        l.duration,
        l.sequence,
        l.orderIndex,
        'active',
        JSON.stringify(l.learningObjectives),
        JSON.stringify(l.examples),
        JSON.stringify(l.keyPoints),
        JSON.stringify(l.relatedSkills)
      ]
    );

    // Map lesson skills
    for (const skName of l.relatedSkills) {
      const skRow = queryOne('SELECT id FROM skills WHERE name = ?', [skName]);
      if (skRow) {
        execute(
          `INSERT OR REPLACE INTO lesson_skills (lesson_id, skill_id) VALUES (?, ?)`,
          [l.id, skRow.id]
        );
      }
    }
  }

  // MODULES & LESSONS FOR DSA (crs-dsa-101)
  execute(
    `INSERT OR REPLACE INTO modules (id, course_id, title, description, sequence, order_index, estimated_duration)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['mod-dsa-1', 'crs-dsa-101', 'Module 1 — Complexity & Two-Pointer Patterns', 'Master Big-O invariants and two pointer techniques.', 1, 1, '6 Hours']
  );

  const lessonsDSA = [
    {
      id: 'les-dsa-1',
      moduleId: 'mod-dsa-1',
      title: 'Lesson 1 — Time & Space Complexity Invariants',
      description: 'Master asymptotic notation, worst-case bounds, and auxiliary memory trade-offs.',
      contentType: 'article',
      duration: 20,
      sequence: 1,
      orderIndex: 1,
      learningObjectives: ['Understand Big-O, Big-Omega, and Big-Theta notation', 'Analyze iterative and recursive algorithms for auxiliary memory'],
      content: `### Understanding Algorithmic Scaling\n\nEvery algorithmic decision comes with a fundamental trade-off between time execution cycles and auxiliary space overhead.\n\n#### Key Invariants:\n- **O(1) Constant**: Direct hash lookup, array index calculation.\n- **O(log n) Logarithmic**: Binary search in a sorted array, height-balanced BST operations.\n- **O(n) Linear**: Single traversal across unindexed collections.\n- **O(n log n) Linearithmic**: Merge sort, heap sort, optimal comparison-based sorting.\n\nAlways evaluate the worst-case, average-case, and amortized bounds before choosing an approach in technical interviews.`,
      examples: ['Binary search: O(log n) time, O(1) space', 'Recursive Fibonacci: O(2^n) time without memoization'],
      keyPoints: ['Time complexity measures execution scaling relative to input n', 'Space complexity measures auxiliary memory allocation'],
      relatedSkills: ['Data Structures & Algorithms', 'Problem Solving & Logic']
    },
    {
      id: 'les-dsa-2',
      moduleId: 'mod-dsa-1',
      title: 'Lesson 2 — The Two-Pointer Convergence Pattern',
      description: 'Eliminate nested loops in arrays and strings using converging and sliding pointers.',
      contentType: 'interactive',
      duration: 25,
      sequence: 2,
      orderIndex: 2,
      learningObjectives: ['Apply two pointers to sorted arrays', 'Solve palindrome and target sum problems in O(n)'],
      content: `### Two-Pointer Mechanics\n\nThe two-pointer pattern involves navigating an array or string from opposite ends (or at different speeds) to eliminate redundant nested iterations.\n\n#### Classic Problems:\n1. Pair with Target Sum in sorted array\n2. Palindrome verification\n3. Container With Most Water\n\nBy moving pointers inward based on sum comparisons, we reduce naive O(n²) complexity to optimal O(n) in a single pass.`,
      examples: ['Two Sum in sorted array with left/right converging pointers', 'In-place string reversal with O(1) memory'],
      keyPoints: ['Applicable primarily to linear, indexable sequences', 'Converts quadratic O(n^2) brute force into linear O(n)'],
      relatedSkills: ['Data Structures & Algorithms', 'Problem Solving & Logic']
    }
  ];

  for (const l of lessonsDSA) {
    execute(
      `INSERT OR REPLACE INTO lessons (
        id, module_id, title, description, content_type, content, duration, duration_minutes, sequence, order_index, status,
        learning_objectives_json, examples_json, key_points_json, related_skills_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        l.id, l.moduleId, l.title, l.description, l.contentType, l.content, l.duration, l.duration, l.sequence, l.orderIndex, 'active',
        JSON.stringify(l.learningObjectives), JSON.stringify(l.examples), JSON.stringify(l.keyPoints), JSON.stringify(l.relatedSkills)
      ]
    );
  }

  // SEED ENROLLMENT & PROGRESS FOR DEMO STUDENT (usr-student-1)
  // Student enrolled in Python Fundamentals with realistic progress as in prompt example:
  // Lesson 1 ✓ (100%), Lesson 2 ✓ (100%), Lesson 3 -> 65% in-progress!
  // Overall course progress: (1 + 1 + 0.65) / 8 * 100 = 33.1% (~35%)
  execute(
    `INSERT OR REPLACE INTO course_enrollments (
      id, user_id, student_id, course_id, roadmap_id, status, progress_percentage, started_at, last_accessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'enr-py-1',
      'usr-student-1',
      'usr-student-1',
      'crs-py-201',
      null,
      'in_progress',
      35.0,
      '2026-09-08 10:00:00',
      '2026-09-11 11:30:00'
    ]
  );

  // Lesson 1 Completed (Video, fully watched)
  execute(
    `INSERT OR REPLACE INTO lesson_progress (
      id, user_id, student_id, lesson_id, is_completed, completed, content_completed, practice_completed,
      progress_percentage, playback_position, read_position, time_spent_seconds, last_accessed_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'lp-py-1',
      'usr-student-1',
      'usr-student-1',
      'les-py-1',
      1,
      1,
      1,
      1,
      100.0,
      1080.0, // 18 minutes watched
      1.0,
      1120,
      '2026-09-09 14:20:00',
      '2026-09-09 14:20:00'
    ]
  );

  // Lesson 2 Completed (Article, fully read)
  execute(
    `INSERT OR REPLACE INTO lesson_progress (
      id, user_id, student_id, lesson_id, is_completed, completed, content_completed, practice_completed,
      progress_percentage, playback_position, read_position, time_spent_seconds, last_accessed_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'lp-py-2',
      'usr-student-1',
      'usr-student-1',
      'les-py-2',
      1,
      1,
      1,
      1,
      100.0,
      0.0,
      1.0, // 100% read
      940,
      '2026-09-10 16:45:00',
      '2026-09-10 16:45:00'
    ]
  );

  // Lesson 3 In-Progress at 65% (Operators)
  execute(
    `INSERT OR REPLACE INTO lesson_progress (
      id, user_id, student_id, lesson_id, is_completed, completed, content_completed, practice_completed,
      progress_percentage, playback_position, read_position, time_spent_seconds, last_accessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'lp-py-3',
      'usr-student-1',
      'usr-student-1',
      'les-py-3',
      0,
      0,
      0,
      0,
      65.0, // 65% complete
      0.0,
      0.65,
      540,
      '2026-09-11 11:30:00'
    ]
  );

  // Enroll in DSA as well (in progress)
  execute(
    `INSERT OR REPLACE INTO course_enrollments (
      id, user_id, student_id, course_id, roadmap_id, status, progress_percentage, started_at, last_accessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'enr-dsa-1',
      'usr-student-1',
      'usr-student-1',
      'crs-dsa-101',
      null,
      'in_progress',
      50.0,
      '2026-09-05 09:00:00',
      '2026-09-07 14:00:00'
    ]
  );

  execute(
    `INSERT OR REPLACE INTO lesson_progress (
      id, user_id, student_id, lesson_id, is_completed, completed, content_completed, practice_completed,
      progress_percentage, playback_position, read_position, time_spent_seconds, last_accessed_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['lp-dsa-1', 'usr-student-1', 'usr-student-1', 'les-dsa-1', 1, 1, 1, 1, 100.0, 0, 1.0, 950, '2026-09-06 11:00:00', '2026-09-06 11:00:00']
  );

  // SEED MEANINGFUL LEARNING ACTIVITIES
  const initialActivities = [
    {
      id: 'act-1',
      userId: 'usr-student-1',
      activityType: 'course_started',
      courseId: 'crs-py-201',
      moduleId: 'mod-py-1',
      lessonId: 'les-py-1',
      title: 'Started Course: Python Programming Fundamentals',
      duration: 0,
      createdAt: '2026-09-08 10:00:00'
    },
    {
      id: 'act-2',
      userId: 'usr-student-1',
      activityType: 'video_watched',
      courseId: 'crs-py-201',
      moduleId: 'mod-py-1',
      lessonId: 'les-py-1',
      title: 'Watched Video: Lesson 1 — Introduction to Python',
      duration: 18 * 60,
      createdAt: '2026-09-09 14:15:00'
    },
    {
      id: 'act-3',
      userId: 'usr-student-1',
      activityType: 'lesson_completed',
      courseId: 'crs-py-201',
      moduleId: 'mod-py-1',
      lessonId: 'les-py-1',
      title: 'Completed Lesson 1: Introduction to Python',
      duration: 18 * 60,
      createdAt: '2026-09-09 14:20:00'
    },
    {
      id: 'act-4',
      userId: 'usr-student-1',
      activityType: 'article_completed',
      courseId: 'crs-py-201',
      moduleId: 'mod-py-1',
      lessonId: 'les-py-2',
      title: 'Read Article: Lesson 2 — Variables and Data Types',
      duration: 15 * 60,
      createdAt: '2026-09-10 16:45:00'
    },
    {
      id: 'act-5',
      userId: 'usr-student-1',
      activityType: 'lesson_progressed',
      courseId: 'crs-py-201',
      moduleId: 'mod-py-1',
      lessonId: 'les-py-3',
      title: 'Progressed on Lesson 3: Operators and Expressions (65%)',
      duration: 9 * 60,
      createdAt: '2026-09-11 11:30:00'
    }
  ];

  for (const act of initialActivities) {
    execute(
      `INSERT OR REPLACE INTO learning_activities (
        id, user_id, student_id, activity_type, course_id, module_id, lesson_id, title, duration, duration_minutes, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        act.id,
        act.userId,
        act.userId,
        act.activityType,
        act.courseId,
        act.moduleId,
        act.lessonId,
        act.title,
        act.duration,
        Math.round(act.duration / 60),
        act.createdAt,
        act.createdAt
      ]
    );
  }

  // 4. (Step 9 Coding Problems are seeded comprehensively in Section 9 below)

  // 5. SEED LANGUAGE TRACKS
  const langTracks = [
    { code: 'en', name: 'English', emoji: '🇬🇧', desc: 'Professional fluency, technical presentations, and international workplace etiquette.' },
    { code: 'ja', name: 'Japanese', emoji: '🇯🇵', desc: 'Business Japanese (ビジネス日本語), polite Keigo etiquette, and tech terminology.' },
    { code: 'de', name: 'German', emoji: '🇩🇪', desc: 'Technical German for engineering teams, agile collaboration, and international careers.' }
  ];

  for (const lt of langTracks) {
    execute(
      `INSERT OR REPLACE INTO language_tracks (id, language_code, language_name, flag_emoji, description)
       VALUES (?, ?, ?, ?, ?)`,
      [`lt-${lt.code}`, lt.code, lt.name, lt.emoji, lt.desc]
    );
  }

  // 6. SEED INTERNSHIPS, EVENTS, JOBS
  const internships = [
    {
      id: 'intern-1',
      companyId: 'comp-1',
      title: 'Cloud Systems Software Engineering Intern',
      role: 'Backend Cloud Engineering',
      desc: 'Join our Distributed Infrastructure Team building real-time microservices in Python and Node.js.',
      reqSkills: JSON.stringify(['Python', 'Database Systems & SQL', 'Problem Solving & Logic', 'English Communication']),
      eligibility: 'Pre-final and final year B.Tech / M.Tech CS students with 7.0+ CGPA',
      duration: '6 Months (Full-Time)',
      stipend: '$3,500 / month',
      location: 'San Francisco, CA (or Remote)',
      workMode: 'remote',
      startDate: 'October 2026',
      deadline: 'September 28, 2026',
      url: 'https://nexustechnologies.io/careers/intern-cloud-2026'
    },
    {
      id: 'intern-2',
      companyId: 'comp-1',
      title: 'Data Platform & Analytics Intern',
      role: 'Data Engineering',
      desc: 'Architect data pipelines, optimize analytical SQL queries, and build automated schema reporting.',
      reqSkills: JSON.stringify(['Database Systems & SQL', 'Python', 'Problem Solving & Logic']),
      eligibility: 'Passionate learners with demonstrable SQL and relational schema understanding',
      duration: '3 Months',
      stipend: '$3,000 / month',
      location: 'Austin, TX',
      workMode: 'hybrid',
      startDate: 'November 2026',
      deadline: 'October 15, 2026',
      url: 'https://nexustechnologies.io/careers/intern-data-2026'
    }
  ];

  for (const intern of internships) {
    execute(
      `INSERT OR REPLACE INTO internships (
        id, company_id, title, role, description, required_skills_json, eligibility,
        duration, stipend, location, work_mode, start_date, deadline, application_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        intern.id, intern.companyId, intern.title, intern.role, intern.desc,
        intern.reqSkills, intern.eligibility, intern.duration, intern.stipend,
        intern.location, intern.workMode, intern.startDate, intern.deadline, intern.url
      ]
    );
  }

  // Events
  const events = [
    {
      id: 'evt-hack-1',
      organizer: 'Nexus Technologies & Stanford Tech',
      title: 'SkillBridge Global Hackathon 2026: AI Infrastructure',
      type: 'hackathon',
      date: 'September 26, 2026',
      time: '09:00 AM PST',
      location: 'Online / Virtual Live',
      desc: 'Build scalable agentic workflows and production tools. $25,000 in grand prizes and direct interview shortlists.',
      eligibility: 'Open to all university students and early-career developers',
      deadline: 'September 24, 2026',
      url: 'https://hackathon.skillbridge.ai/register'
    },
    {
      id: 'evt-web-2',
      organizer: 'Apex Cloud Architects',
      title: 'Mastering System Design: From Monoliths to Event-Driven Cloud',
      type: 'webinar',
      date: 'October 2, 2026',
      time: '05:00 PM PST',
      location: 'Interactive Livestream',
      desc: 'Live architectural deep-dive with Dr. Sarah Chen on designing resilient microservices.',
      eligibility: 'All SkillBridge learners',
      deadline: 'October 1, 2026',
      url: 'https://skillbridge.ai/events/system-design'
    }
  ];

  for (const evt of events) {
    execute(
      `INSERT OR REPLACE INTO events (
        id, organizer_name, title, event_type, date, time, location, description, eligibility, deadline, registration_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [evt.id, evt.organizer, evt.title, evt.type, evt.date, evt.time, evt.location, evt.desc, evt.eligibility, evt.deadline, evt.url]
    );
  }

  // Jobs
  const jobs = [
    {
      id: 'job-1',
      companyId: 'comp-1',
      title: 'Associate Software Engineer (Graduate Placement)',
      desc: 'Looking for high-potential graduate engineers to build robust microservices and distributed data pipelines.',
      reqSkills: JSON.stringify(['Python', 'Data Structures & Algorithms', 'Database Systems & SQL', 'English Communication']),
      prefSkills: JSON.stringify(['Web & API Architecture', 'Japanese Communication']),
      eligibility: 'Final year students or recent graduates within 1 year',
      exp: '0 - 1 Years',
      location: 'San Francisco, CA / Seattle, WA',
      mode: 'hybrid',
      salary: '$115,000 - $135,000 + Equity',
      deadline: 'October 30, 2026'
    }
  ];

  for (const j of jobs) {
    execute(
      `INSERT OR REPLACE INTO jobs (
        id, company_id, title, description, required_skills_json, preferred_skills_json,
        eligibility, experience_level, location, work_mode, salary_range, deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        j.id, j.companyId, j.title, j.desc, j.reqSkills, j.prefSkills,
        j.eligibility, j.exp, j.location, j.mode, j.salary, j.deadline
      ]
    );
  }

  // Sample Application for Student
  execute(
    `INSERT OR REPLACE INTO applications (
      id, user_id, opportunity_type, opportunity_id, current_stage, match_score, match_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'app-1',
      'usr-student-1',
      'internship',
      'intern-1',
      'shortlisted',
      84.0,
      'Strong match: Python, SQL. Gap: DSA (in progress).'
    ]
  );

  // 7. SEED NOTIFICATIONS
  const notifications = [
    {
      id: 'notif-1',
      userId: 'usr-student-1',
      title: 'Recommended Course Unlocked',
      message: 'Based on your recent assessment, "Data Structures & Algorithms" was assigned to your priority roadmap.',
      type: 'course',
      link: '/learning'
    },
    {
      id: 'notif-2',
      userId: 'usr-student-1',
      title: '🔥 15-Day Coding Streak Active',
      message: 'Keep your momentum going! Complete today’s challenge to protect your streak.',
      type: 'streak',
      link: '/coding'
    },
    {
      id: 'notif-3',
      userId: 'usr-student-1',
      title: 'Shortlisted by Nexus Technologies',
      message: 'Your application for Cloud Systems Software Engineering Intern has advanced to Shortlisted!',
      type: 'opportunity',
      link: '/opportunities'
    }
  ];

  // 8. SEED STEP 8: LESSON-WISE AI MOCK TESTS & QUESTIONS
  const mockTests = [
    {
      id: 'mt-py-1',
      title: 'Python Ecosystem & Syntax Fundamentals Assessment',
      description: 'Test your grasp of Python bytecode, virtual environments, PEP 8 standards, and interpreter execution mechanics.',
      courseId: 'crs-py-201',
      moduleId: 'mod-py-1',
      lessonId: 'les-py-1',
      difficulty: 'easy',
      durationMinutes: 15,
      totalQuestions: 5,
      totalMarks: 10,
      passingPercentage: 60.0,
      maxAttempts: 3,
      status: 'published'
    },
    {
      id: 'mt-py-2',
      title: 'Python Variables, Data Types & Memory Reference Mock Test',
      description: 'Evaluate your knowledge of mutable vs immutable types, object references in memory, and type conversions.',
      courseId: 'crs-py-201',
      moduleId: 'mod-py-1',
      lessonId: 'les-py-2',
      difficulty: 'medium',
      durationMinutes: 15,
      totalQuestions: 5,
      totalMarks: 10,
      passingPercentage: 60.0,
      maxAttempts: 3,
      status: 'published'
    },
    {
      id: 'mt-py-3',
      title: 'Python Control Flow, Conditionals & Loops Assessment',
      description: 'Comprehensive exam covering boolean logic, ternary operators, loop control (break/continue/else), and range generators.',
      courseId: 'crs-py-201',
      moduleId: 'mod-py-1',
      lessonId: 'les-py-3',
      difficulty: 'medium',
      durationMinutes: 20,
      totalQuestions: 5,
      totalMarks: 10,
      passingPercentage: 60.0,
      maxAttempts: 3,
      status: 'published'
    },
    {
      id: 'mt-dsa-1',
      title: 'Array Fundamentals & Time Complexity Assessment',
      description: 'Test your grasp of contiguous memory layout, random access, dynamic array resizing amortized complexity, and linear scanning.',
      courseId: 'crs-dsa-101',
      moduleId: 'mod-dsa-1',
      lessonId: 'les-dsa-1',
      difficulty: 'medium',
      durationMinutes: 20,
      totalQuestions: 5,
      totalMarks: 10,
      passingPercentage: 60.0,
      maxAttempts: 3,
      status: 'published'
    }
  ];

  for (const mt of mockTests) {
    execute(`
      INSERT OR REPLACE INTO mock_tests (
        id, title, description, course_id, module_id, lesson_id, difficulty,
        duration_minutes, total_questions, total_marks, passing_percentage, max_attempts, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mt.id, mt.title, mt.description, mt.courseId, mt.moduleId, mt.lessonId, mt.difficulty,
      mt.durationMinutes, mt.totalQuestions, mt.totalMarks, mt.passingPercentage, mt.maxAttempts, mt.status
    ]);
  }

  // Seed questions for mt-py-3 (Control flow)
  const questionsPY3 = [
    {
      id: 'q-py3-1',
      mockTestId: 'mt-py-3',
      questionType: 'MCQ',
      questionText: 'What is the output of the following Python expression?\n\nprint(True or False and False)',
      options: ['True', 'False', 'None', 'SyntaxError'],
      correctAnswer: 'True',
      explanation: 'In Python operator precedence, `and` has higher precedence than `or`. Therefore `False and False` evaluates to False first, and `True or False` evaluates to True.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'medium',
      orderIndex: 1
    },
    {
      id: 'q-py3-2',
      mockTestId: 'mt-py-3',
      questionType: 'MSQ',
      questionText: 'Which of the following statements about loops in Python are correct? (Select all that apply)',
      options: [
        'A while loop executes continuously as long as its condition remains True.',
        'The `break` statement immediately exits the active loop.',
        'The `continue` statement skips to the next iteration of the loop.',
        'Python for loops can only iterate through numbers, not strings or lists.'
      ],
      correctAnswer: JSON.stringify([
        'A while loop executes continuously as long as its condition remains True.',
        'The `break` statement immediately exits the active loop.',
        'The `continue` statement skips to the next iteration of the loop.'
      ]),
      explanation: 'Python for loops can iterate over any iterable sequence, including strings, lists, dictionaries, tuples, and custom generators.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'medium',
      orderIndex: 2
    },
    {
      id: 'q-py3-3',
      mockTestId: 'mt-py-3',
      questionType: 'TRUE_FALSE',
      questionText: 'In Python, the `else` clause of a `for` loop executes ONLY if the loop finishes without encountering a `break` statement.',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Python loops feature an optional `else` block which fires upon normal loop completion, but is bypassed if terminated early via `break`.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'easy',
      orderIndex: 3
    },
    {
      id: 'q-py3-4',
      mockTestId: 'mt-py-3',
      questionType: 'SHORT_ANSWER',
      questionText: 'Explain the difference between `break` and `continue` keywords inside a loop.',
      options: [],
      correctAnswer: '`break` immediately terminates and exits the entire loop, jumping to code outside the loop block. In contrast, `continue` only skips the rest of the current iteration and advances directly to the next cycle.',
      explanation: '`break` halts the entire loop; `continue` skips the remainder of the current iteration and proceeds to the next.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'medium',
      orderIndex: 4
    },
    {
      id: 'q-py3-5',
      mockTestId: 'mt-py-3',
      questionType: 'MCQ',
      questionText: 'What sequence is produced by `list(range(1, 10, 3))`?',
      options: ['[1, 4, 7]', '[1, 3, 6, 9]', '[1, 4, 7, 10]', '[3, 6, 9]'],
      correctAnswer: '[1, 4, 7]',
      explanation: 'The range starts at 1, steps by 3 (1, 4, 7), and halts before reaching the stop boundary 10.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'easy',
      orderIndex: 5
    }
  ];

  for (const q of questionsPY3) {
    execute(`
      INSERT OR REPLACE INTO mock_test_questions (
        id, mock_test_id, question_type, question_text, options_json, correct_answer,
        explanation, marks, skill_id, difficulty, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      q.id, q.mockTestId, q.questionType, q.questionText, JSON.stringify(q.options),
      q.correctAnswer, q.explanation, q.marks, q.skillId, q.difficulty, q.orderIndex
    ]);
  }

  // Seed questions for mt-py-1 (Ecosystem & Syntax)
  const questionsPY1 = [
    {
      id: 'q-py1-1',
      mockTestId: 'mt-py-1',
      questionType: 'MCQ',
      questionText: 'Which tool is standard in Python 3 for creating isolated lightweight environment directories?',
      options: ['venv', 'pyisolate', 'pipmgr', 'pyenv-dir'],
      correctAnswer: 'venv',
      explanation: 'The `venv` module has been Python’s built-in standard tool for creating isolated virtual environments since Python 3.3.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'easy',
      orderIndex: 1
    },
    {
      id: 'q-py1-2',
      mockTestId: 'mt-py-1',
      questionType: 'TRUE_FALSE',
      questionText: 'Python compiles source code (`.py`) into bytecode (`.pyc`) before executing it on the Python Virtual Machine (PVM).',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'CPython first compiles human-readable `.py` source into intermediate bytecode, which is then executed by the stack-based PVM.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'easy',
      orderIndex: 2
    },
    {
      id: 'q-py1-3',
      mockTestId: 'mt-py-1',
      questionType: 'MSQ',
      questionText: 'According to official PEP 8 guidelines, which naming conventions are recommended? (Select all that apply)',
      options: [
        'snake_case for functions and variables',
        'PascalCase (CapWords) for class names',
        'ALL_CAPS with underscores for module constants',
        'kebab-case for function names'
      ],
      correctAnswer: JSON.stringify([
        'snake_case for functions and variables',
        'PascalCase (CapWords) for class names',
        'ALL_CAPS with underscores for module constants'
      ]),
      explanation: 'PEP 8 specifies snake_case for functions/variables, PascalCase for classes, and SCREAMING_SNAKE_CASE for constants. Kebab-case is invalid syntax in Python.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'medium',
      orderIndex: 3
    },
    {
      id: 'q-py1-4',
      mockTestId: 'mt-py-1',
      questionType: 'SHORT_ANSWER',
      questionText: 'What is the primary benefit of using a virtual environment for a Python project?',
      options: [],
      correctAnswer: 'A virtual environment isolates project dependencies, libraries, and package versions from the global system and other projects, preventing version conflicts.',
      explanation: 'Virtual environments ensure dependency isolation, reproducible deployments, and prevent package version conflicts across multiple projects.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'easy',
      orderIndex: 4
    },
    {
      id: 'q-py1-5',
      mockTestId: 'mt-py-1',
      questionType: 'MCQ',
      questionText: 'Which command installs dependencies listed in a standard `requirements.txt` file?',
      options: ['pip install -r requirements.txt', 'python get requirements.txt', 'pip update requirements.txt', 'python -m install reqs'],
      correctAnswer: 'pip install -r requirements.txt',
      explanation: 'The `-r` flag instructs pip to read and install all packages declared inside the specified requirements file.',
      marks: 2,
      skillId: 'skl-py',
      difficulty: 'easy',
      orderIndex: 5
    }
  ];

  for (const q of questionsPY1) {
    execute(`
      INSERT OR REPLACE INTO mock_test_questions (
        id, mock_test_id, question_type, question_text, options_json, correct_answer,
        explanation, marks, skill_id, difficulty, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      q.id, q.mockTestId, q.questionType, q.questionText, JSON.stringify(q.options),
      q.correctAnswer, q.explanation, q.marks, q.skillId, q.difficulty, q.orderIndex
    ]);
  }

  // Seed sample completed attempt for usr-student-1 on mt-py-1 (Passed with 8/10, 80%)
  execute(`
    INSERT OR REPLACE INTO mock_test_attempts (
      id, mock_test_id, student_id, attempt_number, started_at, submitted_at, time_taken_seconds,
      status, total_marks, earned_marks, percentage, passed, suspicious_event_count, ai_feedback_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'atm-py-1',
    'mt-py-1',
    'usr-student-1',
    1,
    '2026-09-09 14:25:00',
    '2026-09-09 14:35:00',
    600,
    'submitted',
    10,
    8.0,
    80.0,
    1,
    0,
    JSON.stringify({
      strengths: ['Strong command of Python environment tools', 'Mastery of PEP 8 conventions'],
      weakConcepts: ['Bytecode caching internals'],
      commonMistakes: ['Rushing pip command flags'],
      recommendedRevision: ['Review how CPython optimizes .pyc cache files'],
      suggestedLesson: { id: 'les-py-1', title: 'Introduction to Python' },
      nextDifficulty: 'medium',
      motivationMessage: 'Outstanding start! You have a solid grasp of Python fundamentals.',
      nextAction: 'Continue to Variables and Data Types.'
    })
  ]);

  // Seed skill results for atm-py-1
  execute(`
    INSERT OR REPLACE INTO test_skill_results (
      id, attempt_id, skill_id, earned_marks, maximum_marks, percentage, correct_count, incorrect_count, unanswered_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'tsr-py-1',
    'atm-py-1',
    'skl-py',
    8.0,
    10.0,
    80.0,
    4,
    1,
    0
  ]);

  // ==========================================
  // 9. SEED STEP 9: CODING PRACTICE & AUTO-EVALUATION
  // ==========================================
  console.log('[Seed] Seeding Step 9: Coding Problems & Test Cases...');

  const codingProblems = [
    {
      id: 'cp-1',
      title: 'Find the Greater Number',
      description: 'Read two integers a and b from standard input, and output the greater number. If both numbers are equal, output either one.',
      difficulty: 'easy',
      topic: 'Conditional Statements',
      supportedLanguages: ['python', 'c', 'cpp'],
      inputFormat: 'Two whitespace-separated integers a and b on a single line.',
      outputFormat: 'Print the greater integer on a single line.',
      constraints: '-10^9 <= a, b <= 10^9',
      sampleInput: '10 20',
      sampleOutput: '20',
      explanation: 'Comparing 10 and 20: 20 is strictly greater than 10, so 20 is printed.',
      functionSignature: 'def solve(a: int, b: int) -> int',
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      starterCode: {
        python: `import sys\n\ndef solve():\n    data = sys.stdin.read().split()\n    if not data:\n        return\n    a = int(data[0])\n    b = int(data[1])\n    # Write your logic here\n    if a >= b:\n        print(a)\n    else:\n        print(b)\n\nif __name__ == '__main__':\n    solve()\n`,
        c: `#include <stdio.h>\n\nint main() {\n    long long a, b;\n    if (scanf("%lld %lld", &a, &b) == 2) {\n        // Write your logic here\n        if (a >= b) {\n            printf("%lld\\n", a);\n        } else {\n            printf("%lld\\n", b);\n        }\n    }\n    return 0;\n}\n`,
        cpp: `#include <iostream>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    long long a, b;\n    if (cin >> a >> b) {\n        // Write your logic here\n        cout << max(a, b) << endl;\n    }\n    return 0;\n}\n`
      },
      testCases: [
        { id: 'tc-1-1', input: '10 20', expectedOutput: '20', isPublic: 1, marks: 25, orderIndex: 1 },
        { id: 'tc-1-2', input: '50 5', expectedOutput: '50', isPublic: 1, marks: 25, orderIndex: 2 },
        { id: 'tc-1-3', input: '-15 -3', expectedOutput: '-3', isPublic: 0, marks: 25, orderIndex: 3 },
        { id: 'tc-1-4', input: '100 100', expectedOutput: '100', isPublic: 0, marks: 25, orderIndex: 4 }
      ]
    },
    {
      id: 'cp-2',
      title: 'Sum of Array Elements',
      description: 'Given an array of N integers, compute and output the sum of all elements.',
      difficulty: 'easy',
      topic: 'Arrays & Loops',
      supportedLanguages: ['python', 'c', 'cpp'],
      inputFormat: 'First line contains integer N (number of elements). Second line contains N whitespace-separated integers.',
      outputFormat: 'Print the total sum on a single line.',
      constraints: '1 <= N <= 10^5, -10^4 <= arr[i] <= 10^4',
      sampleInput: '5\n1 2 3 4 5',
      sampleOutput: '15',
      explanation: 'Sum = 1 + 2 + 3 + 4 + 5 = 15.',
      functionSignature: 'def sum_array(n: int, arr: list) -> int',
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      starterCode: {
        python: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines:\n        return\n    n = int(lines[0])\n    nums = [int(x) for x in lines[1:n+1]]\n    # Write your logic here\n    print(sum(nums))\n\nif __name__ == '__main__':\n    solve()\n`,
        c: `#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        long long total = 0;\n        for (int i = 0; i < n; i++) {\n            long long val;\n            scanf("%lld", &val);\n            total += val;\n        }\n        printf("%lld\\n", total);\n    }\n    return 0;\n}\n`,
        cpp: `#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nint main() {\n    int n;\n    if (cin >> n) {\n        long long total = 0;\n        for (int i = 0; i < n; i++) {\n            long long val;\n            cin >> val;\n            total += val;\n        }\n        cout << total << endl;\n    }\n    return 0;\n}\n`
      },
      testCases: [
        { id: 'tc-2-1', input: '5\n1 2 3 4 5', expectedOutput: '15', isPublic: 1, marks: 25, orderIndex: 1 },
        { id: 'tc-2-2', input: '3\n10 20 30', expectedOutput: '60', isPublic: 1, marks: 25, orderIndex: 2 },
        { id: 'tc-2-3', input: '4\n-1 -2 -3 -4', expectedOutput: '-10', isPublic: 0, marks: 25, orderIndex: 3 },
        { id: 'tc-2-4', input: '1\n42', expectedOutput: '42', isPublic: 0, marks: 25, orderIndex: 4 }
      ]
    },
    {
      id: 'cp-3',
      title: 'Palindrome String Checker',
      description: 'Determine whether a given string is a palindrome (reads the same forwards and backwards). Ignore casing.',
      difficulty: 'easy',
      topic: 'Strings & Two-Pointer',
      supportedLanguages: ['python', 'c', 'cpp'],
      inputFormat: 'A single non-empty word string S.',
      outputFormat: 'Print "YES" if S is a palindrome, otherwise print "NO".',
      constraints: '1 <= length(S) <= 1000',
      sampleInput: 'racecar',
      sampleOutput: 'YES',
      explanation: '"racecar" reversed is "racecar". Hence it is a palindrome.',
      functionSignature: 'def is_palindrome(s: str) -> bool',
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      starterCode: {
        python: `import sys\n\ndef solve():\n    s = sys.stdin.read().strip().lower()\n    if not s:\n        return\n    # Write your logic here\n    if s == s[::-1]:\n        print("YES")\n    else:\n        print("NO")\n\nif __name__ == '__main__':\n    solve()\n`,
        c: `#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\n\nint main() {\n    char s[1005];\n    if (scanf("%s", s) == 1) {\n        int len = strlen(s);\n        int isPal = 1;\n        for (int i = 0; i < len / 2; i++) {\n            if (tolower(s[i]) != tolower(s[len - 1 - i])) {\n                isPal = 0;\n                break;\n            }\n        }\n        printf("%s\\n", isPal ? "YES" : "NO");\n    }\n    return 0;\n}\n`,
        cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        string rev = s;\n        reverse(rev.begin(), rev.end());\n        cout << (s == rev ? "YES" : "NO") << endl;\n    }\n    return 0;\n}\n`
      },
      testCases: [
        { id: 'tc-3-1', input: 'racecar', expectedOutput: 'YES', isPublic: 1, marks: 25, orderIndex: 1 },
        { id: 'tc-3-2', input: 'hello', expectedOutput: 'NO', isPublic: 1, marks: 25, orderIndex: 2 },
        { id: 'tc-3-3', input: 'Madam', expectedOutput: 'YES', isPublic: 0, marks: 25, orderIndex: 3 },
        { id: 'tc-3-4', input: 'SkillBridge', expectedOutput: 'NO', isPublic: 0, marks: 25, orderIndex: 4 }
      ]
    },
    {
      id: 'cp-4',
      title: 'Count Even and Odd Numbers',
      description: 'Given a list of N numbers, count how many numbers are even and how many are odd.',
      difficulty: 'easy',
      topic: 'Conditional Statements & Loops',
      supportedLanguages: ['python', 'c', 'cpp'],
      inputFormat: 'First line integer N. Second line N space-separated integers.',
      outputFormat: 'Print "Even: X, Odd: Y" where X and Y are counts.',
      constraints: '1 <= N <= 10^5, -10^9 <= arr[i] <= 10^9',
      sampleInput: '6\n1 2 3 4 5 6',
      sampleOutput: 'Even: 3, Odd: 3',
      explanation: 'Even numbers are 2, 4, 6 (count=3). Odd numbers are 1, 3, 5 (count=3).',
      functionSignature: 'def count_even_odd(nums: list)',
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      starterCode: {
        python: `import sys\n\ndef solve():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        return\n    n = int(tokens[0])\n    nums = [int(x) for x in tokens[1:n+1]]\n    evens = sum(1 for x in nums if x % 2 == 0)\n    odds = len(nums) - evens\n    print(f"Even: {evens}, Odd: {odds}")\n\nif __name__ == '__main__':\n    solve()\n`,
        c: `#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        int evens = 0, odds = 0;\n        for (int i = 0; i < n; i++) {\n            long long val;\n            scanf("%lld", &val);\n            if (val % 2 == 0) evens++;\n            else odds++;\n        }\n        printf("Even: %d, Odd: %d\\n", evens, odds);\n    }\n    return 0;\n}\n`,
        cpp: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n    int n;\n    if (cin >> n) {\n        int evens = 0, odds = 0;\n        for (int i = 0; i < n; i++) {\n            long long val;\n            cin >> val;\n            if (val % 2 == 0) evens++;\n            else odds++;\n        }\n        cout << "Even: " << evens << ", Odd: " << odds << endl;\n    }\n    return 0;\n}\n`
      },
      testCases: [
        { id: 'tc-4-1', input: '6\n1 2 3 4 5 6', expectedOutput: 'Even: 3, Odd: 3', isPublic: 1, marks: 25, orderIndex: 1 },
        { id: 'tc-4-2', input: '3\n2 4 8', expectedOutput: 'Even: 3, Odd: 0', isPublic: 1, marks: 25, orderIndex: 2 },
        { id: 'tc-4-3', input: '3\n1 3 5', expectedOutput: 'Even: 0, Odd: 3', isPublic: 0, marks: 25, orderIndex: 3 },
        { id: 'tc-4-4', input: '1\n0', expectedOutput: 'Even: 1, Odd: 0', isPublic: 0, marks: 25, orderIndex: 4 }
      ]
    },
    {
      id: 'cp-5',
      title: 'Two Sum Target Pair',
      description: 'Given an array of N integers and a target sum T, determine whether there exist two distinct elements in the array whose sum equals T.',
      difficulty: 'medium',
      topic: 'Data Structures & Algorithms',
      supportedLanguages: ['python', 'c', 'cpp'],
      inputFormat: 'First line contains two integers N and T. Second line contains N whitespace-separated integers.',
      outputFormat: 'Print "FOUND" if such a pair exists, otherwise print "NOT FOUND".',
      constraints: '2 <= N <= 10^5, -10^9 <= arr[i], T <= 10^9',
      sampleInput: '4 9\n2 7 11 15',
      sampleOutput: 'FOUND',
      explanation: 'Elements 2 and 7 add up to 9 (target), so FOUND is printed.',
      functionSignature: 'def two_sum(nums: list, target: int) -> bool',
      timeLimitMs: 2000,
      memoryLimitMb: 128,
      starterCode: {
        python: `import sys\n\ndef solve():\n    tokens = sys.stdin.read().split()\n    if not tokens:\n        return\n    n = int(tokens[0])\n    target = int(tokens[1])\n    nums = [int(x) for x in tokens[2:n+2]]\n    seen = set()\n    for x in nums:\n        if target - x in seen:\n            print("FOUND")\n            return\n        seen.add(x)\n    print("NOT FOUND")\n\nif __name__ == '__main__':\n    solve()\n`,
        c: `#include <stdio.h>\n#include <stdlib.h>\n\n// For C, sort and two-pointer or hash\nint main() {\n    int n;\n    long long target;\n    if (scanf("%d %lld", &n, &target) == 2) {\n        long long arr[1000];\n        for (int i = 0; i < n; i++) scanf("%lld", &arr[i]);\n        int found = 0;\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                if (arr[i] + arr[j] == target) { found = 1; break; }\n            }\n            if (found) break;\n        }\n        printf("%s\\n", found ? "FOUND" : "NOT FOUND");\n    }\n    return 0;\n}\n`,
        cpp: `#include <iostream>\n#include <vector>\n#include <unordered_set>\n\nusing namespace std;\n\nint main() {\n    int n;\n    long long target;\n    if (cin >> n >> target) {\n        unordered_set<long long> seen;\n        bool found = false;\n        for (int i = 0; i < n; i++) {\n            long long val;\n            cin >> val;\n            if (seen.count(target - val)) found = true;\n            seen.insert(val);\n        }\n        cout << (found ? "FOUND" : "NOT FOUND") << endl;\n    }\n    return 0;\n}\n`
      },
      testCases: [
        { id: 'tc-5-1', input: '4 9\n2 7 11 15', expectedOutput: 'FOUND', isPublic: 1, marks: 25, orderIndex: 1 },
        { id: 'tc-5-2', input: '3 10\n1 2 3', expectedOutput: 'NOT FOUND', isPublic: 1, marks: 25, orderIndex: 2 },
        { id: 'tc-5-3', input: '5 0\n-5 2 3 5 8', expectedOutput: 'FOUND', isPublic: 0, marks: 25, orderIndex: 3 },
        { id: 'tc-5-4', input: '2 6\n3 3', expectedOutput: 'FOUND', isPublic: 0, marks: 25, orderIndex: 4 }
      ]
    }
  ];

  for (const cp of codingProblems) {
    execute(
      `INSERT OR REPLACE INTO coding_problems (
        id, title, description, difficulty, topic, supported_languages_json,
        input_format, output_format, constraints, sample_input, sample_output,
        explanation, starter_code_json, function_signature, time_limit_ms,
        memory_limit_mb, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cp.id,
        cp.title,
        cp.description,
        cp.difficulty,
        cp.topic,
        JSON.stringify(cp.supportedLanguages),
        cp.inputFormat,
        cp.outputFormat,
        cp.constraints,
        cp.sampleInput,
        cp.sampleOutput,
        cp.explanation,
        JSON.stringify(cp.starterCode),
        cp.functionSignature,
        cp.timeLimitMs,
        cp.memoryLimitMb,
        'published'
      ]
    );

    for (const tc of cp.testCases) {
      execute(
        `INSERT OR REPLACE INTO coding_test_cases (
          id, problem_id, input, expected_output, is_public, marks, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tc.id, cp.id, tc.input, tc.expectedOutput, tc.isPublic, tc.marks, tc.orderIndex]
      );
    }
  }

  // Seed initial Coding Streak & Activity for usr-student-1
  const today = new Date().toISOString().split('T')[0];
  const calendarHistory = [
    { date: '2026-09-10', count: 2 },
    { date: '2026-09-11', count: 3 },
    { date: today, count: 1 }
  ];
  const badgesEarned = [
    { id: 'b-streak-3', title: '🔥 3-Day Flame Streak', desc: 'Maintained consistency for 3 continuous coding days.' },
    { id: 'b-first-solve', title: '⭐ First Breakthrough', desc: 'Submitted an accepted algorithmic solution with 100% test accuracy.' }
  ];

  execute(
    `INSERT OR REPLACE INTO coding_streaks (
      id, student_id, current_streak, longest_streak, total_active_days,
      last_activity_date, streak_calendar_json, badges_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'strk-usr-student-1',
      'usr-student-1',
      3,
      7,
      12,
      today,
      JSON.stringify(calendarHistory),
      JSON.stringify(badgesEarned)
    ]
  );

  // Seed a sample accepted submission for cp-1 for usr-student-1
  execute(
    `INSERT OR REPLACE INTO coding_submissions (
      id, student_id, problem_id, language, source_code, status, score,
      passed_test_cases, total_test_cases, execution_time_ms, memory_used_mb,
      compiler_output, runtime_output, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'sub-seed-1',
      'usr-student-1',
      'cp-1',
      'python',
      `import sys\n\ndef solve():\n    data = sys.stdin.read().split()\n    if not data:\n        return\n    a = int(data[0])\n    b = int(data[1])\n    print(max(a, b))\n\nif __name__ == '__main__':\n    solve()`,
      'ACCEPTED',
      100.0,
      4,
      4,
      48,
      14.2,
      null,
      '20',
      '2026-09-11 16:30:00'
    ]
  );

  // Seed skill evidence for usr-student-1
  execute(
    `INSERT OR REPLACE INTO coding_skill_evidence (
      id, student_id, problem_id, submission_id, skill_id, score, difficulty, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['cse-seed-1', 'usr-student-1', 'cp-1', 'sub-seed-1', 'skl-py', 100.0, 'easy', '2026-09-11 16:30:00']
  );

  // =========================================================================
  // 13. SEED STEP 10: COMMUNICATION AND LANGUAGE LEARNING SYSTEM
  // =========================================================================

  // 13.1 Communication Languages
  const commLanguages = [
    {
      id: 'lang-en',
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flagEmoji: '🇬🇧',
      description: 'Global business, technical discussions, international interviews, presentation mastery, and placement fluency.',
      difficultyRating: 'medium',
      status: 'active'
    },
    {
      id: 'lang-ja',
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagEmoji: '🇯🇵',
      description: 'IT industry communication, polite business keigo (敬語), JLPT foundational readiness, and Japanese tech culture.',
      difficultyRating: 'hard',
      status: 'active'
    },
    {
      id: 'lang-de',
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      flagEmoji: '🇩🇪',
      description: 'Engineering terminology, professional workplace German, DACH engineering placements, and structured tech discourse.',
      difficultyRating: 'medium',
      status: 'active'
    }
  ];

  for (const lang of commLanguages) {
    execute(
      `INSERT OR REPLACE INTO communication_languages (
        id, code, name, native_name, flag_emoji, description, difficulty_rating, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [lang.id, lang.code, lang.name, lang.nativeName, lang.flagEmoji, lang.description, lang.difficultyRating, lang.status]
    );
  }

  // 13.2 Student Language Tracks for usr-student-1
  const studentLangs = [
    {
      id: 'st-lang-en-1',
      studentId: 'usr-student-1',
      languageId: 'lang-en',
      currentLevel: 3,
      levelName: 'Level 3 — Developing',
      overallScore: 72.5,
      speakingScore: 70.0,
      listeningScore: 78.0,
      readingScore: 80.0,
      writingScore: 72.0,
      grammarScore: 74.0,
      vocabularyScore: 75.0,
      pronunciationScore: 68.0,
      conversationScore: 69.0,
      completedLessonsCount: 4,
      practiceSessionsCount: 14
    },
    {
      id: 'st-lang-ja-1',
      studentId: 'usr-student-1',
      languageId: 'lang-ja',
      currentLevel: 1,
      levelName: 'Level 1 — Beginner',
      overallScore: 35.0,
      speakingScore: 25.0,
      listeningScore: 40.0,
      readingScore: 38.0,
      writingScore: 30.0,
      grammarScore: 35.0,
      vocabularyScore: 42.0,
      pronunciationScore: 30.0,
      conversationScore: 22.0,
      completedLessonsCount: 1,
      practiceSessionsCount: 3
    },
    {
      id: 'st-lang-de-1',
      studentId: 'usr-student-1',
      languageId: 'lang-de',
      currentLevel: 1,
      levelName: 'Level 1 — Beginner',
      overallScore: 28.0,
      speakingScore: 20.0,
      listeningScore: 30.0,
      readingScore: 35.0,
      writingScore: 25.0,
      grammarScore: 30.0,
      vocabularyScore: 32.0,
      pronunciationScore: 22.0,
      conversationScore: 18.0,
      completedLessonsCount: 0,
      practiceSessionsCount: 1
    }
  ];

  for (const sl of studentLangs) {
    execute(
      `INSERT OR REPLACE INTO student_languages (
        id, student_id, language_id, current_level, level_name, overall_score,
        speaking_score, listening_score, reading_score, writing_score,
        grammar_score, vocabulary_score, pronunciation_score, conversation_score,
        completed_lessons_count, practice_sessions_count, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        sl.id, sl.studentId, sl.languageId, sl.currentLevel, sl.levelName, sl.overallScore,
        sl.speakingScore, sl.listeningScore, sl.readingScore, sl.writingScore,
        sl.grammarScore, sl.vocabularyScore, sl.pronunciationScore, sl.conversationScore,
        sl.completedLessonsCount, sl.practiceSessionsCount
      ]
    );
  }

  // 13.3 Communication Lessons
  const commLessons = [
    // English Lessons
    {
      id: 'comm-les-en-1',
      languageId: 'lang-en',
      skillId: 'skl-en',
      title: 'Elevator Pitch & Self-Introduction for Tech Interviews',
      category: 'Daily Communication',
      difficulty: 'easy',
      lessonType: 'speaking',
      description: 'Craft a structured 60-90 second introduction covering education, technical strengths, flagship projects, and career drive.',
      orderIndex: 1,
      estimatedMinutes: 15,
      content: {
        overview: 'A winning self-introduction should balance clarity, conciseness, and relevant technical context.',
        framework: 'Present -> Past -> Future (Who you are now, what key engineering experience you have, and what you aim to achieve).',
        sampleDialogue: [
          { speaker: 'Interviewer', text: 'Hello Alex, please tell us a little bit about yourself.' },
          { speaker: 'Candidate', text: 'Hi! I am a final-year Computer Science student passionate about scalable distributed systems. Recently, I built an automated microservices platform using Node.js and Redis that reduced query latency by 35%. I am eager to apply my skills to high-performance web systems.' }
        ],
        keyPhrases: [
          'I am currently pursuing my degree in...',
          'My primary technical focus has been on...',
          'One of my proudest achievements was building...',
          'I am passionate about tackling challenges in scalable architecture.'
        ],
        speakingPrompts: [
          'Introduce yourself in 60 seconds focusing on your primary technical stack and latest project.'
        ],
        quiz: [
          {
            question: 'What is the most effective structure for an engineering self-introduction?',
            options: ['Chronological life story from childhood', 'Present, Past, Future framework', 'Only list grades and GPAs', 'Repeat your resume line by line'],
            correctIndex: 1,
            explanation: 'The Present-Past-Future framework gives interviewers a clear snapshot of where you are now, what you built, and what you want to achieve.'
          }
        ]
      }
    },
    {
      id: 'comm-les-en-2',
      languageId: 'lang-en',
      skillId: 'skl-en',
      title: 'Tenses in Technical Explanations & Project Debriefs',
      category: 'Grammar',
      difficulty: 'easy',
      lessonType: 'grammar',
      description: 'Master the distinction between Past Simple (completed past steps) and Present Perfect (ongoing impact or achievements).',
      orderIndex: 2,
      estimatedMinutes: 20,
      content: {
        overview: 'Many engineering candidates confuse past actions with current system states. Precision in verb tenses conveys confidence and technical rigor.',
        grammarRules: [
          { rule: 'Past Simple', usage: 'Use for specific, completed events in the past (e.g., "We refactored the database schema last quarter").' },
          { rule: 'Present Perfect', usage: 'Use for actions with continuing relevance or unspecified time (e.g., "We have reduced API response times across all services").' },
          { rule: 'Present Simple', usage: 'Use for architectural truths and system facts (e.g., "The cache expires every 10 minutes").' }
        ],
        practiceExercises: [
          { sentence: 'Last year, our team ___ (migrate) our legacy monolithic service to Kubernetes.', answer: 'migrated' },
          { sentence: 'Since deploying the new index, we ___ (observe) zero deadlock errors.', answer: 'have observed' }
        ],
        quiz: [
          {
            question: 'Choose the correct sentence to describe a completed project last month:',
            options: [
              'We have finished the refactoring yesterday.',
              'We finished the refactoring last month and benchmarked the results.',
              'We are finishing the refactoring since last month.',
              'We had finish the refactoring last month.'
            ],
            correctIndex: 1,
            explanation: 'Past simple ("finished", "benchmarked") must be used with specific completed past time markers like "last month".'
          }
        ]
      }
    },
    {
      id: 'comm-les-en-3',
      languageId: 'lang-en',
      skillId: 'skl-en',
      title: 'High-Impact Engineering Vocabulary & Action Verbs',
      category: 'Vocabulary',
      difficulty: 'medium',
      lessonType: 'vocabulary',
      description: 'Replace generic words like "did" and "worked on" with precision verbs: Architected, Streamlined, Spearheaded, Diagnosed, and Mitigated.',
      orderIndex: 3,
      estimatedMinutes: 20,
      content: {
        overview: 'Strong action verbs demonstrate ownership, technical acumen, and measurable leadership in resume points and interview narratives.',
        words: [
          { word: 'Spearheaded', meaning: 'Led an initiative or project from conception to completion.', example: 'Spearheaded the migration of the core authentication pipeline.' },
          { word: 'Mitigated', meaning: 'Reduced the severity, risk, or negative impact of something.', example: 'Mitigated denial-of-service vulnerabilities by implementing rate limiting.' },
          { word: 'Streamlined', meaning: 'Optimized a process to make it simpler, faster, and more efficient.', example: 'Streamlined CI/CD build execution time from 18 minutes to 4 minutes.' },
          { word: 'Diagnosed', meaning: 'Investigated and pinpointed the root cause of an issue.', example: 'Diagnosed an asynchronous memory leak using heap profiler snapshots.' }
        ],
        quiz: [
          {
            question: 'Which word best replaces "fixed" in: "I fixed the system security flaw before launch"?',
            options: ['Did', 'Mitigated', 'Happened', 'Looked at'],
            correctIndex: 1,
            explanation: '"Mitigated" or "Resolved" indicates high-level professional competence and technical clarity.'
          }
        ]
      }
    },
    {
      id: 'comm-les-en-4',
      languageId: 'lang-en',
      skillId: 'skl-en',
      title: 'Professional Engineering Emails & Incident Escalations',
      category: 'Professional Communication',
      difficulty: 'medium',
      lessonType: 'writing',
      description: 'Draft crisp, actionable workplace communications, bug reports, pull request summaries, and postmortem communications.',
      orderIndex: 4,
      estimatedMinutes: 25,
      content: {
        overview: 'Clear written communication is a top differentiator for senior software engineers and team players.',
        guidelines: [
          'BLUF Principle: Put the Bottom Line Up Front in the opening sentence.',
          'Action items with direct assignees and deadlines.',
          'Bullet points for system metrics, repro steps, and error logs.'
        ],
        writingPrompts: [
          'Draft an email to your engineering lead explaining that a production API deployment is causing 502 errors and outlining your rollback plan.'
        ],
        sampleTemplate: 'Hi Team,\n\nBLUF: We have initiated a rollback of Release v2.4.1 due to elevated 502 errors on the checkout endpoint.\n\nRoot Cause: Database connection pool exhaustion during peak load.\nImpact: ~4% of checkout requests failed between 14:00 and 14:12 UTC.\nNext Steps:\n1. Alex to complete rollback verification by 14:25.\n2. Sarah to post a detailed postmortem document by EOD.'
      }
    },
    {
      id: 'comm-les-en-5',
      languageId: 'lang-en',
      skillId: 'skl-en',
      title: 'Mastering the STAR Method in Behavioral Interviews',
      category: 'Interview Communication',
      difficulty: 'hard',
      lessonType: 'conversation',
      description: 'Structure answers to questions like "Tell me about a time you faced a technical conflict" using Situation, Task, Action, and Result.',
      orderIndex: 5,
      estimatedMinutes: 30,
      content: {
        overview: 'Behavioral rounds evaluate teamwork, problem-solving under pressure, ownership, and emotional intelligence.',
        starFramework: {
          Situation: 'Set the context (15%): company, project, constraint.',
          Task: 'Explain your personal responsibility (10%): what you were asked to solve.',
          Action: 'Detail specific technical and interpersonal actions you took (60%): tools used, decisions made.',
          Result: 'Share quantifiable outcomes and key learnings (15%): metrics, impact, team growth.'
        },
        sampleQuestion: 'Tell me about a time you had to deal with a tight project deadline with incomplete specifications.'
      }
    },
    {
      id: 'comm-les-en-6',
      languageId: 'lang-en',
      skillId: 'skl-en',
      title: 'Active Listening in Agile Sprint Standups',
      category: 'Listening',
      difficulty: 'medium',
      lessonType: 'listening',
      description: 'Train your ear to detect dependencies, implicit blockers, and key technical handoffs in rapid engineering conversations.',
      orderIndex: 6,
      estimatedMinutes: 15,
      content: {
        overview: 'Effective team members listen not just to respond, but to identify cross-functional blockers and system dependencies.',
        audioSimulations: [
          { speaker: 'DevOps Lead', text: 'Hey team, the staging cluster will undergo a rolling kernel patch at 3 PM. Anyone deploying to staging needs to pause jobs between 3:00 and 3:30.' }
        ],
        quiz: [
          {
            question: 'Based on the standup announcement, what action must engineers take between 3:00 PM and 3:30 PM?',
            options: ['Deploy all urgent code changes', 'Pause all deployments to the staging cluster', 'Take the production database offline', 'Submit PR reviews'],
            correctIndex: 1,
            explanation: 'The speaker explicitly mentioned pausing staging jobs during the 3:00 to 3:30 kernel update window.'
          }
        ]
      }
    },
    {
      id: 'comm-les-en-7',
      languageId: 'lang-en',
      skillId: 'skl-en',
      title: 'Critical Reading of Architectural RFCs & Design Docs',
      category: 'Reading',
      difficulty: 'medium',
      lessonType: 'reading',
      description: 'Quickly synthesize engineering RFCs, identify non-functional constraints, assess scalability trade-offs, and note security implications.',
      orderIndex: 7,
      estimatedMinutes: 20,
      content: {
        overview: 'Engineers spend more time reading specs, documentation, and RFCs than writing greenfield code.',
        readingPassage: 'RFC-408: Decoupling Billing with Event Streams. We propose replacing synchronous RPC billing calls with an Apache Kafka event bus. Pros: High durability, zero HTTP blocking for end-users. Cons: Eventual consistency means the client receipt page requires WebSocket polling to confirm payment status.',
        quiz: [
          {
            question: 'What is the primary trade-off of the proposed Kafka architecture in RFC-408?',
            options: ['Higher latency for the checkout button', 'Eventual consistency requiring client polling for payment receipts', 'Loss of all message durability', 'Inability to handle peak loads'],
            correctIndex: 1,
            explanation: 'The RFC states that eventual consistency requires WebSocket polling on the receipt page.'
          }
        ]
      }
    },

    // Japanese Lessons
    {
      id: 'comm-les-ja-1',
      languageId: 'lang-ja',
      skillId: 'skl-ja',
      title: 'Jikoshoukai: Self-Introduction in Japanese (自己紹介)',
      category: 'Daily Communication',
      difficulty: 'easy',
      lessonType: 'speaking',
      description: 'Learn the formal structure for introducing yourself to Japanese engineering teams, mentors, and interviewers.',
      orderIndex: 1,
      estimatedMinutes: 20,
      content: {
        overview: 'Japanese introductions follow a clear cultural etiquette: greeting, name/background, technical interests, and closing etiquette.',
        sampleDialogue: [
          { speaker: 'Candidate', text: 'はじめまして。アレックスと申します。大学でコンピュータサイエンスを専攻しております。主にウェブ開発とデータベースを勉強しています。どうぞよろしくお願いいたします。' },
          { speaker: 'Interviewer', text: 'よろしくお願いします。どのような技術に興味がありますか？' }
        ],
        keyPhrases: [
          'はじめまして (Hajimemashite - Nice to meet you)',
          '〜と申します (~ to moushimasu - My name is...)',
          '〜を専攻しております (~ o senkou shite orimasu - I major in...)',
          'どうぞよろしくお願いいたします (Douzo yoroshiku onegai itashimasu - Please treat me favorably)'
        ],
        quiz: [
          {
            question: 'What is the polite phrase used to conclude a Japanese self-introduction?',
            options: ['さようなら (Sayounara)', 'どうぞよろしくお願いいたします (Douzo yoroshiku onegai itashimasu)', 'いただきます (Itadakimasu)', 'どういたしまして (Dou itashimashite)'],
            correctIndex: 1,
            explanation: 'どうぞよろしくお願いいたします is the universal formal closing phrase expressing cooperation and respect.'
          }
        ]
      }
    },
    {
      id: 'comm-les-ja-2',
      languageId: 'lang-ja',
      skillId: 'skl-ja',
      title: 'Essential Japanese Sentence Structure (です / ます)',
      category: 'Grammar',
      difficulty: 'easy',
      lessonType: 'grammar',
      description: 'Master polite verb conjugations (Desu / Masu form) and subject-object-verb word order in workplace dialogues.',
      orderIndex: 2,
      estimatedMinutes: 25,
      content: {
        overview: 'Japanese grammar places the verb at the end of the sentence (SOV: Subject-Object-Verb). In business contexts, polite forms are mandatory.',
        grammarRules: [
          { rule: 'SOV Order', usage: '私は (Subject) + Pythonを (Object) + 勉強します (Verb).' },
          { rule: 'Polite Present/Future', usage: 'Verb stem + ます (e.g., 作ります - to make / will make).' },
          { rule: 'Polite Past', usage: 'Verb stem + ました (e.g., 作成しました - created / completed).' }
        ],
        quiz: [
          {
            question: 'Which sentence correctly says "I developed a web application" in polite Japanese?',
            options: [
              'ウェブアプリを作ります。 (Web app o tsukurimasu)',
              'ウェブアプリを開発しました。 (Web app o kaihatsu shimashita)',
              '私は開発ですアプリ。 (Watashi wa kaihatsu desu app)',
              'アプリは作りました私。 (App wa tsukurimashita watashi)'
            ],
            correctIndex: 1,
            explanation: '開発しました (kaihatsu shimashita) is the correct polite past tense of "to develop".'
          }
        ]
      }
    },
    {
      id: 'comm-les-ja-3',
      languageId: 'lang-ja',
      skillId: 'skl-ja',
      title: 'Key IT & Workplace Words (IT用語とビジネスマナー)',
      category: 'Vocabulary',
      difficulty: 'easy',
      lessonType: 'vocabulary',
      description: 'Learn katakana IT terminology (デプロイ, バグ, 仕様書) and daily workplace etiquette phrases.',
      orderIndex: 3,
      estimatedMinutes: 20,
      content: {
        overview: 'The Japanese tech industry heavily uses katakana loanwords alongside traditional business etiquette terminology.',
        words: [
          { word: 'バグ (Bagu)', meaning: 'Software bug / defect.', example: 'バグを修正しました。(I fixed the bug.)' },
          { word: 'デプロイ (Depuroi)', meaning: 'Deployment.', example: '本番環境にデプロイします。(Deploying to production.)' },
          { word: '仕様書 (Shiyousho)', meaning: 'Technical specifications document.', example: '仕様書を確認してください。(Please review the specification document.)' },
          { word: 'お疲れ様です (Otsukaresama desu)', meaning: 'Thank you for your hard work (standard workplace greeting).', example: '皆さん、お疲れ様です。(Good job everyone / Hello team.)' }
        ],
        quiz: [
          {
            question: 'What is the standard greeting used between colleagues in a Japanese tech office?',
            options: ['お元気ですか (Ogenki desu ka)', 'お疲れ様です (Otsukaresama desu)', 'おはようございました (Ohayou gozaimashita)', 'さようなら (Sayounara)'],
            correctIndex: 1,
            explanation: 'お疲れ様です (Otsukaresama desu) is the indispensable daily greeting acknowledging teamwork.'
          }
        ]
      }
    },
    {
      id: 'comm-les-ja-4',
      languageId: 'lang-ja',
      skillId: 'skl-ja',
      title: 'Aisatsu & Keigo in the Tech Office (挨拶とビジネス敬語)',
      category: 'Professional Communication',
      difficulty: 'medium',
      lessonType: 'conversation',
      description: 'Navigate daily standups, report task progress (Hou-Ren-So), and speak respectfully with seniors and clients.',
      orderIndex: 4,
      estimatedMinutes: 30,
      content: {
        overview: 'Hou-Ren-So (報・連・相: Report, Communicate, Consult) is the backbone of Japanese engineering collaboration.',
        keyConcepts: [
          '報告 (Houkoku - Report): Share finished work and metrics immediately.',
          '連絡 (Renraku - Communicate): Keep team informed of upcoming schedules or changes.',
          '相談 (Soudan - Consult): Ask questions early before blockers delay deadlines.'
        ]
      }
    },

    // German Lessons
    {
      id: 'comm-les-de-1',
      languageId: 'lang-de',
      skillId: 'skl-de',
      title: 'Sich vorstellen: Professional Self-Introduction in German',
      category: 'Daily Communication',
      difficulty: 'easy',
      lessonType: 'speaking',
      description: 'Introduce your engineering background, university degree, and technical passions in clear German.',
      orderIndex: 1,
      estimatedMinutes: 20,
      content: {
        overview: 'In German professional introductions, be clear, structured, and focused on facts and competencies.',
        sampleDialogue: [
          { speaker: 'Interviewer', text: 'Guten Tag! Können Sie sich bitte kurz vorstellen?' },
          { speaker: 'Candidate', text: 'Guten Tag! Mein Name ist Alex Rivera. Ich studiere Informatik im letzten Studienjahr. Ich entwickle leidenschaftlich gern Webservices mit TypeScript und Python. Ich freue mich auf das Gespräch.' }
        ],
        keyPhrases: [
          'Mein Name ist... (My name is...)',
          'Ich studiere Informatik an der... (I study Computer Science at...)',
          'Ich habe Erfahrung mit... (I have experience with...)',
          'Vielen Dank für Ihre Zeit. (Thank you for your time.)'
        ],
        quiz: [
          {
            question: 'How do you politely introduce your name in a German technical interview?',
            options: ['Mein Name ist Alex. / Ich heiße Alex.', 'Ich habe Alex.', 'Ich machen Alex.', 'Mein Name Alex sein.'],
            correctIndex: 0,
            explanation: '"Mein Name ist..." or "Ich heiße..." are standard, grammatically correct ways to state your name.'
          }
        ]
      }
    },
    {
      id: 'comm-les-de-2',
      languageId: 'lang-de',
      skillId: 'skl-de',
      title: 'Verb Conjugations & Word Order in German (V2 Rule)',
      category: 'Grammar',
      difficulty: 'easy',
      lessonType: 'grammar',
      description: 'Master the Verb-Second (V2) rule in main clauses and verb-final word order in subordinate clauses (weil, dass).',
      orderIndex: 2,
      estimatedMinutes: 25,
      content: {
        overview: 'In German main clauses, the conjugated verb MUST always occupy the second position.',
        rules: [
          { rule: 'Main Clause (V2)', example: 'Heute optimiere ich die Datenbankabfragen. (Today I optimize the database queries.)' },
          { rule: 'Subordinate Clause (Verb-End)', example: '...weil ich die Systemarchitektur verbessern möchte. (...because I want to improve system architecture.)' }
        ],
        quiz: [
          {
            question: 'Which sentence correctly follows German word order with an adverb of time at the beginning?',
            options: [
              'Heute ich lerne Python.',
              'Heute lerne ich Python.',
              'Heute lerne Python ich.',
              'Lerne heute ich Python.'
            ],
            correctIndex: 1,
            explanation: 'Under the V2 rule, when an element like "Heute" takes position 1, the conjugated verb "lerne" must take position 2.'
          }
        ]
      }
    },
    {
      id: 'comm-les-de-3',
      languageId: 'lang-de',
      skillId: 'skl-de',
      title: 'Essential Tech & Office Vocabulary (Technik & Arbeitsplatz)',
      category: 'Vocabulary',
      difficulty: 'easy',
      lessonType: 'vocabulary',
      description: 'Key engineering terms, compound nouns, and everyday office vocabulary used in German engineering teams.',
      orderIndex: 3,
      estimatedMinutes: 20,
      content: {
        overview: 'German engineering uses precise compound nouns. Learning their gender and plural patterns builds solid fluency.',
        words: [
          { word: 'Die Softwareentwicklung', meaning: 'Software development.', example: 'Softwareentwicklung erfordert Präzision.' },
          { word: 'Die Datenbankabfrage', meaning: 'Database query.', example: 'Die Datenbankabfrage dauert nur 12 Millisekunden.' },
          { word: 'Die Fehlerbehebung', meaning: 'Troubleshooting / bug fixing.', example: 'Die Fehlerbehebung wurde erfolgreich abgeschlossen.' },
          { word: 'Der Quellcode', meaning: 'Source code.', example: 'Der Quellcode ist im Git-Repository verfügbar.' }
        ],
        quiz: [
          {
            question: 'What is the German term for "troubleshooting" or "bug fixing"?',
            options: ['Die Fehlerbehebung', 'Die Quellcode', 'Das Programmieren', 'Die Schnittstelle'],
            correctIndex: 0,
            explanation: '"Die Fehlerbehebung" literally translates to error remedy / troubleshooting.'
          }
        ]
      }
    },
    {
      id: 'comm-les-de-4',
      languageId: 'lang-de',
      skillId: 'skl-de',
      title: 'Workplace German: Standup Meetings & Status Updates',
      category: 'Professional Communication',
      difficulty: 'medium',
      lessonType: 'conversation',
      description: 'Report progress, identify blockers, and collaborate on pull requests using polite workplace German.',
      orderIndex: 4,
      estimatedMinutes: 30,
      content: {
        overview: 'In German tech culture, meetings are punctual, direct, and structured around facts and solutions.',
        sampleDialogue: [
          { speaker: 'Scrum Master', text: 'Alex, wie ist der Stand beim Authentifizierungsmodul?' },
          { speaker: 'Alex', text: 'Gestern habe ich die OAuth2-Schnittstelle implementiert. Heute führe ich die Integrationstests durch. Ich habe derzeit keine Blocker.' }
        ]
      }
    }
  ];

  for (const cl of commLessons) {
    execute(
      `INSERT OR REPLACE INTO communication_lessons (
        id, language_id, title, description, category, skill_id,
        difficulty, lesson_type, content_json, order_index, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      [
        cl.id, cl.languageId, cl.title, cl.description, cl.category, cl.skillId,
        cl.difficulty, cl.lessonType, JSON.stringify(cl.content), cl.orderIndex
      ]
    );
  }

  // 13.4 Communication Streak & Badge Seed for usr-student-1
  const commCalendarHistory = [
    { date: '2026-09-09', count: 1 },
    { date: '2026-09-10', count: 2 },
    { date: '2026-09-11', count: 3 },
    { date: today, count: 1 }
  ];
  const commBadgesEarned = [
    { id: 'b-comm-3', title: '🗣️ Fluent Voice', desc: 'Maintained 3 consecutive days of speaking and conversation practice.' },
    { id: 'b-vocab-master', title: '📚 Vocabulary Pro', desc: 'Mastered high-frequency technical and placement terms.' }
  ];

  execute(
    `INSERT OR REPLACE INTO communication_streaks (
      id, student_id, user_id, current_streak, longest_streak, total_active_days,
      last_activity_date, streak_calendar_json, badges_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'cstrk-usr-student-1',
      'usr-student-1',
      'usr-student-1',
      4,
      8,
      14,
      today,
      JSON.stringify(commCalendarHistory),
      JSON.stringify(commBadgesEarned)
    ]
  );

  // 13.5 Seed baseline diagnostic assessment for usr-student-1 in English
  execute(
    `INSERT OR REPLACE INTO communication_assessments (
      id, student_id, language_id, assessment_type, overall_score,
      speaking_score, listening_score, reading_score, writing_score,
      grammar_score, vocabulary_score, pronunciation_score, conversation_score,
      level, level_name, ai_evaluation_json, questions_json, answers_json,
      status, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      'comm-asmt-en-init',
      'usr-student-1',
      'lang-en',
      'DIAGNOSTIC_BASELINE',
      72.5,
      70.0, 78.0, 80.0, 72.0, 74.0, 75.0, 68.0, 69.0,
      3,
      'Level 3 — Developing',
      JSON.stringify({
        summary: 'Solid foundational and developing proficiency with strong reading and listening comprehension. Speaking fluency and spontaneous conversation need focused refinement.',
        strengths: [
          'High grammatical accuracy in technical descriptions',
          'Good vocabulary retention for software engineering terms',
          'Strong comprehension of complex written requirements'
        ],
        growthAreas: [
          'Reduce hesitation pauses during spontaneous conversational follow-ups',
          'Refine pronunciation and intonation on polysyllabic terminology',
          'Increase confidence in answering behavioral STAR questions'
        ],
        recommendations: [
          'Practice 15 minutes of AI conversation in Placement Mode daily',
          'Review the STAR Method lesson before technical interview simulations',
          'Record voice responses to improve pronunciation clarity'
        ]
      }),
      '[]',
      '[]',
      'completed'
    ]
  );

  // 13.6 Seed sub-skill results for English
  const enSubSkills = [
    { skillId: 'skl-en', category: 'speaking', score: 70.0 },
    { skillId: 'skl-en', category: 'listening', score: 78.0 },
    { skillId: 'skl-en', category: 'reading', score: 80.0 },
    { skillId: 'skl-en', category: 'writing', score: 72.0 },
    { skillId: 'skl-en', category: 'grammar', score: 74.0 },
    { skillId: 'skl-en', category: 'vocabulary', score: 75.0 },
    { skillId: 'skl-en', category: 'pronunciation', score: 68.0 },
    { skillId: 'skl-en', category: 'conversation', score: 69.0 }
  ];

  for (let i = 0; i < enSubSkills.length; i++) {
    const ss = enSubSkills[i];
    execute(
      `INSERT OR REPLACE INTO communication_skill_results (
        id, assessment_id, student_id, skill_id, category, score, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`csr-en-${i + 1}`, 'comm-asmt-en-init', 'usr-student-1', ss.skillId, ss.category, ss.score, 'High']
    );
  }

  // 13.7 Seed initial conversation session
  execute(
    `INSERT OR REPLACE INTO conversation_sessions (
      id, student_id, language_id, mode, topic, difficulty,
      total_messages, duration_seconds, overall_score, feedback_json, status, started_at, ended_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      'conv-sess-1',
      'usr-student-1',
      'lang-en',
      'placement',
      'Technical Self-Introduction & Project Deep-Dive',
      'medium',
      4,
      480,
      74.0,
      JSON.stringify({
        overallFeedback: 'Clear explanation of technical projects. Minor grammatical errors when switching between past and present tenses.',
        strengths: ['Great articulation of system architecture', 'Kept answers concise and structured'],
        improvements: ['Watch subject-verb agreement under pressure', 'Expand vocabulary when describing edge-case handling']
      }),
      'completed'
    ]
  );

  // 13.8 Seed sample conversation turns for session 1
  const sampleTurns = [
    {
      id: 'turn-1',
      sender: 'ai',
      text: "Hello Alex! Welcome to your Placement Interview Practice. Could you start by introducing yourself and highlighting your primary technical stack?",
      relevance: 100,
      grammarCorrection: null,
      vocabularyNote: null
    },
    {
      id: 'turn-2',
      sender: 'student',
      text: "Hi! My name is Alex and I study Computer Science. I specialize in backend systems using Node.js, Python, and PostgreSQL.",
      relevance: 95,
      grammarCorrection: "Clear and direct sentence construction.",
      vocabularyNote: "Good usage of 'specialize in'."
    },
    {
      id: 'turn-3',
      sender: 'ai',
      text: "That's great, Alex. Tell me about a challenging backend bug or scaling bottleneck you encountered recently and how you resolved it.",
      relevance: 100,
      grammarCorrection: null,
      vocabularyNote: null
    },
    {
      id: 'turn-4',
      sender: 'student',
      text: "In my recent project, we had high latency when multiple users queried the search API. I investigated the logs, found unindexed foreign keys, and added B-tree indices which decreased response times by 60%.",
      relevance: 98,
      grammarCorrection: "Accurate use of past tense verbs ('investigated', 'found', 'decreased').",
      vocabularyNote: "Excellent technical precision ('unindexed foreign keys', 'B-tree indices')."
    }
  ];

  for (const t of sampleTurns) {
    execute(
      `INSERT OR REPLACE INTO conversation_session_messages (
        id, session_id, sender, message_text, transcript_reference, grammar_correction, vocabulary_note, relevance_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, 'conv-sess-1', t.sender, t.text, null, t.grammarCorrection, t.vocabularyNote, t.relevance]
    );
  }

  // 13.9 Seed sample writing response for usr-student-1
  execute(
    `INSERT OR REPLACE INTO writing_responses (
      id, student_id, language_id, activity_id, prompt, answer,
      word_count, overall_score, grammar_score, vocabulary_score,
      clarity_score, ai_feedback_json, suggested_answer
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'wr-seed-1',
      'usr-student-1',
      'lang-en',
      null,
      'Draft an email to your engineering lead explaining that a production API deployment is causing 502 errors and outlining your rollback plan.',
      'Hi team, the new deployment from today has 502 error for users who checkout. We think the db pool is full. We are going to rollback to the last version in 10 minutes and check logs. Please let me know if you have questions.',
      43,
      74.5,
      72.0,
      70.0,
      76.0,
      JSON.stringify({
        overview: 'Good sense of urgency and direct explanation. Can be enhanced with formal incident terminology and BLUF structure.',
        grammarNotes: ['"has 502 error" -> "is returning 502 Bad Gateway errors"', '"in 10 minutes" -> specify exact timestamps for team clarity.'],
        vocabularySuggestions: ['Use "initiated a rollback" instead of "going to rollback".', 'Use "database connection pool exhaustion" instead of "db pool is full".']
      }),
      'Hi Lead and Engineering Team,\n\nBLUF: We are initiating an immediate rollback of Release v2.4.1 due to elevated 502 Bad Gateway errors observed on the checkout endpoint.\n\nPreliminary Root Cause: Database connection pool exhaustion under sustained concurrency.\nImpact: Approximately 4% of customer checkout requests failed over the past 15 minutes.\nAction Plan:\n1. Alex to execute rollback to v2.4.0 by 14:25 UTC.\n2. Engineering to review pool sizing configurations prior to redeployment.\n\nBest regards,\nAlex Rivera'
    ]
  );

  // ==========================================================================
  // 14. SEED STEP 11: OPPORTUNITY MARKETPLACE
  // ==========================================================================
  console.log('[Seed] Seeding Step 11 Opportunity Marketplace...');

  const now = new Date();
  const dayMs = 86400000;
  const isoPlusDays = (days: number) => new Date(now.getTime() + days * dayMs).toISOString();

  const opportunities = [
    {
      id: 'opp-1',
      title: 'Backend Engineering Intern (Python / FastAPI)',
      type: 'INTERNSHIP',
      company_name: 'Apex Cloud Systems',
      company_logo: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=120&q=80',
      description: 'Apex Cloud Systems is looking for an energetic Backend Engineering Intern to join our Distributed Systems group. You will architect high-performance asynchronous REST endpoints, write clean unit and integration tests, and collaborate with Senior Engineers on distributed Redis caching and database query optimization.\n\nResponsibilities:\n- Design and implement scalable RESTful APIs using Python & FastAPI.\n- Benchmark endpoint latency and resolve database bottlenecks.\n- Collaborate on Git feature branches, participate in rigorous code reviews, and deploy microservices.',
      short_description: 'Build high-throughput Python and FastAPI backend microservices for global cloud infrastructure.',
      required_skills_json: JSON.stringify(['Python', 'SQL', 'REST APIs', 'Git']),
      preferred_skills_json: JSON.stringify(['FastAPI', 'Docker', 'Redis', 'PostgreSQL']),
      eligibility_criteria: 'Pre-final or Final Year engineering students with strong fundamentals in Python and relational databases.',
      qualification: 'B.Tech / B.E / M.Tech / MCA',
      branch: 'Computer Science, IT, Software Engineering or related',
      minimum_year: 3,
      maximum_year: 4,
      location: 'Bengaluru / Remote',
      work_mode: 'REMOTE',
      stipend: '₹25,000 / month',
      salary_range: 'PPO Offer: ₹8.0 - 12.0 LPA',
      duration: '6 Months',
      start_date: isoPlusDays(14),
      end_date: isoPlusDays(194),
      application_deadline: isoPlusDays(10),
      apply_url: 'https://apexsystems.example.com/careers/backend-intern',
      registration_url: null,
      contact_email: 'careers@apexsystems.example.com',
      contact_phone: '+91 80 4123 4567',
      posted_by: 'usr-recruiter-1',
      company_id: 'comp-1',
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 1
    },
    {
      id: 'opp-2',
      title: 'Frontend Developer Intern (React & TypeScript)',
      type: 'INTERNSHIP',
      company_name: 'NovaTech Digital Labs',
      company_logo: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&w=120&q=80',
      description: 'Join NovaTech Digital Labs as a Frontend Developer Intern. We are designing next-generation analytics dashboards and high-converting modern web interfaces using React, TypeScript, and modern CSS design systems.\n\nKey Tasks:\n- Build responsive, accessible, and polished UI components.\n- Integrate backend GraphQL and REST endpoints seamlessly.\n- Optimize web vitals and client-side rendering performance.',
      short_description: 'Design responsive, premium user interfaces with React, TypeScript, and modern design systems.',
      required_skills_json: JSON.stringify(['React', 'TypeScript', 'HTML/CSS', 'UI/UX']),
      preferred_skills_json: JSON.stringify(['TailwindCSS', 'Vite', 'State Management']),
      eligibility_criteria: 'Enthusiastic web developers with demonstrable frontend projects or active GitHub repositories.',
      qualification: 'B.Tech, B.Sc Computer Science, BCA, MCA',
      branch: 'Any Engineering / Tech discipline',
      minimum_year: 2,
      maximum_year: 4,
      location: 'Bengaluru, Karnataka',
      work_mode: 'HYBRID',
      stipend: '₹20,000 / month',
      salary_range: 'PPO Opportunity: ₹6.5 - 9.0 LPA',
      duration: '3 Months',
      start_date: isoPlusDays(10),
      end_date: isoPlusDays(100),
      application_deadline: isoPlusDays(5),
      apply_url: 'https://novatech.example.com/jobs/react-intern',
      registration_url: null,
      contact_email: 'hiring@novatech.example.com',
      contact_phone: '+91 80 5566 7788',
      posted_by: 'usr-recruiter-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 1
    },
    {
      id: 'opp-3',
      title: 'Cloud DevOps & Platform Engineering Intern',
      type: 'INTERNSHIP',
      company_name: 'InfraScale Global',
      company_logo: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=120&q=80',
      description: 'InfraScale provides automated multi-cloud deployment platforms. As an intern, you will gain hands-on experience containerizing enterprise services with Docker, building automated GitHub Actions CI/CD pipelines, and monitoring Kubernetes clusters.',
      short_description: 'Automate containerized deployments with Docker, Linux, and GitHub Actions CI/CD.',
      required_skills_json: JSON.stringify(['Docker', 'Linux', 'Python', 'CI/CD']),
      preferred_skills_json: JSON.stringify(['Kubernetes', 'AWS', 'Bash scripting', 'Terraform']),
      eligibility_criteria: 'Knowledge of Linux command line, networking basics, and containerization.',
      qualification: 'B.E / B.Tech / BCA / MCA',
      branch: 'CS / IT / ECE',
      minimum_year: 3,
      maximum_year: 4,
      location: 'Remote (Pan India)',
      work_mode: 'REMOTE',
      stipend: '₹30,000 / month',
      salary_range: '₹9.0 - 14.0 LPA Full-time',
      duration: '6 Months',
      start_date: isoPlusDays(20),
      end_date: isoPlusDays(200),
      application_deadline: isoPlusDays(15),
      apply_url: 'https://infrascale.example.com/apply/devops-intern',
      registration_url: null,
      contact_email: 'devops-hiring@infrascale.example.com',
      contact_phone: '+91 22 9876 5432',
      posted_by: 'usr-admin-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 0
    },
    {
      id: 'opp-4',
      title: 'Data Science & Machine Learning Intern',
      type: 'INTERNSHIP',
      company_name: 'NeuralMetric Analytics',
      company_logo: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=120&q=80',
      description: 'NeuralMetric builds predictive risk models for FinTech and healthcare enterprise clients. We are seeking an analytical intern to clean big datasets, engineer predictive features, and train supervised machine learning models.',
      short_description: 'Analyze real-world datasets, build predictive models, and deploy Python ML pipelines.',
      required_skills_json: JSON.stringify(['Python', 'Machine Learning', 'Pandas', 'SQL']),
      preferred_skills_json: JSON.stringify(['Scikit-Learn', 'NumPy', 'Data Visualization', 'Feature Engineering']),
      eligibility_criteria: 'Minimum 65% aggregate with strong probability and linear algebra grasp.',
      qualification: 'B.Tech / M.Tech / Data Science / MCA',
      branch: 'CS, IT, Data Science, AI/ML',
      minimum_year: 3,
      maximum_year: 4,
      location: 'Hyderabad, Telangana',
      work_mode: 'ONSITE',
      stipend: '₹22,000 / month',
      salary_range: '₹7.0 - 10.5 LPA',
      duration: '4 Months',
      start_date: isoPlusDays(12),
      end_date: isoPlusDays(132),
      application_deadline: isoPlusDays(7),
      apply_url: 'https://neuralmetric.example.com/careers/data-science',
      registration_url: null,
      contact_email: 'talents@neuralmetric.example.com',
      contact_phone: '+91 40 4455 6677',
      posted_by: 'usr-admin-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 0
    },
    {
      id: 'opp-5',
      title: 'Associate Software Engineer — Campus Placement 2026',
      type: 'JOB',
      company_name: 'TCS Digital / Infosys Technologies',
      company_logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=120&q=80',
      description: 'Comprehensive campus placement opportunity for 2026 graduates. You will be trained in core enterprise application engineering, cloud microservices, and full-stack software development with competitive compensation and rapid promotion tracks.',
      short_description: 'Full-time campus engineering role for 2026 graduates with end-to-end cloud and software training.',
      required_skills_json: JSON.stringify(['Data Structures', 'Python', 'Java', 'Communication']),
      preferred_skills_json: JSON.stringify(['Database Systems', 'Algorithms', 'Teamwork']),
      eligibility_criteria: '2026 Batch Graduates with minimum 6.0 CGPA / 60% in 10th, 12th and Graduation with no active backlogs.',
      qualification: 'B.E. / B.Tech / M.Tech / MCA / M.Sc Computer Science',
      branch: 'All Engineering Branches Eligible',
      minimum_year: 4,
      maximum_year: 4,
      location: 'Pune / Bengaluru / Hyderabad',
      work_mode: 'ONSITE',
      stipend: null,
      salary_range: '₹6.5 - 9.0 LPA',
      duration: 'Full Time',
      start_date: isoPlusDays(90),
      end_date: null,
      application_deadline: isoPlusDays(25),
      apply_url: 'https://careers.enterprise-tech.example.com/apply/ase2026',
      registration_url: null,
      contact_email: 'campusrecruitment@enterprise-tech.example.com',
      contact_phone: '+91 20 6677 8899',
      posted_by: 'usr-recruiter-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 1
    },
    {
      id: 'opp-6',
      title: 'Junior Full-Stack Engineer (Node.js & React)',
      type: 'JOB',
      company_name: 'AccelOps Digital Products',
      company_logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=120&q=80',
      description: 'Fast-growing SaaS startup developing workflow automation solutions. You will own full product features end-to-end from database migrations to responsive React frontends.',
      short_description: 'Build end-to-end features using Node.js, Express, PostgreSQL, and React for a modern SaaS product.',
      required_skills_json: JSON.stringify(['Node.js', 'React', 'SQL', 'REST APIs']),
      preferred_skills_json: JSON.stringify(['TypeScript', 'PostgreSQL', 'TailwindCSS']),
      eligibility_criteria: 'Graduating 2025 or 2026, proficiency with modern JavaScript / TypeScript web stacks.',
      qualification: 'B.Tech / B.E / BCA / MCA',
      branch: 'CS, IT, Software Engineering',
      minimum_year: 4,
      maximum_year: 4,
      location: 'Mumbai, Maharashtra',
      work_mode: 'HYBRID',
      stipend: null,
      salary_range: '₹7.0 - 10.0 LPA',
      duration: 'Full Time',
      start_date: isoPlusDays(45),
      end_date: null,
      application_deadline: isoPlusDays(18),
      apply_url: 'https://accelops.example.com/careers/junior-fullstack',
      registration_url: null,
      contact_email: 'careers@accelops.example.com',
      contact_phone: '+91 22 4000 8899',
      posted_by: 'usr-recruiter-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 0
    },
    {
      id: 'opp-7',
      title: 'Systems Software Engineer (C & C++)',
      type: 'JOB',
      company_name: 'CoreKernel High-Performance Systems',
      company_logo: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=120&q=80',
      description: 'Develop low-latency networking drivers, embedded telemetry agents, and high-performance system utilities written in modern C and C++.',
      short_description: 'Low-latency systems development, memory-mapped data structures, and multithreading in C/C++.',
      required_skills_json: JSON.stringify(['C', 'C++', 'Linux', 'Networking']),
      preferred_skills_json: JSON.stringify(['GDB Debugging', 'Socket Programming', 'Multithreading']),
      eligibility_criteria: 'Excellent understanding of operating systems, memory management, pointers, and POSIX threads.',
      qualification: 'B.Tech / B.E / M.Tech in CS, IT, ECE',
      branch: 'Computer Science, Electronics, IT',
      minimum_year: 4,
      maximum_year: 4,
      location: 'Bengaluru, Karnataka',
      work_mode: 'ONSITE',
      stipend: null,
      salary_range: '₹8.5 - 12.0 LPA',
      duration: 'Full Time',
      start_date: isoPlusDays(60),
      end_date: null,
      application_deadline: isoPlusDays(30),
      apply_url: 'https://corekernel.example.com/jobs/systems-engineer',
      registration_url: null,
      contact_email: 'engineering@corekernel.example.com',
      contact_phone: '+91 80 7788 9900',
      posted_by: 'usr-admin-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 0
    },
    {
      id: 'opp-8',
      title: 'FinTech High-Scale Graduate Hiring Drive 2026',
      type: 'HIRING_DRIVE',
      company_name: 'Razorpay & FinTech Alliance',
      company_logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=120&q=80',
      description: 'Exclusive multi-company hiring drive for high-growth FinTech companies. Shortlisted students attend fast-tracked online coding assessments followed by virtual technical interview panels within 48 hours.',
      short_description: 'Fast-track hiring drive for top FinTech companies featuring rapid technical interviews and offers.',
      required_skills_json: JSON.stringify(['Data Structures', 'Algorithms', 'System Design', 'Python']),
      preferred_skills_json: JSON.stringify(['Distributed Systems', 'SQL', 'Fast Debugging']),
      eligibility_criteria: 'Final year students (2026 Batch) with proven algorithmic problem-solving capabilities.',
      qualification: 'B.E / B.Tech / Dual Degree',
      branch: 'All Branches Eligible',
      minimum_year: 4,
      maximum_year: 4,
      location: 'Bengaluru / Hybrid',
      work_mode: 'HYBRID',
      stipend: null,
      salary_range: '₹10.0 - 15.0 LPA',
      duration: 'Direct Placement',
      start_date: isoPlusDays(14),
      end_date: isoPlusDays(16),
      application_deadline: isoPlusDays(2), // 2 Days Left!
      apply_url: 'https://fintech-alliance.example.com/hiring-drive-2026',
      registration_url: 'https://fintech-alliance.example.com/register',
      contact_email: 'drives@fintech-alliance.example.com',
      contact_phone: '+91 80 6600 7700',
      posted_by: 'usr-recruiter-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 1
    },
    {
      id: 'opp-9',
      title: 'National Mega Placement Drive 2026',
      type: 'PLACEMENT_DRIVE',
      company_name: 'SkillBridge Corporate Partner Network',
      company_logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=120&q=80',
      description: 'Pan-India virtual placement drive aggregating 40+ leading corporate employers. Includes direct interview shortlists based on verified SkillBridge AI skill report credentials and coding arena scores.',
      short_description: 'Aggregated campus placement drive connecting verified student skill reports with 40+ hiring partners.',
      required_skills_json: JSON.stringify(['Python', 'Problem Solving', 'Aptitude', 'English']),
      preferred_skills_json: JSON.stringify(['Communication Skills', 'SQL', 'Web Tech']),
      eligibility_criteria: 'Students with Level 3 or above on SkillBridge AI Skill Report.',
      qualification: 'All Undergrad & Postgrad Technical Degrees',
      branch: 'All Engineering & BCA/MCA Branches',
      minimum_year: 3,
      maximum_year: 4,
      location: 'Pan-India Virtual',
      work_mode: 'REMOTE',
      stipend: null,
      salary_range: '₹5.5 - 12.5 LPA',
      duration: 'Placement Drive',
      start_date: isoPlusDays(5),
      end_date: isoPlusDays(8),
      application_deadline: isoPlusDays(1), // Closing Tomorrow / Today!
      apply_url: 'https://skillbridge.ai/drives/mega-placement-2026',
      registration_url: 'https://skillbridge.ai/drives/mega-placement-2026/register',
      contact_email: 'placements@skillbridge.ai',
      contact_phone: '+91 11 4050 6070',
      posted_by: 'usr-admin-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 1
    },
    {
      id: 'opp-10',
      title: 'AI Genesis 48-Hour Global Hackathon 2026',
      type: 'HACKATHON',
      company_name: 'OpenTech Foundation & Microsoft Cloud',
      company_logo: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=120&q=80',
      description: 'Build real-world generative AI and full-stack solutions to solve enterprise productivity and accessibility challenges. Win from a prize pool of ₹5,00,000, cloud credits, and direct interview opportunities with sponsoring Tech leads.',
      short_description: 'Compete with 2,000+ developers to build innovative AI applications; ₹5,00,000 in prizes and fast-track interviews.',
      required_skills_json: JSON.stringify(['Python', 'Full Stack', 'Problem Solving', 'Teamwork']),
      preferred_skills_json: JSON.stringify(['AI/ML', 'React', 'FastAPI', 'UI Design']),
      eligibility_criteria: 'Open to all college students. Teams of 2 to 4 members. Single applicants can join matched teams.',
      qualification: 'Any Degree / Year',
      branch: 'Open to all streams',
      minimum_year: 1,
      maximum_year: 4,
      location: 'Virtual / Online Hackathon',
      work_mode: 'REMOTE',
      stipend: '₹5,00,000 Prize Pool',
      salary_range: 'Direct Interview Passes for Finalists',
      duration: '48 Hours Weekend',
      start_date: isoPlusDays(14),
      end_date: isoPlusDays(16),
      application_deadline: isoPlusDays(12),
      apply_url: 'https://aigenesis.example.com/hackathon2026',
      registration_url: 'https://aigenesis.example.com/register',
      contact_email: 'hackathon@aigenesis.example.com',
      contact_phone: '+91 80 9988 1122',
      posted_by: 'usr-admin-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 1
    },
    {
      id: 'opp-11',
      title: 'High-Scale Microservices & Distributed Caching Workshop',
      type: 'WORKSHOP',
      company_name: 'CloudArchitects Guild',
      company_logo: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=120&q=80',
      description: 'A 4-hour hands-on masterclass led by Principal Staff Engineers. You will configure Redis token bucket rate limiters, build distributed pub/sub event streams, and prevent cache stampedes.',
      short_description: 'Master practical distributed system caching, Redis architecture, and rate-limiting hands-on.',
      required_skills_json: JSON.stringify(['System Design', 'Redis', 'Python']),
      preferred_skills_json: JSON.stringify(['Microservices', 'Docker', 'Networking']),
      eligibility_criteria: 'Intermediate understanding of backend APIs and basic database concepts.',
      qualification: 'All Engineering & Computer Applications Students',
      branch: 'CS, IT, Software Engineering',
      minimum_year: 2,
      maximum_year: 4,
      location: 'Live Interactive Webinar',
      work_mode: 'REMOTE',
      stipend: 'Free Certified Workshop',
      salary_range: null,
      duration: '4 Hours (Saturday)',
      start_date: isoPlusDays(4),
      end_date: isoPlusDays(4),
      application_deadline: isoPlusDays(3),
      apply_url: 'https://cloudarchitects.example.com/workshops/redis-microservices',
      registration_url: 'https://cloudarchitects.example.com/register',
      contact_email: 'workshops@cloudarchitects.example.com',
      contact_phone: '+91 22 5566 4433',
      posted_by: 'usr-mentor-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 0
    },
    {
      id: 'opp-12',
      title: 'CodeStrike National Algorithmic Challenge 2026',
      type: 'COMPETITION',
      company_name: 'Indian Computing Society & CodeChef Partner',
      company_logo: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=120&q=80',
      description: 'National competitive programming contest testing speed, memory efficiency, and algorithmic problem-solving in Python, C++, and Java. Top 50 rankers receive direct placement interview referrals.',
      short_description: '3-hour competitive coding showdown. Solve 6 algorithmic problems for medals and placement referrals.',
      required_skills_json: JSON.stringify(['Data Structures', 'Algorithms', 'Python', 'C++']),
      preferred_skills_json: JSON.stringify(['Dynamic Programming', 'Graph Theory', 'Number Theory']),
      eligibility_criteria: 'All college undergraduates eligible. Individual participation.',
      qualification: 'B.Tech / B.E / B.Sc / BCA / MCA',
      branch: 'All Streams',
      minimum_year: 1,
      maximum_year: 4,
      location: 'Online Contest Arena',
      work_mode: 'REMOTE',
      stipend: '₹1,50,000 Cash Prizes + Placement Referrals',
      salary_range: null,
      duration: '3 Hours',
      start_date: isoPlusDays(9),
      end_date: isoPlusDays(9),
      application_deadline: isoPlusDays(8),
      apply_url: 'https://codestrike.example.com/national2026',
      registration_url: 'https://codestrike.example.com/register',
      contact_email: 'contests@codestrike.example.com',
      contact_phone: '+91 11 2345 6789',
      posted_by: 'usr-admin-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 0
    },
    {
      id: 'opp-13',
      title: 'Global Engineering Career Summit & Recruiter Connect',
      type: 'EVENT',
      company_name: 'TechLead Global Community',
      company_logo: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=120&q=80',
      description: 'Keynotes, resume review clinics, mock interview prep, and direct networking booths with hiring managers from Tier-1 tech firms and fast-growing unicorns.',
      short_description: 'Career summit featuring hiring managers, portfolio clinics, and direct networking sessions.',
      required_skills_json: JSON.stringify(['Interview Skills', 'Communication', 'Career Planning']),
      preferred_skills_json: JSON.stringify(['Portfolio Presentation', 'Networking']),
      eligibility_criteria: 'Open to all aspiring software engineers and data practitioners.',
      qualification: 'Any College Degree',
      branch: 'All Disciplines',
      minimum_year: 1,
      maximum_year: 4,
      location: 'Aerocity Convention Center, New Delhi & Virtual Stream',
      work_mode: 'HYBRID',
      stipend: 'Free Admission with RSVP',
      salary_range: null,
      duration: '2 Days',
      start_date: isoPlusDays(16),
      end_date: isoPlusDays(17),
      application_deadline: isoPlusDays(14),
      apply_url: 'https://techleadsummit.example.com/delhi2026',
      registration_url: 'https://techleadsummit.example.com/rsvp',
      contact_email: 'summit@techleadglobal.example.com',
      contact_phone: '+91 11 8899 0011',
      posted_by: 'usr-mentor-1',
      company_id: null,
      status: 'PUBLISHED',
      verification_status: 'VERIFIED',
      is_featured: 0
    },
    {
      id: 'opp-14',
      title: 'Draft & Unapproved Junior Developer Listing (Test Moderation)',
      type: 'JOB',
      company_name: 'Phantom Enterprise Systems',
      company_logo: null,
      description: 'Draft listing submitted by an unverified recruiter awaiting admin moderation.',
      short_description: 'Awaiting moderation review before public marketplace visibility.',
      required_skills_json: JSON.stringify(['Python', 'SQL']),
      preferred_skills_json: JSON.stringify(['Git']),
      eligibility_criteria: 'Entry level.',
      qualification: 'B.Tech',
      branch: 'CS',
      minimum_year: 4,
      maximum_year: 4,
      location: 'Noida, Uttar Pradesh',
      work_mode: 'ONSITE',
      stipend: null,
      salary_range: '₹4.0 - 5.5 LPA',
      duration: 'Full Time',
      start_date: isoPlusDays(30),
      end_date: null,
      application_deadline: isoPlusDays(20),
      apply_url: 'https://phantom.example.com/careers/junior',
      registration_url: null,
      contact_email: 'recruiting@phantom.example.com',
      contact_phone: '+91 120 4455 667',
      posted_by: 'usr-recruiter-1',
      company_id: null,
      status: 'DRAFT',
      verification_status: 'PENDING',
      is_featured: 0
    },
    {
      id: 'opp-15',
      title: 'Expired Spring Engineering Internship',
      type: 'INTERNSHIP',
      company_name: 'Legacy Cloud Solutions',
      company_logo: null,
      description: 'Archived internship listing for past cycle to verify deadline passed alerts and filtering.',
      short_description: 'Past cycle internship listing for testing expiration status.',
      required_skills_json: JSON.stringify(['Python', 'Django']),
      preferred_skills_json: JSON.stringify(['MySQL']),
      eligibility_criteria: 'Past cycle students.',
      qualification: 'B.Tech',
      branch: 'CS/IT',
      minimum_year: 3,
      maximum_year: 4,
      location: 'Chennai, Tamil Nadu',
      work_mode: 'ONSITE',
      stipend: '₹12,000 / month',
      salary_range: null,
      duration: '2 Months',
      start_date: new Date(now.getTime() - 60 * dayMs).toISOString(),
      end_date: new Date(now.getTime() - 10 * dayMs).toISOString(),
      application_deadline: new Date(now.getTime() - 15 * dayMs).toISOString(), // 15 days ago (Passed)
      apply_url: 'https://legacycloud.example.com/apply/expired',
      registration_url: null,
      contact_email: 'jobs@legacycloud.example.com',
      contact_phone: '+91 44 2233 4455',
      posted_by: 'usr-admin-1',
      company_id: null,
      status: 'EXPIRED',
      verification_status: 'VERIFIED',
      is_featured: 0
    }
  ];

  for (const opp of opportunities) {
    try {
      execute(
        `INSERT OR REPLACE INTO opportunities (
          id, title, type, company_name, company_logo, description, short_description,
          required_skills_json, preferred_skills_json, eligibility_criteria, qualification,
          branch, minimum_year, maximum_year, location, work_mode, stipend, salary_range,
          duration, start_date, end_date, application_deadline, apply_url, registration_url,
          contact_email, contact_phone, posted_by, company_id, status, verification_status,
          is_featured, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          opp.id, opp.title, opp.type, opp.company_name, opp.company_logo, opp.description, opp.short_description,
          opp.required_skills_json, opp.preferred_skills_json, opp.eligibility_criteria, opp.qualification,
          opp.branch, opp.minimum_year, opp.maximum_year, opp.location, opp.work_mode, opp.stipend, opp.salary_range,
          opp.duration, opp.start_date, opp.end_date, opp.application_deadline, opp.apply_url, opp.registration_url,
          opp.contact_email, opp.contact_phone, opp.posted_by, opp.company_id, opp.status, opp.verification_status,
          opp.is_featured
        ]
      );
    } catch (err) {
      console.error(`[Seed Error inserting opp ${opp.id}] posted_by: ${opp.posted_by}, company_id: ${opp.company_id}`, err);
      throw err;
    }
  }

  // Seed Saved Opportunities for usr-student-1
  const savedOpps = [
    { id: 'so-1', student_id: 'usr-student-1', opportunity_id: 'opp-1', saved_at: isoPlusDays(-2) },
    { id: 'so-2', student_id: 'usr-student-1', opportunity_id: 'opp-8', saved_at: isoPlusDays(-1) },
    { id: 'so-3', student_id: 'usr-student-1', opportunity_id: 'opp-10', saved_at: isoPlusDays(-3) }
  ];

  for (const so of savedOpps) {
    execute(
      `INSERT OR REPLACE INTO saved_opportunities (id, student_id, opportunity_id, saved_at)
       VALUES (?, ?, ?, ?)`,
      [so.id, so.student_id, so.opportunity_id, so.saved_at]
    );
  }

  // Seed Applications for usr-student-1
  const applications = [
    {
      id: 'app-seed-1',
      student_id: 'usr-student-1',
      opportunity_id: 'opp-1',
      status: 'APPLIED',
      applied_at: isoPlusDays(-3),
      last_updated_at: isoPlusDays(-1),
      notes: 'Applied on company career site. Completed the initial online coding challenge on Python string manipulation and algorithms.',
      application_reference: 'APX-2026-9812'
    },
    {
      id: 'app-seed-2',
      student_id: 'usr-student-1',
      opportunity_id: 'opp-2',
      status: 'INTERESTED',
      applied_at: isoPlusDays(-2),
      last_updated_at: isoPlusDays(-2),
      notes: 'Reviewed job requirements. Need to update GitHub repository readme and live portfolio demo before submitting final application.',
      application_reference: null
    },
    {
      id: 'app-seed-3',
      student_id: 'usr-student-1',
      opportunity_id: 'opp-5',
      status: 'INTERVIEW',
      applied_at: isoPlusDays(-7),
      last_updated_at: isoPlusDays(-1),
      notes: 'Passed the campus aptitude and technical screening round! Virtual technical interview scheduled with the Engineering Director next Tuesday at 3:00 PM.',
      application_reference: 'TCS-DIG-2026-4401'
    }
  ];

  for (const app of applications) {
    execute(
      `INSERT OR REPLACE INTO opportunity_applications (
        id, student_id, opportunity_id, status, applied_at, last_updated_at, notes, application_reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [app.id, app.student_id, app.opportunity_id, app.status, app.applied_at, app.last_updated_at, app.notes, app.application_reference]
    );
  }

  // Seed sample report for admin moderation
  execute(
    `INSERT OR REPLACE INTO opportunity_reports (
      id, reported_by, opportunity_id, reason, description, status, created_at
    ) VALUES (?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)`,
    [
      'rep-seed-1',
      'usr-student-1',
      'opp-15',
      'Expired Link',
      'The application link on the official site states that the Spring 2026 cohort is closed.'
    ]
  );

  // 12. SEED STEP 12: STUDENT OPPORTUNITY PREFERENCES & MATCHING
  execute(
    `INSERT OR REPLACE INTO student_opportunity_preferences (
      id, student_id, preferred_roles_json, preferred_skills_json, preferred_locations_json,
      preferred_work_modes_json, preferred_types_json, minimum_stipend, minimum_salary,
      preferred_industries_json, available_from, preferred_duration, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      'pref-student-1',
      'usr-student-1',
      JSON.stringify(['Software Developer', 'Python Backend Developer', 'Full Stack Engineer', 'Cloud Software Intern']),
      JSON.stringify(['Python', 'SQL', 'REST API', 'JavaScript', 'Problem Solving']),
      JSON.stringify(['Bengaluru', 'Pune', 'Hyderabad', 'Remote']),
      JSON.stringify(['REMOTE', 'HYBRID', 'ONSITE']),
      JSON.stringify(['INTERNSHIP', 'JOB', 'HIRING_DRIVE', 'PLACEMENT_DRIVE', 'HACKATHON']),
      25000,
      600000,
      JSON.stringify(['Cloud Software & AI Systems', 'FinTech', 'SaaS', 'High-Performance Computing']),
      '2026-06-01',
      '6 Months'
    ]
  );

  // Seed sample Preparation Plan for Python Backend Engineer Intern (opp-1)
  const opp1 = queryOne<any>(`SELECT * FROM opportunities WHERE id = 'opp-1'`);
  if (opp1) {
    const opp1Steps = generatePreparationPlan(opp1, ['REST API', 'Git'], ['Python', 'SQL']);
    // Mark first step completed for demonstration
    opp1Steps[0].completed = true;
    execute(
      `INSERT OR REPLACE INTO opportunity_preparation_plans (
        id, student_id, opportunity_id, title, steps_json, progress_percentage, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        'prep-seed-1',
        'usr-student-1',
        'opp-1',
        'Target Role Preparation: Python Backend Engineer Intern',
        JSON.stringify(opp1Steps),
        17, // 1 of 6 steps completed
        'IN_PROGRESS'
      ]
    );
  }

  // Pre-calculate AI Opportunity Matches for demo student
  const matchSummary = recalculateStudentMatches('usr-student-1');
  console.log(`[Seed] Step 12 AI Matching pre-calculated: Best match ${matchSummary.bestMatch}%, ${matchSummary.eligibleCount} eligible opportunities.`);

  // -------------------------------------------------------------
  // Step 13: Seed Mock Interview Sessions & Answers
  // -------------------------------------------------------------
  execute(
    `INSERT OR REPLACE INTO mock_interviews (
      id, student_id, interview_type, target_role, difficulty, mode, question_count, duration,
      status, overall_score, technical_score, communication_score, hr_score, problem_solving_score,
      questions_attempted, questions_skipped, started_at, completed_at, strengths_json, weaknesses_json,
      feedback_summary, recommended_courses_json, recommended_coding_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      'mock-int-seed-1',
      'usr-student-1',
      'TECHNICAL',
      'Python Developer',
      'INTERMEDIATE',
      'TEXT',
      5,
      15,
      'COMPLETED',
      84.0,
      86.0,
      82.0,
      80.0,
      88.0,
      5,
      0,
      '2026-09-13 14:00:00',
      '2026-09-13 14:14:32',
      JSON.stringify(['Strong knowledge of Python memory management', 'Clear understanding of indexing in relational databases', 'Articulate problem-solving structure']),
      JSON.stringify(['Could provide more concrete latency profiling examples', 'Explain cyclic garbage collection thresholds with more detail']),
      'Overall strong performance showing solid foundational knowledge of Python runtime and backend design principles. Ready for junior to mid-level engineering interviews.',
      JSON.stringify(['crs-python-advanced', 'crs-db-systems']),
      JSON.stringify(['cp-1', 'cp-2'])
    ]
  );

  // Questions for mock-int-seed-1
  const questionsData = [
    {
      id: 'iq-1',
      text: 'Explain how Python manages memory, specifically focusing on reference counting and garbage collection cycles.',
      type: 'TECHNICAL',
      seq: 1,
      isFollowUp: 0,
      parentId: null
    },
    {
      id: 'iq-1-fu',
      text: 'How does the cyclic garbage collector detect reference cycles between two objects when their reference count never drops to zero?',
      type: 'TECHNICAL',
      seq: 2,
      isFollowUp: 1,
      parentId: 'iq-1'
    },
    {
      id: 'iq-2',
      text: 'What is the Global Interpreter Lock (GIL) in CPython, and how does it impact CPU-bound versus I/O-bound multithreaded applications?',
      type: 'TECHNICAL',
      seq: 3,
      isFollowUp: 0,
      parentId: null
    },
    {
      id: 'iq-3',
      text: 'How would you diagnose and optimize a database query in a REST API that has a high response latency?',
      type: 'PROBLEM_SOLVING',
      seq: 4,
      isFollowUp: 0,
      parentId: null
    },
    {
      id: 'iq-4',
      text: 'Describe a challenging bug you encountered in a recent project and the structured debugging process you used to resolve it.',
      type: 'PROJECT_EXPLANATION',
      seq: 5,
      isFollowUp: 0,
      parentId: null
    }
  ];

  for (const q of questionsData) {
    execute(
      `INSERT OR REPLACE INTO interview_questions (
        id, interview_id, question_id, question_text, question_type, sequence_number, is_follow_up, parent_question_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [q.id, 'mock-int-seed-1', q.id, q.text, q.type, q.seq, q.isFollowUp, q.parentId]
    );
  }

  // Answers for mock-int-seed-1
  const answersData = [
    {
      id: 'ans-1',
      qId: 'iq-1',
      text: 'Python uses reference counting as its primary memory management mechanism. Every object has an ob_refcnt field tracking references. When the count reaches 0, the memory is immediately deallocated. In addition, CPython uses a generational cyclic garbage collector with three generations to collect circular references.',
      score: 88.0,
      techScore: 90.0,
      commScore: 86.0,
      hrScore: 85.0,
      probScore: 88.0,
      feedback: 'Very clear explanation of reference counting and generational garbage collection.',
      strengths: ['Accurate explanation of ob_refcnt', 'Mentioned generational garbage collection'],
      weaknesses: ['Could mention gc module flags or generation thresholds'],
      missingPoints: ['Generation 0, 1, 2 threshold triggers'],
      structure: 'Direct Answer -> Mechanism Detail -> Generational GC',
      advice: 'Mention how weakref can also help avoid reference cycles.'
    },
    {
      id: 'ans-1-fu',
      qId: 'iq-1-fu',
      text: 'The cyclic garbage collector groups objects into generations and tracks pointers between container objects. It finds unreachable cycles by simulating decrements on reference counts within isolated reference graphs; if an isolated group has no external references pointing in, it is identified as garbage.',
      score: 87.0,
      techScore: 89.0,
      commScore: 85.0,
      hrScore: 84.0,
      probScore: 88.0,
      feedback: 'Demonstrated deep conceptual comprehension of the reachability graph algorithm.',
      strengths: ['Container object identification', 'External pointer deduction model'],
      weaknesses: ['Could briefly mention finalizers (__del__) interaction'],
      missingPoints: ['__del__ finalizer considerations in older Python versions'],
      structure: 'Graph Approach -> Reference Decrement Simulation -> Collection',
      advice: 'Excellent follow-up answer.'
    },
    {
      id: 'ans-2',
      qId: 'iq-2',
      text: 'The GIL is a mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes simultaneously. For CPU-bound tasks, multithreading does not provide true parallelism because threads wait on the GIL mutex; multiprocessing should be used instead. For I/O-bound tasks, threads release the GIL during blocking operations like network requests or file reads, making multithreading effective.',
      score: 86.0,
      techScore: 88.0,
      commScore: 84.0,
      hrScore: 82.0,
      probScore: 86.0,
      feedback: 'Accurately articulated the distinction between CPU-bound and I/O-bound workloads under the GIL.',
      strengths: ['Correct distinction between CPU and I/O workloads', 'Recommended multiprocessing as the alternative'],
      weaknesses: ['Could mention Python 3.12/3.13 free-threaded Python experiments (PEP 703)'],
      missingPoints: ['PEP 703 sub-interpreters or free-threading'],
      structure: 'Definition -> CPU Bound Impact -> I/O Bound Impact -> Alternative Solution',
      advice: 'Strong technical explanation.'
    },
    {
      id: 'ans-3',
      qId: 'iq-3',
      text: 'First, I analyze database slow query logs and use EXPLAIN ANALYZE on PostgreSQL or MySQL to examine the execution plan. I check for missing indexes on filter/foreign key columns, N+1 query patterns in ORM code, and table scans. Then I add appropriate B-Tree composite indexes, rewrite JOINs, paginate large result sets, and implement Redis caching for frequently read, low-mutation endpoints.',
      score: 85.0,
      techScore: 86.0,
      commScore: 84.0,
      hrScore: 82.0,
      probScore: 88.0,
      feedback: 'Practical, production-grade optimization strategy covering profiling, schema indexing, and caching.',
      strengths: ['EXPLAIN ANALYZE workflow', 'Identified ORM N+1 anti-pattern', 'Proposed Redis caching'],
      weaknesses: ['Could mention connection pooling or database replica reads'],
      missingPoints: ['Read replicas or connection pooling'],
      structure: 'Diagnosis -> Execution Plan -> Indexing & Query Optimization -> Caching',
      advice: 'Very solid engineering approach.'
    },
    {
      id: 'ans-4',
      qId: 'iq-4',
      text: 'In our inventory tracker, we had an intermittent concurrency bug where stock levels went negative under load. I reproduced the bug using an automated Locust load test script. Inspecting the code revealed a race condition between reading the stock count and updating it without transactional locking. I resolved this by wrapping the operation in an ACID transaction with SELECT FOR UPDATE row-level locking, and added automated concurrency tests to prevent regression.',
      score: 84.0,
      techScore: 85.0,
      commScore: 83.0,
      hrScore: 84.0,
      probScore: 86.0,
      feedback: 'Demonstrated real-world debugging discipline and solid database transaction fundamentals.',
      strengths: ['Automated reproduction with Locust', 'Correct concurrency fix using SELECT FOR UPDATE'],
      weaknesses: ['Could mention optimistic concurrency control using version numbers as an alternative'],
      missingPoints: ['Optimistic locking trade-offs'],
      structure: 'Context -> Reproduction -> Root Cause Analysis -> Implementation & Prevention',
      advice: 'High-quality STAR story.'
    }
  ];

  for (const a of answersData) {
    execute(
      `INSERT OR REPLACE INTO interview_answers (
        id, interview_id, question_id, student_id, answer_text, score, technical_score,
        communication_score, hr_score, problem_solving_score, feedback, strengths_json,
        weaknesses_json, missing_points_json, suggested_structure, improvement_advice, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        a.id,
        'mock-int-seed-1',
        a.qId,
        'usr-student-1',
        a.text,
        a.score,
        a.techScore,
        a.commScore,
        a.hrScore,
        a.probScore,
        a.feedback,
        JSON.stringify(a.strengths),
        JSON.stringify(a.weaknesses),
        JSON.stringify(a.missingPoints),
        a.structure,
        a.advice
      ]
    );
  }

  // -------------------------------------------------------------
  // Step 14: Seed Mentorship Requests, Sessions & Feedback
  // -------------------------------------------------------------
  execute(
    `INSERT OR REPLACE INTO mentorship_requests (
      id, student_id, mentor_id, topic, description, preferred_date, preferred_time, status, mentor_response, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      'mreq-seed-1',
      'usr-student-1',
      'usr-mentor-1',
      'Interview preparation',
      'Seeking expert guidance on backend engineering interviews, specifically system design and REST API best practices.',
      '2026-09-22',
      '17:00',
      'SCHEDULED',
      'Happy to connect! Let us focus on system architecture, database partitioning, and real-time messaging patterns.'
    ]
  );

  execute(
    `INSERT OR REPLACE INTO mentorship_requests (
      id, student_id, mentor_id, topic, description, preferred_date, preferred_time, status, mentor_response, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      'mreq-seed-2',
      'usr-student-1',
      'usr-mentor-1',
      'Resume preparation',
      'Would love feedback on highlighting my open-source contributions and Python backend projects.',
      '2026-09-10',
      '18:30',
      'COMPLETED',
      'Great session! Your projects demonstrate strong practical skills; make sure to quantify your performance gains.'
    ]
  );

  execute(
    `INSERT OR REPLACE INTO mentor_sessions (
      id, mentor_id, user_id, student_id, topic, slot_time, session_date, session_time, status, meeting_link, notes, feedback_text, rating, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      'msess-seed-1',
      'men-1',
      'usr-student-1',
      'usr-student-1',
      'Backend Architecture & Technical Interview Preparation',
      '2026-09-22 17:00',
      '2026-09-22',
      '17:00',
      'confirmed',
      'https://meet.skillbridge.ai/room-backend-architecture-101',
      'Student will present a 10-minute walkthrough of their Redis caching architecture.',
      'Student has solid technical foundations and clear motivation.',
      4.9
    ]
  );

  execute(
    `INSERT OR REPLACE INTO mentor_feedbacks (
      id, session_id, mentor_id, student_id, strengths, weaknesses, recommended_practice,
      interview_advice, course_suggestions, career_guidance, follow_up_tasks, rating, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      'mfb-seed-1',
      'msess-seed-1',
      'usr-mentor-1',
      'usr-student-1',
      'Strong grasp of Python internals and relational database normalization.',
      'Needs to practice explaining microservice trade-offs under high concurrency with precise latency numbers.',
      'Complete 5 medium graph/tree problems in the Coding Arena and review REST API rate-limiting patterns.',
      'Use the STAR method for behavioral responses and always lead with quantifiable outcomes.',
      'Advanced Cloud Architecture & Distributed Systems',
      'Well-suited for Junior Backend Engineer or Cloud Infrastructure Intern roles.',
      'Implement Redis caching and connection pooling in your portfolio project before next week.',
      5.0
    ]
  );

  execute(
    `INSERT OR REPLACE INTO student_privacy_settings (
      id, student_id, share_skills, share_gaps, share_courses, share_coding, share_interviews, share_applications, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ['priv-seed-1', 'usr-student-1', 1, 1, 1, 1, 1, 0]
  );

  // -------------------------------------------------------------
  // Step 15: Seed Candidate Applications & Recruiter Interviews
  // -------------------------------------------------------------
  execute(
    `INSERT OR REPLACE INTO opportunity_applications (
      id, student_id, opportunity_id, status, applied_at, notes, application_reference
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
    ['opp-app-1', 'usr-student-1', 'opp-1', 'SHORTLISTED', 'Applied via SkillBridge Marketplace', 'APP-2026-SB-001']
  );

  execute(
    `INSERT OR REPLACE INTO recruiter_interviews (
      id, recruiter_id, candidate_id, opportunity_id, application_id, interview_type,
      scheduled_date, scheduled_time, duration_minutes, meeting_link, instructions, status, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      'rec-int-seed-1',
      'usr-recruiter-1',
      'usr-student-1',
      'opp-1',
      'opp-app-1',
      'TECHNICAL',
      '2026-09-25',
      '14:30',
      45,
      'https://meet.skillbridge.ai/alphascale-tech-round',
      'Please have your preferred code editor ready and be prepared for a 30-minute system design discussion.',
      'SCHEDULED',
      'Candidate demonstrated top 10% coding performance and strong Python/SQL match score.'
    ]
  );

  // -------------------------------------------------------------
  // Step 17: Seed Notification Preferences & In-App Notifications
  // -------------------------------------------------------------
  execute(
    `INSERT OR REPLACE INTO notification_preferences (
      id, user_id, course_reminders, test_reminders, opportunity_alerts,
      application_updates, mentor_messages, interview_reminders, system_announcements, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ['notif-pref-1', 'usr-student-1', 1, 1, 1, 1, 1, 1, 1]
  );

  const notificationsToSeed = [
    {
      id: 'notif-seed-1',
      userId: 'usr-student-1',
      title: 'Technical Interview Scheduled',
      message: 'AlphaScale Labs has scheduled your Technical Interview for Python Backend Engineer Intern on Sep 25, 2026 at 2:30 PM.',
      type: 'INTERVIEW_SCHEDULED',
      relId: 'rec-int-seed-1',
      isRead: 0
    },
    {
      id: 'notif-seed-2',
      userId: 'usr-student-1',
      title: 'Mentorship Session Confirmed',
      message: 'Dr. Rajesh Kumar confirmed your mentorship session on Backend Architecture for Sep 22, 2026 at 5:00 PM.',
      type: 'MENTOR_SESSION',
      relId: 'msess-seed-1',
      isRead: 0
    },
    {
      id: 'notif-seed-3',
      userId: 'usr-student-1',
      title: 'New High-Match Opportunity',
      message: 'AI Matching identified a 77% match for "Automated Test Software Intern" at AlphaScale Labs.',
      type: 'MATCHED_OPPORTUNITY',
      relId: 'opp-47efae29',
      isRead: 1
    },
    {
      id: 'notif-seed-4',
      userId: 'usr-student-1',
      title: 'Course Learning Streak',
      message: 'You are on a 12-day coding streak! Complete your daily coding challenge to reach 13 days.',
      type: 'COURSE_REMINDER',
      relId: 'crs-python-advanced',
      isRead: 1
    },
    {
      id: 'notif-seed-5',
      userId: 'usr-mentor-1',
      title: 'New Mentorship Request',
      message: 'Student student@skillbridge.ai has submitted a new mentorship request for Interview Preparation.',
      type: 'MENTOR_REQUEST',
      relId: 'mreq-seed-1',
      isRead: 0
    },
    {
      id: 'notif-seed-6',
      userId: 'usr-recruiter-1',
      title: 'Candidate Application Update',
      message: 'A candidate with 77% profile match submitted an application for Automated Test Software Intern.',
      type: 'APPLICATION_UPDATE',
      relId: 'opp-47efae29',
      isRead: 0
    },
    {
      id: 'notif-seed-7',
      userId: 'usr-admin-1',
      title: 'Moderation Queue Notice',
      message: 'There are opportunities and company profiles pending admin verification.',
      type: 'ADMIN_ALERT',
      relId: null,
      isRead: 0
    }
  ];

  for (const n of notificationsToSeed) {
    execute(
      `INSERT OR REPLACE INTO notifications (
        id, user_id, title, message, type, related_entity_id, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [n.id, n.userId, n.title, n.message, n.type, n.relId, n.isRead]
    );
  }

  console.log('[Seed] Database seeded with Steps 13-18 mock interviews, mentorship, recruiter interviews, notifications & preferences successfully.');
}

// Run directly if invoked from command line
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase().catch(err => {
    console.error('[Seed Error]', err);
    process.exit(1);
  });
}
