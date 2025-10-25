import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({});
const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Endpoint to query Gemini
app.post("/ask", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 500,
      }
    });
    res.json({ answer: response.text });

  } catch (error) {
    console.error("Error querying Gemini:", error);
    res.status(500).json({ error: "Failed to get response from Gemini" });
  }
});

app.listen(5001, () => console.log("Server running on http://localhost:5001"));

