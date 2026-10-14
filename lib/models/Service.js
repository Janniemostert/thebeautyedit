import mongoose from 'mongoose';

// A bookable service, e.g. "Bridal makeup" (120 min). Its duration decides which start times fit.
const serviceSchema = new mongoose.Schema({
    name:            { type: String, required: true },
    description:     { type: String, default: '' },
    durationMinutes: { type: Number, required: true, min: 5 },
    price:           { type: String, default: '' }, // free text, e.g. "R850" or "From R1 200"
    active:          { type: Boolean, default: true },
    order:           { type: Number, default: 0 },
    createdAt:       { type: Date, default: Date.now },
});

if (process.env.NODE_ENV !== 'production' && mongoose.models.Service) {
    mongoose.deleteModel('Service');
}

export default mongoose.models.Service || mongoose.model('Service', serviceSchema);
