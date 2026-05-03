import mongoose from 'mongoose';

const cellSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    ownerId: { type: String, required: true },
    color: { type: String, required: true },
  },
  { timestamps: true }
);

cellSchema.index({ x: 1, y: 1 }, { unique: true });

export default mongoose.model('Cell', cellSchema);
