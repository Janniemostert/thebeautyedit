import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    postId:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    postType:  { type: String, enum: ['work'], required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    body:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Comment || mongoose.model('Comment', commentSchema);
