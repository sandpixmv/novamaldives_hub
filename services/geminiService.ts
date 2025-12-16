import { GoogleGenAI } from "@google/genai";
import { ShiftData } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateHandoverSummary = async (shift: ShiftData): Promise<string> => {
  try {
    const ai = getAiClient();
    const completedCount = shift.tasks.filter(t => t.isCompleted).length;
    const totalCount = shift.tasks.length;
    const pendingTasks = shift.tasks.filter(t => !t.isCompleted).map(t => `- ${t.label} (${t.category})`).join('\n');
    const agentNotes = shift.notes || "No specific agent notes provided.";

    const prompt = `
      You are an AI assistant for a luxury resort in the Maldives called "Nova Maldives".
      Your task is to generate a professional, concise, and clear Shift Handover Report for the next GSA (Guest Service Agent).

      Shift Details:
      - Shift Type: ${shift.type}
      - Date: ${shift.date}
      - Agent: ${shift.agentName}
      - Occupancy: ${shift.occupancy}%
      - Task Completion: ${completedCount}/${totalCount}

      Pending Tasks (High Priority to Mention):
      ${pendingTasks}

      Agent's Log/Notes:
      ${agentNotes}

      Please format the report with these sections:
      1. **Shift Overview**: Brief summary of the shift status.
      2. **Pending Actions**: Bullet points of what the next shift MUST do immediately.
      3. **Operational Notes**: Summary of the agent's notes or general observations.
      4. **Guest Delight**: A generated suggestion for a guest delight activity based on the current occupancy (if high, suggest efficiency; if low, suggest personalized touches).

      Tone: Professional, warm, resort-hospitality style.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Error generating handover summary:", error);
    return "Error generating handover summary. Please check API key configuration.";
  }
};

export const getSmartTaskSuggestion = async (weather: string, timeOfDay: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const prompt = `
            Given the current weather is "${weather}" and it is "${timeOfDay}" at a luxury Maldives resort.
            Suggest one specific, actionable task for a Front Desk agent to improve guest experience right now.
            Keep it under 15 words.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Check lobby ambiance.";
    } catch (e) {
        return "Ensure cold towels are ready.";
    }
}