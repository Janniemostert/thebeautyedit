'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { addComment, deleteComment, editComment } from '@/lib/commentActions';
import md5 from 'md5';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import classes from './comments.module.css';

const initialState = { message: null };

function SubmitButton({ label = 'Post Comment' }) {
    const { pending } = useFormStatus();
    return <button type="submit" disabled={pending} className={classes.submitBtn}>{pending ? 'Saving...' : label}</button>;
}

function CommentForm({ postId, postType, slug, parentId = null, onCancel = null, onAdded }) {
    const [state, formAction] = useFormState(addComment, initialState);
    const formRef = useRef(null);
    useEffect(() => {
        if (state?.success && state.comment) {
            onAdded(state.comment);
            formRef.current?.reset();
            if (onCancel) onCancel();
        }
    }, [state]);
    return (
        <form ref={formRef} action={formAction} className={classes.form}>
            <input type="hidden" name="postId"   value={postId} />
            <input type="hidden" name="postType" value={postType} />
            <input type="hidden" name="slug"     value={slug} />
            {parentId && <input type="hidden" name="parentId" value={parentId} />}
            {state?.message && <p className={classes.error}>{state.message}</p>}
            <textarea name="body" rows={3} placeholder={parentId ? 'Write a reply...' : 'Write a comment...'} required />
            <div className={classes.formActions}>
                <SubmitButton label="Post Comment" />
                {onCancel && <button type="button" onClick={onCancel} className={classes.cancelBtn}>Cancel</button>}
            </div>
        </form>
    );
}

function EditCommentForm({ comment, slug, onCancel, onEdited }) {
    const [state, formAction] = useFormState(editComment, initialState);
    useEffect(() => {
        if (state?.success) {
            onEdited(state.commentId, state.body);
            onCancel();
        }
    }, [state]);
    return (
        <form action={formAction} className={classes.editForm}>
            <input type="hidden" name="commentId" value={comment._id} />
            <input type="hidden" name="slug"      value={slug} />
            {state?.message && <p className={classes.error}>{state.message}</p>}
            <textarea name="body" rows={3} defaultValue={comment.body} required />
            <div className={classes.formActions}>
                <SubmitButton label="Save" />
                <button type="button" onClick={onCancel} className={classes.cancelBtn}>Cancel</button>
            </div>
        </form>
    );
}

function DeleteCommentForm({ commentId, slug, onDeleted }) {
    const [state, formAction] = useFormState(deleteComment, initialState);
    useEffect(() => {
        if (state?.success) onDeleted(state.commentId);
    }, [state]);
    return (
        <form action={formAction} style={{ display: 'inline' }}>
            <input type="hidden" name="commentId" value={commentId} />
            <input type="hidden" name="slug"      value={slug} />
            <button
                type="submit"
                className={classes.deleteBtn}
                onClick={(e) => { if (!confirm('Delete this comment?')) e.preventDefault(); }}
            >
                Delete
            </button>
        </form>
    );
}

function CommentNode({ comment, allComments, postId, postType, slug, depth = 0, currentUserId, isAdmin, onAdded, onEdited, onDeleted }) {
    const [replying, setReplying] = useState(false);
    const [editing,  setEditing]  = useState(false);

    const emailHash   = md5(comment.userEmail.trim().toLowerCase());
    const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=32`;
    const replies     = allComments.filter((c) => c.parentId === comment._id);
    const hasReplies  = replies.length > 0;

    const isOwner  = currentUserId && currentUserId === comment.userId;
    const canEdit  = isOwner && !hasReplies && comment.userActive;
    const canDelete = (isOwner && !hasReplies) || isAdmin;
    const canReply  = depth < 3 && comment.userActive;

    return (
        <div
            className={`${classes.comment} ${!comment.userActive ? classes.inactiveComment : ''}`}
            style={{ marginLeft: depth > 0 ? '2rem' : '0' }}
        >
            <div className={classes.commentHeader}>
                <Image src={gravatarUrl} alt={comment.userName} width={32} height={32} className={classes.avatar} unoptimized />
                <span className={classes.author}>{comment.userName}</span>
                {!comment.userActive && <span className={classes.inactiveTag}>inactive</span>}
                <span className={classes.date}>{new Date(comment.createdAt).toISOString().slice(0, 10)}</span>
            </div>

            {editing ? (
                <EditCommentForm
                    comment={comment}
                    slug={slug}
                    onCancel={() => setEditing(false)}
                    onEdited={onEdited}
                />
            ) : (
                <p className={classes.body}>{comment.body}</p>
            )}

            {!editing && (
                <div className={classes.actionBtns}>
                    {canReply && (
                        <button onClick={() => setReplying(!replying)} className={classes.replyBtn}>
                            {replying ? 'Cancel' : 'Reply'}
                        </button>
                    )}
                    {canEdit && (
                        <button onClick={() => setEditing(true)} className={classes.editBtn}>Edit</button>
                    )}
                    {canDelete && (
                        <DeleteCommentForm commentId={comment._id} slug={slug} onDeleted={onDeleted} />
                    )}
                </div>
            )}

            {replying && (
                <CommentForm
                    postId={postId}
                    postType={postType}
                    slug={slug}
                    parentId={comment._id}
                    onCancel={() => setReplying(false)}
                    onAdded={onAdded}
                />
            )}

            {replies.map((reply) => (
                <CommentNode
                    key={reply._id}
                    comment={reply}
                    allComments={allComments}
                    postId={postId}
                    postType={postType}
                    slug={slug}
                    depth={depth + 1}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onAdded={onAdded}
                    onEdited={onEdited}
                    onDeleted={onDeleted}
                />
            ))}
        </div>
    );
}

export default function Comments({ postId, postType, slug, comments: initialComments, canComment, currentUserId, isAdmin }) {
    const [comments, setComments] = useState(initialComments);
    const topLevel = comments.filter((c) => !c.parentId);

    function handleAdded(comment) {
        setComments((prev) => [...prev, comment]);
    }

    function handleEdited(commentId, body) {
        setComments((prev) => prev.map((c) => c._id === commentId ? { ...c, body } : c));
    }

    function handleDeleted(commentId) {
        setComments((prev) => prev.filter((c) => c._id !== commentId && c.parentId !== commentId));
    }

    return (
        <section className={classes.section}>
            <h3>Comments ({comments.length})</h3>
            {canComment
                ? <CommentForm postId={postId} postType={postType} slug={slug} onAdded={handleAdded} />
                : <p className={classes.loginNote}>Active subscribers can comment. <a href="/auth/signin">Sign in</a></p>
            }
            <div className={classes.list}>
                {topLevel.map((comment) => (
                    <CommentNode
                        key={comment._id}
                        comment={comment}
                        allComments={comments}
                        postId={postId}
                        postType={postType}
                        slug={slug}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        onAdded={handleAdded}
                        onEdited={handleEdited}
                        onDeleted={handleDeleted}
                    />
                ))}
                {comments.length === 0 && <p className={classes.empty}>No comments yet. Be the first!</p>}
            </div>
        </section>
    );
}
