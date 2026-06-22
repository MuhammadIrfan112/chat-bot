import { supabase } from '@/lib/supabaseClient';
import pdf from 'pdf-parse';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const bot_id = formData.get('bot_id');

    if (!file || !bot_id) {
      return Response.json({ error: "File and bot_id are required." }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    let parsedText = '';

    // Handle parsing based on file type
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const data = await pdf(buffer);
        parsedText = data.text;
      } catch (err) {
        return Response.json({ error: "Failed to parse PDF file. Ensure it is a valid PDF." }, { status: 400 });
      }
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      parsedText = buffer.toString('utf-8');
    } else {
      return Response.json({ error: "Unsupported file type. Please upload a PDF or TXT file." }, { status: 400 });
    }

    // Clean up text
    const cleanText = parsedText.replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      return Response.json({ error: "No readable text found in the file." }, { status: 400 });
    }

    // Chunk the text to avoid making the DB records too large (roughly 1500 chars per chunk)
    const chunkSize = 1500;
    const chunks = [];
    for (let i = 0; i < cleanText.length; i += chunkSize) {
      chunks.push({
        bot_id: bot_id,
        content: cleanText.substring(i, i + chunkSize)
      });
    }

    // Insert chunks into knowledge base
    const { error } = await supabase
      .from('knowledge_base')
      .insert(chunks);

    if (error) throw error;

    return Response.json({ success: true, chunks_added: chunks.length });

  } catch (error) {
    console.error("File Upload Error:", error);
    return Response.json({ error: "Internal server error during upload." }, { status: 500 });
  }
}
