// src/utils/courseAudio.js
//
// Storage helpers for creator-recorded pronunciation audio attached to course
// phrases.
//
// Design note: a phrase stores only the *storage path* (a short string like
// "<userId>/<projectId>/phrase-123.webm"), never base64 audio. This matters
// because customCourse is embedded in project_data, gzipped, and pushed to
// Supabase on every autosync — inlining base64 audio would bloat that payload
// by orders of magnitude.
//
// The bucket is public-read so shared courses (PublicViewer) can play clips
// for anonymous visitors; RLS still restricts writes to the owner's folder.
// To move to private buckets + signed URLs later, only getCourseAudioUrl()
// needs to change.

import { supabase } from '@/utils/supabaseClient.js';

export const COURSE_AUDIO_BUCKET = 'course-audio';

/** Matches the file_size_limit in the bucket definition. */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/** Recording is capped so a runaway tab cannot produce a huge upload. */
export const MAX_RECORDING_SECONDS = 120;

const EXT_BY_MIME = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav'
};

export const extensionForMime = (mime) => EXT_BY_MIME[mime] || 'webm';

/**
 * Picks a recorder MIME type the current browser actually supports.
 * Safari notably refuses audio/webm, hence the ordered fallback.
 */
export const pickRecorderMime = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return candidates.find((m) => {
        try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
    }) || '';
};

const safeSegment = (value) =>
    String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'unknown';

/**
 * Builds the storage path for a clip. The first segment MUST be the owner's
 * user id — the RLS policies key off `foldername(name))[1]`.
 */
export const buildAudioPath = ({ userId, projectId, phraseId, extension }) =>
    `${safeSegment(userId)}/${safeSegment(projectId)}/${safeSegment(phraseId)}.${safeSegment(extension)}`;

/** Resolves a stored path to a playable URL. */
export const getCourseAudioUrl = (path) => {
    if (!path) return '';
    const { data } = supabase.storage.from(COURSE_AUDIO_BUCKET).getPublicUrl(path);
    return data?.publicUrl || '';
};

/**
 * Uploads a recorded/uploaded clip and returns its storage path.
 * Throws on failure so the caller can surface a toast and keep editing.
 */
export const uploadCourseAudio = async ({ blob, userId, projectId, phraseId, mimeType }) => {
    if (!blob) throw new Error('No audio data to upload.');
    if (blob.size > MAX_AUDIO_BYTES) {
        throw new Error(`Recording is too large (${(blob.size / 1048576).toFixed(1)} MB). Maximum is 10 MB.`);
    }
    if (!userId) throw new Error('You must be signed in to attach audio.');

    const extension = extensionForMime(mimeType || blob.type);
    const path = buildAudioPath({ userId, projectId, phraseId, extension });

    // upsert: replaces a previous clip for the same phrase without failing.
    const { error } = await supabase.storage
        .from(COURSE_AUDIO_BUCKET)
        .upload(path, blob, { contentType: mimeType || blob.type, upsert: true });

    if (error) throw error;
    return path;
};

/** Removes a clip. Safe to call when the path no longer exists. */
export const deleteCourseAudio = async (path) => {
    if (!path) return;
    try {
        await supabase.storage.from(COURSE_AUDIO_BUCKET).remove([path]);
    } catch {
        // Non-fatal: the phrase reference is dropped by the caller regardless.
    }
};
