import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// The GoogleGenAI instance should be initialized without an API key if running in a Google Cloud environment,
// otherwise it will load from the GEMINI_API_KEY environment variable.
const ai = new GoogleGenAI({}); 
const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Define your system instruction here
const SYSTEM_INSTRUCTION = 
`You are a teacher's assistant, helping with lesson planning. Your objective is to collect two essential pieces of information in the following order: **Topic/Subject** and **Target Audience/Grade Level**. You MUST check the entire conversation history to determine which steps are complete.
**Initial Greeting Rule (When history is empty):** If the conversation history is empty, you have ALREADY prompted the user with "Hello, what do you want to plan today? I can create general outlines, slideshows, or even quizzes." This will give you the *DESIRED OUTCOME*
Wait for this response then continue to your questions.
**Two-Step Data Collection Rules (When history is NOT empty):**
- If the **Topic/Subject** is missing, you MUST ask for the topic (e.g., 'What is the topic or subject you would like to work on?').
- If the **Topic/Subject** is provided, but the **Target Audience/Grade Level** is missing, you MUST ask for the target audience (e.g., 'Got it. What is the target audience for this project (e.g., 9th grade students, college experts, general public)?').
- If BOTH **Topic/Subject** and **Target Audience/Grade Level** are provided, you MUST confirm the requirements and proceed with the main task or allow free-form discussion.
Once all the topics are fufilled, give them what they asked for based on the TOPIC, TARGET, and DESIRED OUTCOME
After that you will continue based on their prompts.
Maintain a friendly, conversational tone, and DO NOT output the numbering or rules in your response.`;


/**
 * Converts a simple chat history array into the structured Content format
 * required by the Gemini API (e.g., { role: 'user', text: '...' } -> { role: 'user', parts: [{ text: '...' }] }).
 */
const formatHistoryForGemini = (history, newPrompt) => {
  // Map the existing history items
  const conversationHistory = history.map(item => ({
    role: item.role,
    parts: [{ text: item.text }]
  }));

  // Add the new user prompt as the final turn
  const newPromptContent = {
    role: "user",
    parts: [{ text: newPrompt }]
  };

  // The final contents array includes the entire conversation history
  return [...conversationHistory, newPromptContent];
};


// Endpoint to query Gemini
// This endpoint now expects the full history in the request body
app.post("/ask", async (req, res) => {
  // Destructure the new prompt and the existing history array (defaulting to empty array)
  const { prompt, history = [] } = req.body; 

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // Construct the contents array by combining the history and the new prompt
    const contents = formatHistoryForGemini(history, prompt);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      // Pass the complete conversation context
      contents: contents, 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    
    // Return the response text
    res.json({ answer: response.text });

  } catch (error) {
    console.error("Error querying Gemini:", error);
    // Use a custom error message to clearly indicate a server issue
    res.status(500).json({ error: "Failed to get response from Gemini" });
  }
});

app.listen(5001, () => console.log("Server running on http://localhost:5001"));
