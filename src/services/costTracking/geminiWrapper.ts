// Gemini API Wrapper - Tracks API calls and token usage

import { trackAPICall } from './costTracker';

export interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Estimate token count for text (rough approximation)
 * Gemini uses ~4 characters per token on average
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Make a tracked Gemini API call
 * Extracts token usage from response or estimates if not available
 */
export async function makeGeminiRequest(
  apiUrl: string,
  apiKey: string,
  requestBody: any,
  serviceName: string,
  functionName: string
): Promise<GeminiResponse> {
  // Make the API call
  const response = await fetch(`${apiUrl}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();

  // Extract token usage from response metadata
  let inputTokens = 0;
  let outputTokens = 0;

  if (data.usageMetadata) {
    // Use actual token counts if available
    inputTokens = data.usageMetadata.promptTokenCount || 0;
    outputTokens = data.usageMetadata.candidatesTokenCount || 0;
  } else {
    // Estimate token counts if metadata not available
    // Calculate input tokens from request
    const contents = requestBody.contents || [];
    let inputText = '';
    for (const content of contents) {
      for (const part of content.parts || []) {
        inputText += part.text || '';
      }
    }
    inputTokens = estimateTokens(inputText);

    // Calculate output tokens from response
    if (data.candidates && data.candidates.length > 0) {
      const outputText = data.candidates[0].content.parts[0]?.text || '';
      outputTokens = estimateTokens(outputText);
    }
  }

  // Track the API call
  trackAPICall(serviceName, functionName, inputTokens, outputTokens);

  return data;
}

/**
 * Helper to track a Gemini API call with estimated tokens
 * Use this when you can't modify the API call itself
 */
export function trackGeminiCall(
  serviceName: string,
  functionName: string,
  inputText: string,
  outputText: string
): void {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);

  trackAPICall(serviceName, functionName, inputTokens, outputTokens);
}
