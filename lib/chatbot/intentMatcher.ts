import { IntentMatch, IntentDefinition } from './types';
import { INTENT_DEFINITIONS } from './intents';

export function matchIntent(input: string): IntentMatch {
  const normalizedInput = input.toLowerCase().trim();
  let bestMatch: IntentMatch = {
    intent: 'unknown',
    confidence: 0,
    extractedEntities: {}
  };

  for (const definition of INTENT_DEFINITIONS) {
    const { confidence, entities } = calculateMatch(normalizedInput, definition);

    if (confidence > bestMatch.confidence) {
      bestMatch = {
        intent: definition.intent,
        confidence,
        extractedEntities: entities
      };
    }
  }

  // Threshold for minimum confidence
  if (bestMatch.confidence < 0.3) {
    bestMatch.intent = 'unknown';
  }

  return bestMatch;
}

function calculateMatch(
  input: string,
  definition: IntentDefinition
): { confidence: number; entities: Record<string, string> } {
  let score = 0;
  const entities: Record<string, string> = {};

  // Pattern matching (higher weight - 0.6)
  for (const pattern of definition.patterns) {
    if (pattern.test(input)) {
      score += 0.6;
      break;
    }
  }

  // Keyword matching (0.15 per keyword, max 0.45)
  const keywordMatches = definition.keywords.filter(
    keyword => input.includes(keyword.toLowerCase())
  );
  score += Math.min(keywordMatches.length * 0.15, 0.45);

  // Entity extraction bonus (0.1)
  if (definition.entityExtractors) {
    for (const extractor of definition.entityExtractors) {
      const match = input.match(extractor.pattern);
      if (match) {
        entities[extractor.name] = match[1] || match[0];
        score += 0.1;
      }
    }
  }

  return {
    confidence: Math.min(score, 1.0),
    entities
  };
}

// Helper to parse Korean price string to number
export function parseKoreanPrice(priceStr: string): number {
  // Remove commas and parse
  const cleaned = priceStr.replace(/,/g, '');
  const num = parseInt(cleaned, 10);

  // Handle Korean number suffixes
  if (priceStr.includes('만')) {
    return num * 10000;
  }

  return num;
}
