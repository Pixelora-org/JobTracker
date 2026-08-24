import { createClient } from "@/lib/supabase/server";
import { RESUME_BUCKET, type Resume } from "@/lib/types";

type ResumeRow = {
  id: string;
  user_id: string;
  label: string;
  file_name: string;
  file_path: string;
  size_bytes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const RESUME_COLUMNS =
  "id, user_id, label, file_name, file_path, size_bytes, notes, created_at, updated_at";

function toResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    fileName: row.file_name,
    filePath: row.file_path,
    sizeBytes: row.size_bytes,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listResumes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select(RESUME_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data as ResumeRow[]).map(toResume);
}

export async function createResume(
  input: {
    label: string;
    fileName: string;
    filePath: string;
    sizeBytes: number;
    notes?: string;
  },
  userId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      label: input.label.trim(),
      file_name: input.fileName,
      file_path: input.filePath,
      size_bytes: input.sizeBytes,
      notes: input.notes?.trim() || null,
    })
    .select(RESUME_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toResume(data as ResumeRow);
}

export async function deleteResume(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resumes")
    .select(RESUME_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);

  const resume = toResume(data as ResumeRow);

  // Remove the file first; a failed row delete would otherwise orphan it.
  const { error: storageError } = await supabase.storage
    .from(RESUME_BUCKET)
    .remove([resume.filePath]);
  if (storageError) throw new Error(storageError.message);

  const { error: deleteError } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id);
  if (deleteError) throw new Error(deleteError.message);
}

export async function createResumeDownloadUrl(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("file_path")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);

  const { data: signed, error: signError } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl((data as { file_path: string }).file_path, 60);
  if (signError) throw new Error(signError.message);

  return signed.signedUrl;
}
