export interface RoleBenchmark {
  roleId: string;
  roleTitle: string;
  requirements: Record<string, { requiredLevel: number; weight: number; isMandatory: boolean }>;
}

export const TARGET_ROLE_BENCHMARKS: Record<string, RoleBenchmark> = {
  'role-software-dev': {
    roleId: 'role-software-dev',
    roleTitle: 'Software Developer',
    requirements: {
      'Python': { requiredLevel: 75, weight: 1.2, isMandatory: true },
      'Data Structures & Algorithms': { requiredLevel: 75, weight: 1.5, isMandatory: true },
      'Database Systems & SQL': { requiredLevel: 65, weight: 1.0, isMandatory: true },
      'Problem Solving & Logic': { requiredLevel: 80, weight: 1.3, isMandatory: true },
      'Web & API Architecture': { requiredLevel: 70, weight: 1.0, isMandatory: false },
      'English Communication': { requiredLevel: 70, weight: 1.0, isMandatory: true }
    }
  },
  'role-data-analyst': {
    roleId: 'role-data-analyst',
    roleTitle: 'Data Analyst',
    requirements: {
      'Python': { requiredLevel: 70, weight: 1.2, isMandatory: true },
      'Database Systems & SQL': { requiredLevel: 85, weight: 1.5, isMandatory: true },
      'Problem Solving & Logic': { requiredLevel: 75, weight: 1.2, isMandatory: true },
      'Computer Science Fundamentals': { requiredLevel: 60, weight: 0.8, isMandatory: false },
      'English Communication': { requiredLevel: 70, weight: 1.0, isMandatory: true }
    }
  },
  'role-ai-engineer': {
    roleId: 'role-ai-engineer',
    roleTitle: 'AI / ML Engineer',
    requirements: {
      'Python': { requiredLevel: 85, weight: 1.5, isMandatory: true },
      'Data Structures & Algorithms': { requiredLevel: 80, weight: 1.3, isMandatory: true },
      'Computer Science Fundamentals': { requiredLevel: 75, weight: 1.1, isMandatory: true },
      'Problem Solving & Logic': { requiredLevel: 85, weight: 1.4, isMandatory: true },
      'English Communication': { requiredLevel: 70, weight: 1.0, isMandatory: true }
    }
  },
  'role-fullstack-dev': {
    roleId: 'role-fullstack-dev',
    roleTitle: 'Full Stack Developer',
    requirements: {
      'Web & API Architecture': { requiredLevel: 85, weight: 1.4, isMandatory: true },
      'Database Systems & SQL': { requiredLevel: 75, weight: 1.2, isMandatory: true },
      'Python': { requiredLevel: 70, weight: 1.0, isMandatory: true },
      'Data Structures & Algorithms': { requiredLevel: 70, weight: 1.1, isMandatory: true },
      'Problem Solving & Logic': { requiredLevel: 75, weight: 1.2, isMandatory: true },
      'English Communication': { requiredLevel: 70, weight: 1.0, isMandatory: true }
    }
  }
};

export interface SkillGapItem {
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  gapStatus: 'critical' | 'needs_improvement' | 'good';
  gapPercentage: number;
  priorityOrder: number;
  recommendation: string;
}

export interface SkillGapAnalysisResult {
  targetRoleTitle: string;
  readinessScore: number;
  gaps: SkillGapItem[];
  criticalCount: number;
  needsImprovementCount: number;
  goodCount: number;
}

export function computeSkillGaps(
  currentSkills: Record<string, number>,
  targetRoleId: string = 'role-software-dev'
): SkillGapAnalysisResult {
  const benchmark = TARGET_ROLE_BENCHMARKS[targetRoleId] || TARGET_ROLE_BENCHMARKS['role-software-dev'];
  const gaps: SkillGapItem[] = [];

  let weightedScoreSum = 0;
  let totalWeight = 0;
  let criticalCount = 0;
  let needsImprovementCount = 0;
  let goodCount = 0;

  for (const [skillName, req] of Object.entries(benchmark.requirements)) {
    const current = currentSkills[skillName] || 35;
    const required = req.requiredLevel;
    const diff = required - current;

    let gapStatus: 'critical' | 'needs_improvement' | 'good';
    let recommendation = '';

    if (diff > 25) {
      gapStatus = 'critical';
      criticalCount++;
      recommendation = `CRITICAL GAP: Required score is ${required}%, but current is ${current}%. Immediate foundational course and daily practice required.`;
    } else if (diff > 5) {
      gapStatus = 'needs_improvement';
      needsImprovementCount++;
      recommendation = `Moderate gap of ${diff}%. Complete targeted practice modules and review key concepts.`;
    } else {
      gapStatus = 'good';
      goodCount++;
      recommendation = `Target achieved (${current}% >= ${required}% threshold). Maintain skill through weekly challenges.`;
    }

    // Weighted readiness calculation
    const cappedRatio = Math.min(1.0, current / required);
    weightedScoreSum += cappedRatio * req.weight;
    totalWeight += req.weight;

    gaps.push({
      skillName,
      currentLevel: current,
      requiredLevel: required,
      gapStatus,
      gapPercentage: Math.max(0, diff),
      priorityOrder: gapStatus === 'critical' ? 1 : gapStatus === 'needs_improvement' ? 2 : 3,
      recommendation
    });
  }

  // Sort by priority (critical first, highest gap percentage)
  gaps.sort((a, b) => {
    if (a.priorityOrder !== b.priorityOrder) {
      return a.priorityOrder - b.priorityOrder;
    }
    return b.gapPercentage - a.gapPercentage;
  });

  const readinessScore = totalWeight > 0 ? Math.round((weightedScoreSum / totalWeight) * 100) : 50;

  return {
    targetRoleTitle: benchmark.roleTitle,
    readinessScore,
    gaps,
    criticalCount,
    needsImprovementCount,
    goodCount
  };
}
