function extractJSONFromAIResponse(aiResponse) {
  try {
    // Try parsing directly first (in case response is pure JSON)
    return JSON.parse(aiResponse);
  } catch (firstError) {
    try {
      // Handle Markdown-style responses with ```json wrapper
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Handle cases where AI might have added explanations
      const lastCurlyBracket = aiResponse.lastIndexOf('}');
      const firstCurlyBracket = aiResponse.indexOf('{');
      if (firstCurlyBracket !== -1 && lastCurlyBracket !== -1) {
        return JSON.parse(
          aiResponse.slice(firstCurlyBracket, lastCurlyBracket + 1)
        );
      }

      throw new Error('No valid JSON found in AI response');
    } catch (secondError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error(
        `Could not extract JSON from AI response: ${secondError.message}`
      );
    }
  }
}
