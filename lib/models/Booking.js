import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    // Null for bookings the admin adds by hand for someone without an account.
    user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    clientName:      { type: String, required: true },
    clientEmail:     { type: String, default: '' },
    clientPhone:     { type: String, default: '' },
    service:         { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
    // Copied at booking time so later service edits don't rewrite history.
    serviceName:     { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    start:           { type: Date, required: true, index: true },
    end:             { type: Date, required: true },
    // Only approved bookings take the time slot.
    status:          { type: String, enum: ['pending', 'approved', 'declined', 'cancelled'], default: 'pending', index: true },
    clientNote:      { type: String, default: '' },
    adminNote:       { type: String, default: '' }, // sent to the client when declining
    createdBy:       { type: String, enum: ['client', 'admin'], default: 'client' },
    decidedAt:       { type: Date, default: null },
    createdAt:       { type: Date, default: Date.now },
});

if (process.env.NODE_ENV !== 'production' && mongoose.models.Booking) {
    mongoose.deleteModel('Booking');
}

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
