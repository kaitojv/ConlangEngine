import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../../UI/Modal/Modal.jsx';
import { supabase } from '../../../utils/supabaseClient.js';
import { getConlangIcon } from '../../../utils/iconMap.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { Send, Trash2, MessageSquare, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import './commentsModal.css';

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffSeconds < 60) return 'just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export default function CommentsModal({ 
    isOpen, 
    onClose, 
    conlang, 
    sessionUser, 
    onCommentsCountChange 
}) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [commentText, setCommentText] = useState('');
    const commentsListRef = useRef(null);

    const onCountChangeRef = useRef(onCommentsCountChange);
    useEffect(() => {
        onCountChangeRef.current = onCommentsCountChange;
    });

    const projectId = conlang?.project_id;
    const config = conlang?.project_data?.config || {};
    const conlangName = config.conlangName || 'Unnamed Conlang';
    const conlangIcon = config.conlangIcon || '🌐';
    const conlangAuthor = config.authorName || 'Unknown Author';
    const projectOwnerId = conlang?.user_id;

    // Fetch comments for current project
    const fetchComments = useCallback(async (pId) => {
        if (!pId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('conlang_comments')
                .select('*')
                .eq('project_id', pId)
                .order('created_at', { ascending: true });

            if (error) {
                // If the table is not created yet, log a gentle warning instead of crash
                if (error.code === '42P01') {
                    console.warn('conlang_comments table not yet created in Supabase.');
                } else {
                    throw error;
                }
            } else if (data) {
                setComments(data);
                onCountChangeRef.current?.(pId, data.length);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
            toast.error('Could not load comments');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen || !projectId) {
            setComments([]);
            setCommentText('');
            return;
        }

        fetchComments(projectId);

        // Realtime subscription
        const channel = supabase
            .channel(`comments_room_${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conlang_comments',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setComments((prev) => {
                            if (prev.some((c) => c.id === payload.new.id)) return prev;
                            const next = [...prev, payload.new];
                            onCountChangeRef.current?.(projectId, next.length);
                            return next;
                        });
                        setTimeout(() => {
                            if (commentsListRef.current) {
                                commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
                            }
                        }, 100);
                    } else if (payload.eventType === 'DELETE') {
                        setComments((prev) => {
                            const next = prev.filter((c) => c.id !== payload.old.id);
                            onCountChangeRef.current?.(projectId, next.length);
                            return next;
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setComments((prev) =>
                            prev.map((c) => (c.id === payload.new.id ? payload.new : c))
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, projectId, fetchComments]);

    const handleSubmitComment = async (e) => {
        e?.preventDefault();
        const trimmed = commentText.trim();
        if (!trimmed || !sessionUser || !projectId || submitting) return;

        if (trimmed.length > 1000) {
            toast.error('Comment exceeds maximum length of 1,000 characters.');
            return;
        }

        setSubmitting(true);
        try {
            const storeAuthorName = useConfigStore.getState().authorName;
            const userMetadata = sessionUser.user_metadata || {};
            const displayName =
                storeAuthorName && storeAuthorName !== 'Author Name'
                    ? storeAuthorName
                    : userMetadata.full_name ||
                      userMetadata.name ||
                      userMetadata.user_name ||
                      sessionUser.email?.split('@')[0] ||
                      'Community Member';

            const { data, error } = await supabase
                .from('conlang_comments')
                .insert({
                    project_id: projectId,
                    user_id: sessionUser.id,
                    author_name: displayName,
                    content: trimmed
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setComments((prev) => {
                    if (prev.some((c) => c.id === data.id)) return prev;
                    const next = [...prev, data];
                    onCountChangeRef.current?.(projectId, next.length);
                    return next;
                });
            }

            setCommentText('');
            setTimeout(() => {
                if (commentsListRef.current) {
                    commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
                }
            }, 100);
        } catch (err) {
            console.error('Error posting comment:', err);
            toast.error(err.message || 'Failed to post comment. Ensure the Supabase table is created.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

        try {
            const { error } = await supabase
                .from('conlang_comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            setComments((prev) => {
                const next = prev.filter((c) => c.id !== commentId);
                onCountChangeRef.current?.(projectId, next.length);
                return next;
            });
            toast.success('Comment removed');
        } catch (err) {
            console.error('Error deleting comment:', err);
            toast.error('Failed to delete comment');
        }
    };

    const modalTitle = (
        <div className="comments-modal-header-title">
            <div className="comments-modal-conlang-icon">
                {getConlangIcon(conlangIcon, 22)}
            </div>
            <div className="comments-modal-title-text">
                <h3 className="comments-modal-conlang-name">{conlangName}</h3>
                <span className="comments-modal-subtitle">
                    <User size={11} /> by {conlangAuthor}
                    <span className="comments-modal-count-badge">
                        <MessageSquare size={11} /> {comments.length}
                    </span>
                </span>
            </div>
        </div>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={modalTitle}
            className="comments-modal-container"
        >
            <div className="comments-modal-body">
                {/* Scrollable list */}
                <div className="comments-list" ref={commentsListRef}>
                    {loading ? (
                        <div className="comments-loading-state">
                            <Loader2 size={24} className="comments-spin-icon" />
                            <span>Loading discussion...</span>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="comments-empty-state">
                            <MessageSquare size={36} opacity={0.4} />
                            <h4>No comments yet</h4>
                            <p>
                                Be the first to share your thoughts, questions, or feedback on {conlangName}!
                            </p>
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const isCreator = comment.user_id === projectOwnerId;
                            const canDelete =
                                sessionUser &&
                                (sessionUser.id === comment.user_id ||
                                    sessionUser.id === projectOwnerId);

                            const initial = (comment.author_name || 'U').charAt(0).toUpperCase();

                            return (
                                <div key={comment.id} className="comment-item">
                                    <div className="comment-avatar">
                                        {initial}
                                    </div>
                                    <div className="comment-main">
                                        <div className="comment-header-row">
                                            <div className="comment-author-info">
                                                <span className="comment-author-name">
                                                    {comment.author_name}
                                                </span>
                                                {isCreator && (
                                                    <span className="comment-creator-badge">
                                                        Creator
                                                    </span>
                                                )}
                                                <span className="comment-timestamp">
                                                    {formatRelativeTime(comment.created_at)}
                                                </span>
                                            </div>
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    className="comment-delete-btn"
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    title="Delete comment"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="comment-content">{comment.content}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Comment Input */}
                <div className="comments-input-area">
                    {sessionUser ? (
                        <form onSubmit={handleSubmitComment}>
                            <div className="comments-textarea-wrapper">
                                <textarea
                                    className="comments-textarea"
                                    placeholder={`Leave a comment on ${conlangName}...`}
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    maxLength={1000}
                                    rows={3}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            handleSubmitComment(e);
                                        }
                                    }}
                                />
                            </div>
                            <div className="comments-form-footer">
                                <span
                                    className={`comments-char-count ${
                                        commentText.length > 900
                                            ? 'error'
                                            : commentText.length > 750
                                            ? 'warning'
                                            : ''
                                    }`}
                                >
                                    {commentText.length} / 1,000
                                </span>
                                <button
                                    type="submit"
                                    className="comments-submit-btn"
                                    disabled={!commentText.trim() || submitting}
                                >
                                    {submitting ? (
                                        <Loader2 size={14} className="comments-spin-icon" />
                                    ) : (
                                        <Send size={14} />
                                    )}
                                    <span>{submitting ? 'Posting...' : 'Post'}</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="comments-guest-notice">
                            Sign in to join the discussion and leave feedback on this conlang.
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
