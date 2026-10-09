'use server';
import { connectDB } from '@/lib/db';
import Comment from '@/lib/models/Comment';
import User from '@/lib/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function addComment(prevState, formData) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.status !== 'active') {
        return { message: 'You must be an active subscriber to comment.' };
    }

    const body     = formData.get('body')?.trim();
    const postId   = formData.get('postId');
    const postType = formData.get('postType');
    const parentId = formData.get('parentId') || null;

    if (!body) return { message: 'Comment cannot be empty.' };

    await connectDB();
    const user = await User.findOne({ email: session.user.email });

    const newComment = await Comment.create({
        postId,
        postType,
        userId: user._id,
        parentId: parentId || null,
        body,
    });

    return {
        message: null,
        success: true,
        comment: {
            _id:        newComment._id.toString(),
            parentId:   parentId || null,
            body,
            createdAt:  newComment.createdAt.toISOString(),
            userName:   session.user.name,
            userEmail:  session.user.email,
            userId:     session.user.id,
            userActive: session.user.status === 'active' || session.user.role === 'admin',
        },
    };
}

export async function deleteComment(prevState, formData) {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false };

    const commentId = formData.get('commentId');
    const isAdmin   = session.user.role === 'admin';

    await connectDB();
    const comment = await Comment.findById(commentId);
    if (!comment) return { success: false };

    const isOwner = comment.userId.toString() === session.user.id;
    if (!isAdmin && !isOwner) return { success: false };

    if (!isAdmin) {
        const hasReply = await Comment.exists({ parentId: commentId });
        if (hasReply) return { success: false };
    }

    await Comment.findByIdAndDelete(commentId);
    return { success: true, commentId };
}

export async function editComment(prevState, formData) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.status !== 'active') {
        return { message: 'Not authorized.' };
    }

    const commentId = formData.get('commentId');
    const body      = formData.get('body')?.trim();

    if (!body) return { message: 'Comment cannot be empty.' };

    await connectDB();
    const comment = await Comment.findById(commentId);
    if (!comment) return { message: 'Comment not found.' };

    if (comment.userId.toString() !== session.user.id) {
        return { message: 'Not authorized.' };
    }

    const hasReply = await Comment.exists({ parentId: commentId });
    if (hasReply) return { message: 'Cannot edit a comment that has replies.' };

    await Comment.findByIdAndUpdate(commentId, { body });
    return { message: null, success: true, commentId, body };
}
