import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name:             { type: String, required: true },
    email:            { type: String, required: true, unique: true },
    phone:            { type: String, default: '' },
    // Only set for email + password accounts. Google-only accounts have no password.
    passwordHash:     { type: String, default: null, select: false },
    role:             { type: String, enum: ['admin', 'subscriber'], default: 'subscriber' },
    status:           { type: String, enum: ['pending', 'active', 'suspended', 'cancelled'], default: 'pending' },
    subscriptionTier: { type: String, enum: ['1month', '6months', '1year', 'lifetime'], default: null },
    accessGrantedAt:  { type: Date, default: null },
    accessExpiresAt:  { type: Date, default: null },
    createdAt:        { type: Date, default: Date.now },
});

// Re-register in development so schema edits take effect without a restart (see Work.js).
if (process.env.NODE_ENV !== 'production' && mongoose.models.User) {
    mongoose.deleteModel('User');
}

export default mongoose.models.User || mongoose.model('User', userSchema);
