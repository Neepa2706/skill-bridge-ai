export interface SkillEvaluationResult {
  overallScore: number;
  skillBreakdown: Record<string, {
    score: number;
    category: 'technical' | 'coding' | 'communication';
    strength: boolean;
    weakness: boolean;
    recommendation: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  prioritySkills: string[];
  recommendedNextSteps: string[];
}

export function analyzeSkillsFromAssessment(
  questions: Array<{ id: string; skillName: string; category: 'technical' | 'coding' | 'communication'; correctAnswer: string }>,
  answers: Record<string, string>,
  targetRole: string = 'Software Developer'
): SkillEvaluationResult {
  const skillScores: Record<string, { correct: number; total: number; category: 'technical' | 'coding' | 'communication' }> = {
    'Python': { correct: 0, total: 0, category: 'coding' },
    'Data Structures & Algorithms': { correct: 0, total: 0, category: 'coding' },
    'Problem Solving & Logic': { correct: 0, total: 0, category: 'coding' },
    'Database Systems & SQL': { correct: 0, total: 0, category: 'technical' },
    'Computer Science Fundamentals': { correct: 0, total: 0, category: 'technical' },
    'Web & API Architecture': { correct: 0, total: 0, category: 'technical' },
    'English Communication': { correct: 0, total: 0, category: 'communication' },
    'Japanese Communication': { correct: 0, total: 0, category: 'communication' },
    'German Communication': { correct: 0, total: 0, category: 'communication' }
  };

  let totalQuestions = 0;
  let totalCorrect = 0;

  for (const q of questions) {
    totalQuestions++;
    const isCorrect = answers[q.id] && answers[q.id].trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    if (isCorrect) totalCorrect++;

    // Map to normalized skill name
    let matchedSkill = q.skillName;
    if (!skillScores[matchedSkill]) {
      // Find closest or create
      matchedSkill = Object.keys(skillScores).find(s => s.toLowerCase().includes(q.skillName.toLowerCase())) || q.skillName;
      if (!skillScores[matchedSkill]) {
        skillScores[matchedSkill] = { correct: 0, total: 0, category: q.category };
      }
    }

    skillScores[matchedSkill].total += 1;
    if (isCorrect) {
      skillScores[matchedSkill].correct += 1;
    }
  }

  const breakdown: SkillEvaluationResult['skillBreakdown'] = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const prioritySkills: string[] = [];

  for (const [skillName, data] of Object.entries(skillScores)) {
    // If not directly tested in this assessment, provide baseline estimated score
    let score = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 45;
    
    // Normalize to avoid zero scores for complete beginners
    score = Math.max(20, score);

    const isStrength = score >= 70;
    const isWeakness = score < 60;

    let recommendation = 'Continue general practice and maintain knowledge.';
    if (score < 50) {
      recommendation = `Complete the foundational course in ${skillName} and practice beginner problem sets.`;
      weaknesses.push(skillName);
      prioritySkills.push(skillName);
    } else if (score < 70) {
      recommendation = `Focus on intermediate practical projects and timed quizzes in ${skillName}.`;
      weaknesses.push(skillName);
    } else {
      recommendation = `Proficient! Advance to production architectures and competitive challenges in ${skillName}.`;
      strengths.push(skillName);
    }

    breakdown[skillName] = {
      score,
      category: data.category,
      strength: isStrength,
      weakness: isWeakness,
      recommendation
    };
  }

  const overallScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 55;

  const recommendedNextSteps = [
    `Enroll in the recommended learning paths for top gaps: ${prioritySkills.slice(0, 2).join(' and ') || 'Core DSA and Architecture'}.`,
    'Complete the daily coding streak challenge in the Coding Arena to build muscle memory.',
    'Engage with the AI Language Partner to enhance international business communication.',
    'Take mock interview practice once critical skill gaps achieve green status (70%+).'
  ];

  return {
    overallScore,
    skillBreakdown: breakdown,
    strengths,
    weaknesses,
    prioritySkills,
    recommendedNextSteps
  };
}
