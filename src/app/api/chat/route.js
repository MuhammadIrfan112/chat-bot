import { GoogleGenAI } from '@google/genai';

// Initialize the Gen AI client using the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const { messages } = await req.json();
    
    // System prompt with context about SocialMedia110
    const systemInstruction = `You are a helpful and professional chatbot for SocialMedia110, a modern social media marketing agency.
Your goal is to help visitors understand the services offered, answer questions, and encourage them to get in touch.
Services offered: Short Form Content Editing, Long Form Content Editing, Graphic Design & Thumbnails, Social Media Management, Content Strategy & Audit.
Niches: SaaS, Tech & Apps, Personal Brands, E-commerce, Gaming & Esports, Real Estate, Finance & Crypto, Education.
Key selling points: 24/7 Support, Daily Updates, 1-on-1 Consultation, Advanced Storytelling.
Keep responses concise, polite, and directly related to SocialMedia110. Do not invent pricing, tell users to contact the agency for a custom quote.
Always maintain a friendly tone.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: messages,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return Response.json({ reply: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return Response.json({ error: "Failed to generate a response." }, { status: 500 });
  }
}
