const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini client using API key from environment
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Helper: sanitize and trim messages to keep requests small and fast
function sanitizeMessages(raw, maxMessages = 8, maxChars = 500) {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw
    .filter(
      m =>
        m &&
        typeof m.content === 'string' &&
        // Includes 'model' (for Gemini history) and 'assistant' (for potential client history)
        ['user', 'assistant', 'model', 'system'].includes(m.role) 
    )
    .map(m => ({ role: m.role, content: m.content.slice(0, maxChars).trim() }));

  // Keep only last N non-system messages
  const nonSystem = cleaned.filter(m => m.role !== 'system');
  return nonSystem.slice(-maxMessages);
}

// Server-enforced system prompt: Trip Assistant only
const SERVER_SYSTEM_PROMPT = [
  'You are "Trip Assistant" for travel planning in India (itineraries, destinations, guides, hotels, safety, budgets).',
  'Only answer questions that are related to travel or planning trips in India. Be concise.', 
  'If a query is too vague, ask one follow-up question. Use bullet points for structured information.',
].join('\n');

// Timeout helper
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

// POST /api/chat
exports.createChatCompletion = async (req, res) => {
  try {
    // NOTE: We ignore the 'model' field from req.body to prevent the client from forcing old model names.
    const { messages = [] } = req.body; 

    // Validate and trim client messages
    const trimmed = sanitizeMessages(messages, 8, 500);
    
    if (trimmed.length === 0) {
        return res
            .status(400)
            .json({ message: 'messages must include at least one user/assistant item' });
    }

    const genAI = getGeminiClient();

    // *** FINAL FIX: Hardcode the correct and supported model here. ***
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Correctly map 'assistant' role to 'model' role for history
    const structuredMessages = trimmed.map(m => ({ 
        role: m.role === 'assistant' ? 'model' : m.role, 
        parts: [{ text: m.content }] 
    }));

    // Conservative generation settings
    const generationConfig = {
      temperature: 0.5, 
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 256,
    };

    // --- Core API Call ---
    const result = await withTimeout(
      geminiModel.generateContent({
        contents: structuredMessages,
        generationConfig: generationConfig,
        systemInstruction: SERVER_SYSTEM_PROMPT, 
      }),
      10000 // 10s timeout
    );

    const text = result?.response?.text?.();

    if (!text) {
        // If the model generates no text (e.g., due to safety filter)
        return res.status(200).json({ 
            reply: 'I am your Trip Assistant. Please ask a concise travel question (dates, destination, budget).', 
            model: 'gemini-2.5-flash',
            note: 'Model generated empty response or was filtered.'
        });
    }

    // Ensure the response object uses the correct role for future chat history in the client
    return res.status(200).json({ reply: text, model: 'gemini-2.5-flash', role: 'assistant' });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] CHAT ERROR:`, error);
    
    // Fallback logic for API key errors, timeouts, and general 500s
    const isTimeout = /timeout/i.test(String(error?.message || ''));
    const status = error.status || (isTimeout ? 504 : 500);
    
    let fallback;
    if (status === 404) {
        fallback = 'API Model Not Found. Check your model name is "gemini-2.5-flash".';
    } else if (status === 400) {
        fallback = 'Bad Request. Check roles in chat history are valid (user/model).';
    } else if (isTimeout) {
        fallback = 'Taking longer than expected. Please ask one specific travel question (dates, destination, budget).';
    } else {
        fallback = 'I could not generate a response right now. Please check server logs for API Key or other connection errors.';
    }

    return res.status(status).json({
      reply: fallback,
      message: 'Failed to get response from Gemini',
      error: error?.message || String(error),
    });
  }
};