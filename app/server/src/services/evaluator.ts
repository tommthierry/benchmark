// Evaluator Service - Evaluation of LLM responses
// Supports rule-based (exact match, contains, regex) and LLM-as-Judge evaluation

import { v4 as uuid } from 'uuid';
import pino from 'pino';
import { db, schema, type Question } from '../db/index.js';
import type { EvaluationResult, EvaluatorType } from '@sabe/shared';
import { getProviderManager } from './llm/index.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// LLM Judge configuration from environment
const LLM_JUDGE_PROVIDER_ID = process.env.LLM_JUDGE_PROVIDER_ID;
const LLM_JUDGE_MODEL = process.env.LLM_JUDGE_MODEL || 'anthropic/claude-3.5-sonnet';

/**
 * Evaluator for benchmark responses
 * Implements rule-based evaluation strategies
 */
export class Evaluator {
  /**
   * Evaluate a response and create an evaluation record
   */
  async evaluate(
    executionId: string,
    question: Question,
    responseContent: string
  ): Promise<EvaluationResult> {
    let result: EvaluationResult;

    switch (question.evaluationMethod) {
      case 'exact_match':
        result = this.evaluateExactMatch(responseContent, question.expectedAnswer);
        break;

      case 'contains':
        result = this.evaluateContains(
          responseContent,
          question.evaluationCriteria?.keywords ?? []
        );
        break;

      case 'regex':
        result = this.evaluateRegex(
          responseContent,
          question.evaluationCriteria?.pattern
        );
        break;

      case 'llm_judge':
        result = await this.evaluateLLMJudge(question, responseContent);
        break;

      default:
        result = {
          score: 0,
          maxScore: 100,
          normalizedScore: 0,
          justification: `Unknown evaluation method: ${question.evaluationMethod}`,
          evaluatorType: 'rule_based',
        };
    }

    // Persist the evaluation to database
    await db.insert(schema.evaluations).values({
      id: uuid(),
      executionId,
      evaluatorType: result.evaluatorType,
      score: result.score,
      maxScore: result.maxScore,
      normalizedScore: result.normalizedScore,
      justification: result.justification,
      createdAt: new Date(),
    });

    logger.debug({
      executionId,
      method: question.evaluationMethod,
      score: result.normalizedScore,
    }, 'Evaluation completed');

    return result;
  }

  /**
   * Exact match evaluation
   * Full match = 100, expected found in response = 75, no match = 0
   */
  private evaluateExactMatch(
    response: string,
    expected: string | null
  ): EvaluationResult {
    const evaluatorType: EvaluatorType = 'rule_based';

    if (!expected) {
      return {
        score: 0,
        maxScore: 100,
        normalizedScore: 0,
        justification: 'No expected answer provided for exact match evaluation',
        evaluatorType,
      };
    }

    const normalizedResponse = this.normalize(response);
    const normalizedExpected = this.normalize(expected);

    if (normalizedResponse === normalizedExpected) {
      return {
        score: 100,
        maxScore: 100,
        normalizedScore: 100,
        justification: 'Exact match found',
        evaluatorType,
      };
    }

    // Partial credit if expected is contained in response
    if (normalizedResponse.includes(normalizedExpected)) {
      return {
        score: 75,
        maxScore: 100,
        normalizedScore: 75,
        justification: 'Expected answer found within response',
        evaluatorType,
      };
    }

    return {
      score: 0,
      maxScore: 100,
      normalizedScore: 0,
      justification: `Response does not match expected answer`,
      evaluatorType,
    };
  }

  /**
   * Contains evaluation - checks for presence of keywords
   * Score is proportional to number of keywords found
   */
  private evaluateContains(
    response: string,
    keywords: string[]
  ): EvaluationResult {
    const evaluatorType: EvaluatorType = 'rule_based';

    if (!keywords || keywords.length === 0) {
      return {
        score: 0,
        maxScore: 100,
        normalizedScore: 0,
        justification: 'No keywords provided for contains evaluation',
        evaluatorType,
      };
    }

    const normalizedResponse = this.normalize(response);
    const matchedKeywords: string[] = [];
    const missedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (normalizedResponse.includes(this.normalize(keyword))) {
        matchedKeywords.push(keyword);
      } else {
        missedKeywords.push(keyword);
      }
    }

    const score = Math.round((matchedKeywords.length / keywords.length) * 100);
    const justification = matchedKeywords.length === keywords.length
      ? `All ${keywords.length} keywords found`
      : `Found ${matchedKeywords.length}/${keywords.length} keywords. Matched: [${matchedKeywords.join(', ')}]. Missed: [${missedKeywords.join(', ')}]`;

    return {
      score,
      maxScore: 100,
      normalizedScore: score,
      justification,
      evaluatorType,
    };
  }

  /**
   * Regex evaluation - checks if response matches pattern
   * Match = 100, no match = 0
   */
  private evaluateRegex(
    response: string,
    pattern: string | undefined
  ): EvaluationResult {
    const evaluatorType: EvaluatorType = 'rule_based';

    if (!pattern) {
      return {
        score: 0,
        maxScore: 100,
        normalizedScore: 0,
        justification: 'No regex pattern provided',
        evaluatorType,
      };
    }

    try {
      const regex = new RegExp(pattern, 'i');
      const matches = response.match(regex);

      if (matches) {
        return {
          score: 100,
          maxScore: 100,
          normalizedScore: 100,
          justification: `Pattern matched: "${matches[0]}"`,
          evaluatorType,
        };
      }

      return {
        score: 0,
        maxScore: 100,
        normalizedScore: 0,
        justification: `Pattern "${pattern}" not found in response`,
        evaluatorType,
      };
    } catch (error) {
      return {
        score: 0,
        maxScore: 100,
        normalizedScore: 0,
        justification: `Invalid regex pattern: ${(error as Error).message}`,
        evaluatorType,
      };
    }
  }

  /**
   * LLM-as-Judge evaluation
   * Uses an LLM to evaluate the response quality
   */
  private async evaluateLLMJudge(
    question: Question,
    response: string
  ): Promise<EvaluationResult> {
    const evaluatorType: EvaluatorType = 'llm_judge';

    // Check if LLM Judge is configured
    if (!LLM_JUDGE_PROVIDER_ID) {
      logger.warn('LLM Judge provider not configured (LLM_JUDGE_PROVIDER_ID not set)');
      return {
        score: 50,
        maxScore: 100,
        normalizedScore: 50,
        justification: 'LLM Judge not configured. Set LLM_JUDGE_PROVIDER_ID environment variable.',
        evaluatorType,
      };
    }

    try {
      const providerManager = await getProviderManager();

      // Check if provider is registered
      if (!providerManager.isProviderRegistered(LLM_JUDGE_PROVIDER_ID)) {
        logger.warn({ providerId: LLM_JUDGE_PROVIDER_ID }, 'LLM Judge provider not registered');
        return {
          score: 50,
          maxScore: 100,
          normalizedScore: 50,
          justification: 'LLM Judge provider not registered or API key not configured.',
          evaluatorType,
        };
      }

      // Build the evaluation rubric
      const rubric = question.evaluationCriteria?.rubric ||
        `Evaluate the response based on:
1. Accuracy: Is the information correct?
2. Completeness: Does it fully answer the question?
3. Clarity: Is the response clear and well-structured?
4. Relevance: Does it stay on topic?`;

      // Build the judge prompt
      const judgePrompt = `You are an expert evaluator judging AI model responses.

## Question Asked:
${question.content}

## Response to Evaluate:
${response}

## Evaluation Rubric:
${rubric}

## Instructions:
Score the response from 0-100 based on the rubric above.
Provide a brief justification for your score (1-2 sentences).

Respond in this exact JSON format:
{"score": <number 0-100>, "justification": "<brief explanation>"}

Only output the JSON, nothing else.`;

      // Send prompt to judge model
      const llmResponse = await providerManager.sendPrompt(
        LLM_JUDGE_PROVIDER_ID,
        LLM_JUDGE_MODEL,
        judgePrompt,
        { temperature: 0.1, maxTokens: 200 }
      );

      // Parse JSON response
      const content = llmResponse.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const score = Math.min(100, Math.max(0, Number(parsed.score) || 0));
          const justification = String(parsed.justification || 'No justification provided');

          logger.debug({
            model: LLM_JUDGE_MODEL,
            score,
            justification,
          }, 'LLM Judge evaluation completed');

          return {
            score,
            maxScore: 100,
            normalizedScore: score,
            justification: `[${LLM_JUDGE_MODEL}] ${justification}`,
            evaluatorType,
          };
        } catch (parseError) {
          logger.warn({ content, error: (parseError as Error).message }, 'Failed to parse LLM Judge JSON');
        }
      }

      // Fallback if JSON parsing fails
      logger.warn({ content }, 'Failed to extract JSON from LLM Judge response');
      return {
        score: 50,
        maxScore: 100,
        normalizedScore: 50,
        justification: `Failed to parse judge response: ${content.substring(0, 100)}...`,
        evaluatorType,
      };

    } catch (error) {
      logger.error({ error: (error as Error).message }, 'LLM Judge evaluation failed');
      return {
        score: 50,
        maxScore: 100,
        normalizedScore: 50,
        justification: `Judge evaluation error: ${(error as Error).message}`,
        evaluatorType,
      };
    }
  }

  /**
   * Normalize text for comparison
   * Lowercases, trims, normalizes whitespace, removes punctuation
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?;:'"]/g, '');
  }
}

// Singleton instance
let evaluatorInstance: Evaluator | null = null;

/**
 * Get the singleton evaluator instance
 */
export function getEvaluator(): Evaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new Evaluator();
  }
  return evaluatorInstance;
}
