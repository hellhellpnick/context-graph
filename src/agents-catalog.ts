/**
 * Curated index of agency-agents (https://github.com/msitarzewski/agency-agents).
 *
 * Each entry describes:
 *   - where the .md file lives in the upstream repo
 *   - what project signals trigger a match
 *   - a short description for the generated README
 */

export interface AgentEntry {
  /** Slug used as filename: <slug>.md */
  slug: string;
  /** Human-readable name */
  name: string;
  /** One-line description of what this agent does */
  description: string;
  /** How / when to use it (shown in README) */
  usage: string;
  /** Path inside msitarzewski/agency-agents repo (branch: main) */
  repoPath: string;
  /** Category for grouping in README */
  category: 'engineering' | 'testing' | 'design' | 'product' | 'support' | 'specialized';
  /** Match rules — at least one must be satisfied */
  match: AgentMatchRule;
}

export interface AgentMatchRule {
  /** File extensions present in the project (e.g. ['.ts', '.tsx']) */
  extensions?: string[];
  /** File/dir names that indicate relevance (e.g. ['Dockerfile', 'docker-compose']) */
  filePatterns?: RegExp[];
  /** package.json / pyproject.toml dependency names */
  dependencies?: string[];
  /** Tech stack keywords (matched against plan.techStack) */
  stackKeywords?: string[];
  /** Always include if project has any code at all */
  always?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// The catalog — ordered by typical relevance.
// Only agents useful for *coding* projects are included (skipping marketing,
// sales, finance, paid-media, etc.).
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'engineering';
const TEST = 'testing';
const DESIGN = 'design';
const PRODUCT = 'product';
const SPEC = 'specialized';

export const AGENTS_CATALOG: AgentEntry[] = [
  // ── Engineering ───────────────────────────────────────────────────────────
  {
    slug: 'frontend-developer',
    name: 'Frontend Developer',
    description: 'React/Vue/Angular, UI implementation, performance, Core Web Vitals.',
    usage: 'Use when building or refactoring frontend components, optimizing page load, or implementing responsive designs.',
    repoPath: `${BASE}/engineering-frontend-developer.md`,
    category: 'engineering',
    match: {
      extensions: ['.tsx', '.jsx', '.vue', '.svelte'],
      dependencies: ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'astro', 'solid-js'],
    },
  },
  {
    slug: 'backend-architect',
    name: 'Backend Architect',
    description: 'API design, database architecture, scalability, microservices.',
    usage: 'Use when designing APIs, choosing database strategies, or planning server-side architecture.',
    repoPath: `${BASE}/engineering-backend-architect.md`,
    category: 'engineering',
    match: {
      dependencies: ['express', 'fastify', 'koa', 'nestjs', 'hono', 'django', 'flask', 'fastapi', 'gin', 'fiber', 'actix-web', 'spring-boot'],
      filePatterns: [/^(src\/)?(server|api|routes)\b/i],
    },
  },
  {
    slug: 'mobile-app-builder',
    name: 'Mobile App Builder',
    description: 'iOS/Android, React Native, Flutter cross-platform apps.',
    usage: 'Use when building native or cross-platform mobile applications.',
    repoPath: `${BASE}/engineering-mobile-app-builder.md`,
    category: 'engineering',
    match: {
      extensions: ['.swift', '.kt', '.dart'],
      dependencies: ['react-native', 'expo', 'flutter'],
      filePatterns: [/^android\//i, /^ios\//i, /^pubspec\.ya?ml$/i],
    },
  },
  {
    slug: 'ai-engineer',
    name: 'AI Engineer',
    description: 'ML models, deployment, AI integration, data pipelines.',
    usage: 'Use when integrating ML models, building AI features, or designing data pipelines.',
    repoPath: `${BASE}/engineering-ai-engineer.md`,
    category: 'engineering',
    match: {
      dependencies: ['tensorflow', 'torch', 'pytorch', 'transformers', 'langchain', 'openai', 'anthropic', 'scikit-learn', 'pandas', 'numpy'],
      filePatterns: [/\bmodel[s]?\b.*\.py$/i, /\bml\b/i, /\btraining\b/i],
    },
  },
  {
    slug: 'devops-automator',
    name: 'DevOps Automator',
    description: 'CI/CD, infrastructure automation, cloud ops, monitoring.',
    usage: 'Use when setting up CI/CD pipelines, automating deployments, or configuring infrastructure.',
    repoPath: `${BASE}/engineering-devops-automator.md`,
    category: 'engineering',
    match: {
      filePatterns: [
        /^Dockerfile/i, /^docker-compose/i, /^\.github\/workflows\//,
        /^\.gitlab-ci/i, /^Jenkinsfile$/i, /^terraform\//i, /^k8s\//i,
        /^helm\//i, /^\.circleci\//i, /^serverless\.(ya?ml|ts|js)$/i,
      ],
    },
  },
  {
    slug: 'security-engineer',
    name: 'Security Engineer',
    description: 'Threat modeling, secure code review, security architecture.',
    usage: 'Use when reviewing code for vulnerabilities, designing auth flows, or implementing security best practices.',
    repoPath: `${BASE}/engineering-security-engineer.md`,
    category: 'engineering',
    match: {
      dependencies: ['helmet', 'cors', 'bcrypt', 'jsonwebtoken', 'passport', 'oauth', 'crypto'],
      filePatterns: [/auth/i, /security/i, /middleware\/auth/i],
    },
  },
  {
    slug: 'senior-developer',
    name: 'Senior Developer',
    description: 'Advanced patterns, architecture decisions, complex implementations.',
    usage: 'Use as a general senior-level advisor for architecture decisions, refactoring, and complex feature implementation.',
    repoPath: `${BASE}/engineering-senior-developer.md`,
    category: 'engineering',
    match: {
      always: true,
    },
  },
  {
    slug: 'codebase-onboarding-engineer',
    name: 'Codebase Onboarding Engineer',
    description: 'Fast developer onboarding, codebase exploration, factual explanation.',
    usage: 'Use when new developers join the team and need to understand the repo structure, code paths, and conventions quickly.',
    repoPath: `${BASE}/engineering-codebase-onboarding-engineer.md`,
    category: 'engineering',
    match: {
      always: true,
    },
  },
  {
    slug: 'technical-writer',
    name: 'Technical Writer',
    description: 'Developer docs, API reference, tutorials.',
    usage: 'Use when writing or improving documentation, API references, or developer guides.',
    repoPath: `${BASE}/engineering-technical-writer.md`,
    category: 'engineering',
    match: {
      always: true,
    },
  },
  {
    slug: 'software-architect',
    name: 'Software Architect',
    description: 'System design, DDD, architectural patterns, trade-off analysis.',
    usage: 'Use when making architecture decisions, domain modeling, or planning system evolution.',
    repoPath: `${BASE}/engineering-software-architect.md`,
    category: 'engineering',
    match: {
      stackKeywords: ['TypeScript', 'Java', 'C#', 'Go', 'Rust', 'Python'],
    },
  },
  {
    slug: 'database-optimizer',
    name: 'Database Optimizer',
    description: 'Schema design, query optimization, indexing strategies.',
    usage: 'Use when tuning slow queries, designing schemas, or planning database migrations.',
    repoPath: `${BASE}/engineering-database-optimizer.md`,
    category: 'engineering',
    match: {
      dependencies: ['prisma', 'typeorm', 'sequelize', 'knex', 'drizzle', 'mongoose', 'sqlalchemy', 'diesel', 'gorm'],
      filePatterns: [/migrat/i, /schema/i, /models?\//i],
    },
  },
  {
    slug: 'git-workflow-master',
    name: 'Git Workflow Master',
    description: 'Branching strategies, conventional commits, advanced Git.',
    usage: 'Use when designing git workflows, cleaning up history, or setting up CI-friendly branch management.',
    repoPath: `${BASE}/engineering-git-workflow-master.md`,
    category: 'engineering',
    match: {
      filePatterns: [/^\.github\//],
    },
  },
  {
    slug: 'sre',
    name: 'SRE',
    description: 'SLOs, error budgets, observability, chaos engineering.',
    usage: 'Use when improving production reliability, setting SLOs, or reducing toil.',
    repoPath: `${BASE}/engineering-sre.md`,
    category: 'engineering',
    match: {
      filePatterns: [/^k8s\//i, /^helm\//i, /docker-compose/i, /prometheus/i, /grafana/i],
      dependencies: ['prom-client', 'opentelemetry', '@opentelemetry/sdk-node'],
    },
  },
  {
    slug: 'data-engineer',
    name: 'Data Engineer',
    description: 'Data pipelines, lakehouse architecture, ETL/ELT.',
    usage: 'Use when building data pipelines, ETL workflows, or data warehouse infrastructure.',
    repoPath: `${BASE}/engineering-data-engineer.md`,
    category: 'engineering',
    match: {
      dependencies: ['apache-airflow', 'dbt', 'spark', 'pyspark', 'polars', 'duckdb'],
      filePatterns: [/\bpipeline/i, /\betl\b/i, /\bdbt\b/i],
    },
  },

  // ── Testing ───────────────────────────────────────────────────────────────
  {
    slug: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Constructive code review, security, maintainability.',
    usage: 'Use when doing PR reviews, enforcing code quality gates, or mentoring through code review.',
    repoPath: `${BASE}/engineering-code-reviewer.md`,
    category: 'testing',
    match: {
      always: true,
    },
  },
  {
    slug: 'api-tester',
    name: 'API Tester',
    description: 'API validation, integration testing, endpoint verification.',
    usage: 'Use when testing API endpoints, writing integration tests, or verifying API contracts.',
    repoPath: `${TEST}/testing-api-tester.md`,
    category: 'testing',
    match: {
      dependencies: ['supertest', 'axios', 'got', 'node-fetch', 'httpx', 'requests'],
      filePatterns: [/\bapi\b/i, /\broutes?\b/i, /\bendpoint/i],
    },
  },
  {
    slug: 'performance-benchmarker',
    name: 'Performance Benchmarker',
    description: 'Performance testing, load testing, optimization.',
    usage: 'Use when profiling performance, running load tests, or optimizing response times.',
    repoPath: `${TEST}/testing-performance-benchmarker.md`,
    category: 'testing',
    match: {
      dependencies: ['k6', 'artillery', 'autocannon', 'benchmark', 'lighthouse'],
      filePatterns: [/bench/i, /perf/i, /loadtest/i],
    },
  },
  {
    slug: 'accessibility-auditor',
    name: 'Accessibility Auditor',
    description: 'WCAG auditing, assistive technology testing, inclusive design.',
    usage: 'Use when checking accessibility compliance, screen reader support, or inclusive UI patterns.',
    repoPath: `${TEST}/testing-accessibility-auditor.md`,
    category: 'testing',
    match: {
      extensions: ['.tsx', '.jsx', '.vue', '.svelte', '.html'],
      dependencies: ['react', 'vue', 'angular', 'svelte'],
    },
  },

  // ── Design ────────────────────────────────────────────────────────────────
  {
    slug: 'ui-designer',
    name: 'UI Designer',
    description: 'Visual design, component libraries, design systems.',
    usage: 'Use when creating UI components, maintaining design system consistency, or improving visual design.',
    repoPath: `${DESIGN}/design-ui-designer.md`,
    category: 'design',
    match: {
      dependencies: ['tailwindcss', '@chakra-ui/react', '@mui/material', 'antd', 'styled-components', 'emotion', 'radix-ui'],
      extensions: ['.tsx', '.jsx', '.vue', '.svelte', '.css', '.scss'],
    },
  },
  {
    slug: 'ux-architect',
    name: 'UX Architect',
    description: 'Technical architecture, CSS systems, implementation guidance.',
    usage: 'Use when building developer-friendly design foundations or implementing complex UI architectures.',
    repoPath: `${DESIGN}/design-ux-architect.md`,
    category: 'design',
    match: {
      dependencies: ['tailwindcss', '@chakra-ui/react', '@mui/material', 'antd'],
      extensions: ['.tsx', '.jsx', '.vue'],
    },
  },

  // ── Product ───────────────────────────────────────────────────────────────
  {
    slug: 'product-manager',
    name: 'Product Manager',
    description: 'Full lifecycle product ownership: discovery, PRDs, roadmap, GTM.',
    usage: 'Use when planning features, writing PRDs, or making product decisions.',
    repoPath: `${PRODUCT}/product-manager.md`,
    category: 'product',
    match: {
      always: true,
    },
  },

  // ── Specialized ───────────────────────────────────────────────────────────
  {
    slug: 'mcp-builder',
    name: 'MCP Builder',
    description: 'Model Context Protocol servers, AI agent tooling.',
    usage: 'Use when building MCP servers that extend AI agent capabilities.',
    repoPath: `${SPEC}/specialized-mcp-builder.md`,
    category: 'specialized',
    match: {
      dependencies: ['@modelcontextprotocol/sdk', 'mcp'],
      filePatterns: [/\bmcp\b/i],
    },
  },
  {
    slug: 'workflow-architect',
    name: 'Workflow Architect',
    description: 'Workflow discovery, mapping, and specification.',
    usage: 'Use when mapping every path through a system before code is written.',
    repoPath: `${SPEC}/specialized-workflow-architect.md`,
    category: 'specialized',
    match: {
      filePatterns: [/workflow/i, /pipeline/i, /state.?machine/i],
      dependencies: ['xstate', 'temporal', 'bull', 'bullmq'],
    },
  },
  {
    slug: 'developer-advocate',
    name: 'Developer Advocate',
    description: 'Community building, developer experience, developer content.',
    usage: 'Use when improving developer experience, writing developer-facing content, or building community.',
    repoPath: `${SPEC}/specialized-developer-advocate.md`,
    category: 'specialized',
    match: {
      filePatterns: [/^examples?\//i, /^docs?\//i, /^sdk\//i],
    },
  },
];

/** Maximum agents to recommend by default */
export const MAX_RECOMMENDED_AGENTS = 10;
