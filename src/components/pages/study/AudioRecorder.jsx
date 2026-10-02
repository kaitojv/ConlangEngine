// src/components/pages/study/AudioRecorder.jsx
// Creator-side recorder for course phrase pronunciation clips.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import toast from 'react-hot-toast';
import { Mic, Square, Trash2, Play, Pause, Upload } from 'lucide-react';
import {
    uploadCourseAudio,
    deleteCourseAudio,
    getCourseAudioUrl,
    pickRecorderMime,
    MAX_RECORDING_SECONDS
} from '@/utils/courseAudio.js';
import './audioRecorder.css';

/**
 * Records (or accepts a file upload of) pronunciation audio for one phrase and
 * writes the resulting storage path back through `onChange`.
 *
 * Deliberately degrades gracefully: with no microphone, no MediaRecorder, or no
 * session, the file-upload path still works and the creator is told why.
 */
export default function AudioRecorder({ phrase, projectId, onChange }) {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [isBusy, setIsBusy] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sessionUser, setSessionUser] = useState(null);

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const fileRef = useRef(null);

    const audioPath = phrase?.audioPath || '';
    const audioUrl = audioPath ? getCourseAudioUrl(audioPath) : '';

    useEffect(() => {
        let active = true;
        supabase.auth.getSession().then(({ data }) => {
            if (active) setSessionUser(data?.session?.user || null);
        });
        return () => { active = false; };
    }, []);

    // Stop any in-flight timer when unmounting so we never setState after teardown.
    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
        }
    }, []);

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    const handleUpload = useCallback(async (blob, mimeType) => {
        setIsBusy(true);
        try {
            const path = await uploadCourseAudio({
                blob,
                userId: sessionUser?.id,
                projectId,
                phraseId: phrase.id,
                mimeType
            });
            onChange('audioPath', path);
            toast.success('Audio attached');
        } catch (err) {
            toast.error(err.message || 'Could not upload audio.');
        } finally {
            setIsBusy(false);
        }
    }, [sessionUser, projectId, phrase, onChange]);

    const startRecording = async () => {
        if (typeof MediaRecorder === 'undefined') {
            toast.error('This browser cannot record audio. Use the upload button instead.');
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            toast.error('Microphone access is unavailable. Use the upload button instead.');
            return;
        }
        if (!sessionUser) {
            toast.error('Sign in to attach recorded audio to your course.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = pickRecorderMime();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                chunksRef.current = [];
                if (blob.size > 0) handleUpload(blob, blob.type);
                setIsRecording(false);
            };

            recorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setElapsed(0);

            timerRef.current = setInterval(() => {
                setElapsed((prev) => {
                    if (prev + 1 >= MAX_RECORDING_SECONDS) {
                        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
                        return MAX_RECORDING_SECONDS;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            toast.error(err.name === 'NotAllowedError'
                ? 'Microphone permission denied.'
                : 'Could not start recording.');
        }
    };

const stopRecording = () => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleRemove = async () => {
        if (audioPath) await deleteCourseAudio(audioPath);
        onChange('audioPath', '');
        toast.success('Audio removed');
    };

    const handleFilePick = (e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file, file.type);
        e.target.value = '';
    };

    const togglePreview = () => {
        if (!audioRef.current) return;
        if (audioRef.current.paused) {
            audioRef.current.play();
            setIsPlaying(true);
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    return (
        <div className="ar-wrapper">
            <div className="ar-header">
                <span className="ar-label">Pronunciation Audio</span>
                {audioPath && <span className="ar-badge">Attached</span>}
            </div>

            {audioPath ? (
                <div className="ar-controls">
                    <Button variant="default" onClick={togglePreview} style={{ padding: '8px' }} title={isPlaying ? 'Stop' : 'Preview'}>
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        preload="metadata"
                        className="ar-audio"
                    />
                    <Button variant="error" onClick={handleRemove} style={{ padding: '8px' }} title="Remove audio">
                        <Trash2 size={16} />
                    </Button>
                </div>
            ) : (
                <div className="ar-controls">
                    {isRecording ? (
                        <Button variant="error" onClick={stopRecording} style={{ padding: '8px' }}>
                            <Square size={16} />
                            <span className="ar-timer">{formatTime(elapsed)}</span>
                        </Button>
                    ) : (
                        <Button variant="imp" onClick={startRecording} disabled={isBusy} style={{ padding: '8px' }}>
                            <Mic size={16} />
                        </Button>
                    )}

                    <label className="ar-upload" title="Upload an audio file">
                        <input ref={fileRef} type="file" accept="audio/*" onChange={handleFilePick} style={{ display: 'none' }} />
                        <Upload size={16} />
                    </label>

                    {isBusy && <span className="ar-status">Uploading…</span>}
                </div>
            )}

            <p className="ar-hint">
                {audioPath
                    ? 'Students hear this clip from the lesson.'
                    : `Optional. Record up to ${Math.floor(MAX_RECORDING_SECONDS / 60)} min, or upload a file. Max 10 MB.`}
            </p>
        </div>
    );
}
