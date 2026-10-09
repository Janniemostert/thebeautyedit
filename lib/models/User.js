import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name:             { type: String, required: true },
    email:            { type: String, required: true, unique: true },
    role:             { type: String, enum: ['admin', 'subscriber'], default: 'subscriber' },
    status:           { type: String, enum: ['pending', 'active', 'suspended', 'cancelled'], default: 'pending' },
    subscriptionTier: { type: String, enum: ['1month', '6months', '1year', 'lifetime'], default: null },
    accessGrantedAt:  { type: Date, default: null },
    accessExpiresAt:  { type: Date, default: null },
    createdAt:        { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', userSchema);
