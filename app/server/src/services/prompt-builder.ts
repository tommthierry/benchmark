// Prompt Builder Service - Constructs prompts for AI Arena game flow
// Provides templates for master topic selection, question creation, answering, and judging

import type { QuestionType } from '../db/index.js';

// =============================================================================
// TOPIC SELECTION PROMPT (Master)
// =============================================================================

interface TopicSelectionInput {
  topics: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

export function buildTopicSelectionPrompt(input: TopicSelectionInput): string {
  const topicsList = input.topics
    .map((t, i) => `${i + 1}. ${t.name}${t.description ? `: ${t.description}` : ''}`)
    .join('\n');

  return `You are the Master of this round in an AI competition. Your task is to select ONE topic for the question you will create.

Available topics:
${topicsList}

Select the topic you find most interesting or challenging. Respond in JSON format only:

{
  "selectedTopic": "exact_topic_name",
  "reasoning": "Brief explanation of why you chose this topic (1-2 sentences)"
}`;
}

// =============================================================================
// QUESTION CREATION PROMPT (Master)
// =============================================================================

interface QuestionCreationInput {
  topicName: string;
  topicDescription: string | null;
  participantCount: number;
}

export function buildQuestionCreationPrompt(input: QuestionCreationInput): string {
  return `You are the Master of this round. Create a challenging question about: ${input.topicName}

${input.topicDescription ? `Topic description: ${input.topicDescription}` : ''}

Requirements:
- Create ONE clear, well-defined question
- The question should test knowledge, reasoning, or problem-solving ability
- It should be answerable in 1-3 paragraphs
- You will NOT answer this question yourself
- You will later judge the ${input.participantCount} other AI models' answers

Respond in JSON format only:

{
  "question": "Your complete question here",
  "difficulty": "easy|medium|hard|expert",
  "evaluationHints": "What aspects make a good answer (for your reference when judging)"
}`;
}

// =============================================================================
// ANSWER PROMPT (Participants)
// =============================================================================

interface AnswerInput {
  question: string;
  topicName?: string;
  difficulty?: string;
}

export function buildAnswerPrompt(input: AnswerInput): string {
  return `${input.topicName ? `Topic: ${input.topicName}\n` : ''}${input.difficulty ? `Difficulty: ${input.difficulty}\n\n` : ''}QUESTION: ${input.question}

Provide a clear, well-reasoned answer. Be thorough but concise. Show your reasoning process where appropriate.`;
}

// =============================================================================
// JUDGING PROMPT
// =============================================================================

interface JudgingAnswer {
  letter: string;
  content: string;
}

interface JudgingInput {
  question: string;
  answers: JudgingAnswer[];
  isMaster: boolean;
}

export function buildJudgingPrompt(input: JudgingInput): string {
  const answersList = input.answers
    .map(a => `[Answer ${a.letter}]:\n${a.content}`)
    .join('\n\n---\n\n');

  const roleDescription = input.isMaster
    ? 'You are the Master who created this question. As the question creator, you have insight into what makes a good answer.'
    : 'You are a judge in this AI competition.';

  return `${roleDescription}

QUESTION: ${input.question}

Here are the anonymized answers to judge:

${answersList}

For EACH answer, evaluate using these criteria:
- Accuracy (40%): Is the information correct and factually sound?
- Clarity (30%): Is the answer well-organized, clear, and easy to understand?
- Completeness (30%): Does it fully address all aspects of the question?

Provide a score (0-100) and ranking for each answer.

Respond in JSON format only:

{
  "judgments": [
    {
      "answerId": "A",
      "score": 85,
      "rank": 1,
      "reasoning": "Brief explanation of score (1-2 sentences)",
      "criteriaScores": {
        "accuracy": 90,
        "clarity": 80,
        "completeness": 85
      }
    }
  ]
}

IMPORTANT:
- Rank 1 is the best answer
- Be objective and fair in your evaluation
- Consider the question's requirements when scoring`;
}

// =============================================================================
// RESPONSE PARSERS
// =============================================================================

export interface TopicSelectionResponse {
  selectedTopic: string;
  reasoning: string;
}

export function parseTopicSelection(
  response: string,
  topics: Array<{ id: string; name: string }>
): TopicSelectionResponse & { topicId: string | null } {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as TopicSelectionResponse;

    // Find matching topic
    const topic = topics.find(t =>
      t.name.toLowerCase() === parsed.selectedTopic.toLowerCase()
    );

    return {
      ...parsed,
      topicId: topic?.id ?? null,
    };
  } catch (error) {
    // Fallback: try to find any topic name in the response
    for (const topic of topics) {
      if (response.toLowerCase().includes(topic.name.toLowerCase())) {
        return {
          selectedTopic: topic.name,
          reasoning: 'Auto-extracted from response',
          topicId: topic.id,
        };
      }
    }

    // Default to first topic
    return {
      selectedTopic: topics[0]?.name ?? 'unknown',
      reasoning: 'Failed to parse response, defaulting to first topic',
      topicId: topics[0]?.id ?? null,
    };
  }
}

export interface QuestionCreationResponse {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  evaluationHints: string;
}

export function parseQuestionCreation(response: string): QuestionCreationResponse {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    const difficulty = validDifficulties.includes(parsed.difficulty)
      ? parsed.difficulty
      : 'medium';

    return {
      question: parsed.question || 'Question parsing failed',
      difficulty,
      evaluationHints: parsed.evaluationHints || '',
    };
  } catch (error) {
    // Fallback: use entire response as question
    return {
      question: response.slice(0, 1000),
      difficulty: 'medium',
      evaluationHints: '',
    };
  }
}

export interface JudgmentResponse {
  answerId: string;
  score: number;
  rank: number;
  reasoning: string;
  criteriaScores: {
    accuracy?: number;
    clarity?: number;
    completeness?: number;
  };
}

export interface ParsedJudgments {
  judgments: JudgmentResponse[];
}

export function parseJudgments(
  response: string,
  expectedAnswerIds: string[]
): ParsedJudgments {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedJudgments;

    // Validate and normalize judgments
    const judgments = parsed.judgments.map(j => ({
      answerId: j.answerId,
      score: Math.max(0, Math.min(100, Number(j.score) || 50)),
      rank: Number(j.rank) || 1,
      reasoning: j.reasoning || 'No reasoning provided',
      criteriaScores: {
        accuracy: j.criteriaScores?.accuracy,
        clarity: j.criteriaScores?.clarity,
        completeness: j.criteriaScores?.completeness,
      },
    }));

    return { judgments };
  } catch (error) {
    // Fallback: create default judgments
    return {
      judgments: expectedAnswerIds.map((id, i) => ({
        answerId: id,
        score: 50,
        rank: i + 1,
        reasoning: 'Failed to parse judgment response',
        criteriaScores: {},
      })),
    };
  }
}

// =============================================================================
// HELPER: Generate answer letters
// =============================================================================

export function getAnswerLetter(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C, etc.
}
