import mongoose from 'mongoose';

// All times are wall-clock "HH:MM" strings and all dates "YYYY-MM-DD" strings in the
// business time zone (site.timeZone), so they mean the same thing on any server.

const rangeSchema = new mongoose.Schema({
    start: { type: String, required: true },
    end:   { type: String, required: true },
}, { _id: false });

const weeklySchema = new mongoose.Schema({
    day:    { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    ranges: { type: [rangeSchema], default: [] },              // empty = closed
}, { _id: false });

// A date that uses its own hours instead of the weekly ones. No ranges = closed that day.
const overrideSchema = new mongoose.Schema({
    date:   { type: String, required: true },
    ranges: { type: [rangeSchema], default: [] },
    note:   { type: String, default: '' },
});

// Blocks out every day from startDate to endDate (inclusive). With startTime/endTime it
// blocks only those hours on each of those days; without them the whole day.
const blockSchema = new mongoose.Schema({
    startDate: { type: String, required: true },
    endDate:   { type: String, required: true },
    startTime: { type: String, default: null },
    endTime:   { type: String, default: null },
    reason:    { type: String, default: '' },
});

// Single document holding the whole schedule.
const scheduleSchema = new mongoose.Schema({
    weekly:         { type: [weeklySchema], default: [] },
    slotStep:       { type: Number, default: 30 },  // minutes between offered start times
    bufferMinutes:  { type: Number, default: 0 },   // gap kept free after each appointment
    minNoticeHours: { type: Number, default: 24 },  // earliest bookable time from now
    maxAdvanceDays: { type: Number, default: 60 },  // how far ahead clients can book
    overrides:      { type: [overrideSchema], default: [] },
    blocks:         { type: [blockSchema], default: [] },
});

if (process.env.NODE_ENV !== 'production' && mongoose.models.Schedule) {
    mongoose.deleteModel('Schedule');
}

export default mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);
