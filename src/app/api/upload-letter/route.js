import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: "File is required." }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `pre_approvals/${crypto.randomUUID()}.${fileExt}`;

    // Using bot_avatars bucket as it's already set up and public
    const { error: uploadError } = await supabase.storage
      .from('bot_avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('bot_avatars')
      .getPublicUrl(fileName);

    return Response.json({ success: true, url: publicUrl });

  } catch (error) {
    console.error("File Upload Error:", error);
    return Response.json({ error: "Internal server error during upload." }, { status: 500 });
  }
}
