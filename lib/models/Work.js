import mongoose from 'mongoose';

const workSchema = new mongoose.Schema({
    title:            { type: String, required: true },
    description:      { type: String, default: '' },
    type:             { type: String, enum: ['photo', 'video'], default: 'photo' },
    coverImage:       { type: String, default: null },
    images:           { type: [String], default: [] },
    videoLink:        { type: String, default: null },
    videoFile:        { type: String, default: null }, // Cloudinary video URL, played on-page
    tags:             { type: [String], default: [] },
    featured:         { type: Boolean, default: false },
    isSubscriberOnly: { type: Boolean, default: false },
    status:           { type: String, enum: ['published', 'draft'], default: 'published' },
    slug:             { type: String, required: true, unique: true },
    createdAt:        { type: Date, default: Date.now },
    updatedAt:        { type: Date, default: Date.now },
});

workSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.models.Work || mongoose.model('Work', workSchema);
