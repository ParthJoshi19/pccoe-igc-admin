import mongoose from 'mongoose';

const RubricItemSchema = new mongoose.Schema(
  {
    criterion: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxScore: {
      type: Number,
      min: 1,
      default: 10,
    },
    comments: {
      type: String,
      trim: true,
    },
    judge: {
      type: String,
      trim: true,
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
    index: true
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  leaderEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  // Assigned judge identifier (e.g., judge's username/email)
  assignedJudge: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
    default: null,
  },
  videoUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(url: string) {
        // Validate YouTube URL format
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        return youtubeRegex.test(url);
      },
      message: 'Please provide a valid YouTube URL'
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // Evaluation fields
  rubrics: {
    type: [RubricItemSchema],
    default: [],
  },
  finalScore: {
    type: Number,
    min: 0,
    default: null,
  },
  status: {
    type: String,
    enum: ['Approved', 'Reject', 'Can be thought', 'Pending'],
    default: 'Pending',
    index: true,
  }
}, {
  timestamps: true
});

videoSchema.index({ teamId: 1 }, { unique: true });

// Reuse existing compiled model if present (prevents OverwriteModelError)
const Video = mongoose.models.Video || mongoose.model('Video', videoSchema);

export default Video;
