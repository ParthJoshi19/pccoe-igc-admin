import mongoose from "mongoose";

const TeamMemberSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "Member full name is required"],
    trim: true,
    maxlength: [100, "Full name cannot exceed 100 characters"],
  },
  gender: {
    type: String,
    required: [true, "Member gender is required"],
    enum: {
      values: ["male", "female", "other"],
      message: "Please select a valid gender",
    },
  },
  mobileNo: {
    type: String,
    required: [true, "Member mobile number is required"],
    trim: true,
    match: [/^\+?[1-9]\d{9,14}$/, "Please enter a valid mobile number in E.164 format (e.g. +12345678901)"],
  },
  email: {
    type: String,
    required: [true, "Member email is required"],
    trim: true,
    lowercase: true,
    match: [
      // Accepts emails with dots, underscores, hyphens, and multiple subdomains; allows trailing dots and plus signs.
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid email",
    ],
  },
}, { _id: false });

const DriveFileSchema = new mongoose.Schema({
  fileUrl: {
    type: String,
    required: true,
    match: [
      /^https:\/\/res\.cloudinary\.com\/[\w-]+\/.+\/.+$/,
      "Please provide a valid Cloudinary file URL"
    ]
  }
}, { _id: false });

const TeamRegistrationSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Team name cannot exceed 100 characters"],
    },

    leaderName: {
      type: String,
      required: [true, "Team leader name is required"],
      trim: true,
      maxlength: [100, "Leader name cannot exceed 100 characters"],
    },

    leaderEmail: {
      type: String,
      required: [true, "Team leader email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid leader email",
      ],
    },

    leaderMobile: {
      type: String,
      required: [true, "Leader mobile number is required"],
      trim: true,
      match: [/^\+?[1-9]\d{9,14}$/, "Please enter a valid leader mobile number in E.164 format (e.g. +12345678901)"],
    },

    leaderGender: {
      type: String,
      required: [true, "Leader gender is required"],
      enum: {
        values: ["male", "female", "other"],
        message: "Please select a valid gender",
      },
    },

    institution: {
      type: String,
      required: [true, "Institution name is required"],
      trim: true,
      maxlength: [200, "Institution name cannot exceed 200 characters"],
    },

    program: {
      type: String,
      required: [true, "Program is required"],
      enum: {
        values: [
          "B.Tech - Computer Engineering",
          "B.Tech - Information Technology",
          "B.Tech - Electronics & Telecommunication",
          "B.Tech - Mechanical Engineering",
          "B.Tech - Civil Engineering",
          "B.Tech - Electrical Engineering",
          "M.Tech - Computer Engineering",
          "M.Tech - Information Technology",
          "M.Tech - Electronics & Telecommunication",
          "MCA - Master of Computer Applications",
          "MBA - Master of Business Administration",
          "Other"
        ],
        message: "Please select a valid program",
      },
    }, country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
      maxlength: [100, "Country name cannot exceed 100 characters"],
    },

    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: [100, "State name cannot exceed 100 characters"],
    },

    members: {
      type: [TeamMemberSchema],
      default: [], // ensure undefined members don't break validation/virtuals
      validate: {
        validator: function (members: any) {
          const validMembers = (members || []).filter((member: { fullName: string; }) =>
            member.fullName && member.fullName.trim() !== ""
          );
          return validMembers.length >= 1 && validMembers.length <= 4;
        },
        message: "Team must have between 1-4 members (excluding leader)",
      },
    },

    // Section 2 - Mentor Details
    mentorName: {
      type: String,
      required: [true, "Mentor name is required"],
      trim: true,
      maxlength: [100, "Mentor name cannot exceed 100 characters"],
    },

    mentorEmail: {
      type: String,
      required: [true, "Mentor email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid mentor email",
      ],
    },

    mentorMobile: {
      type: String,
      required: [true, "Mentor mobile number is required"],
      trim: true,
      match: [/^\+?[1-9]\d{9,14}$/, "Please enter a valid mentor mobile number in E.164 format (e.g. +12345678901)"],
    },

    mentorInstitution: {
      type: String,
      required: [true, "Mentor institution is required"],
      trim: true,
      maxlength: [200, "Mentor institution cannot exceed 200 characters"],
    },

    mentorDesignation: {
      type: String,
      required: [true, "Mentor designation is required"],
      trim: true,
      maxlength: [100, "Mentor designation cannot exceed 100 characters"],
    },    // Section 3 - Document Uploads (Drive Links)
    instituteNOC: {
      type: DriveFileSchema,
      required: false,
    },

    idCardsPDF: {
      type: DriveFileSchema,
    },

    // Section 4 - Topic Submission
    topicName: {
      type: String,
      required: [true, "Topic name is required"],
      trim: true,
      maxlength: [200, "Topic name cannot exceed 200 characters"],
    },

    topicDescription: {
      type: String,
      required: [true, "Topic description is required"],
      trim: true,
    },

    track: {
      type: String,
      required: [true, "Track selection is required"],
      enum: {
        values: [
          "Climate Forecasting",
          "Smart Agriculture",
          "Disaster Management",
          "Green Transportation",
          "Energy Optimization",
          "Water Conservation",
          "Carbon Tracking",
          "Biodiversity Monitoring",
          "Sustainable Cities",
          "Waste Management",
          "Air Quality",
          "Deforestation Prevention",
          "Climate Education",
          "AI-based Environmental Data Analysis",
          "Public Health Impact of Climate Change",
          "Ocean & Marine Protection using AI"
        ],
        message: "Please select a valid track",
      },
    }, presentationPPT: {
      type: DriveFileSchema,
      required: [true, "Presentation PPT Cloudinary link is required"],
    },

    // New optional demo video URL (Cloudinary)
    videoLink: {
      type: String,
      trim: true,
    },

    // Administrative fields
    registrationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    teamId: {
      type: String,
      unique: true,
      sparse: true,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    approvedAt: {
      type: Date,
    },

    rejectedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total team size (including leader)
TeamRegistrationSchema.virtual('teamSize').get(function (this: any) {
  const validMembers = (this.members || []).filter((member: { fullName: string; }) =>
    member.fullName && member.fullName.trim() !== ""
  );
  return validMembers.length + 1; // +1 for leader
});

// Virtual for formatted registration number
TeamRegistrationSchema.virtual('formattedRegNumber').get(function (this: any) {
  if (this.registrationNumber) {
    return this.registrationNumber;
  }
  return null;
});

// Pre-save middleware to generate registration number for new teams
TeamRegistrationSchema.pre('save', async function (this: any, next: () => void) {
  if (this.isNew && !this.registrationNumber) {
    // Count all teams (including pending, approved, rejected)
    const count = await this.constructor.countDocuments({});
    this.registrationNumber = `PCCOEIGC${String(count + 1).padStart(3, '0')}`;
  }
  if (this.isNew && !this.teamId) {
    // Generate a unique teamId (e.g., IGC001)
    const count = await this.constructor.countDocuments({});
    this.teamId = `IGC${String(count + 1).padStart(3, '0')}`;
  }
  // Set approval timestamp if approved
  if (this.registrationStatus === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  // Set rejection timestamp
  if (this.registrationStatus === 'rejected' && !this.rejectedAt) {
    this.rejectedAt = new Date();
  }
  next();
});

// TeamRegistrationSchema.index({ teamName: 1 });
TeamRegistrationSchema.index({ 'members.email': 1 });
TeamRegistrationSchema.index({ mentorEmail: 1 });
TeamRegistrationSchema.index({ leaderEmail: 1 });
TeamRegistrationSchema.index({ registrationStatus: 1 });
TeamRegistrationSchema.index({ track: 1 });
TeamRegistrationSchema.index({ submittedAt: -1 });
TeamRegistrationSchema.index({ institution: 1 });

// Static method to find teams by track
TeamRegistrationSchema.statics.findByTrack = function (track: any) {
  return this.find({ track: track });
};

// Static method to get approved teams count
TeamRegistrationSchema.statics.getApprovedCount = function () {
  return this.countDocuments({ registrationStatus: 'approved' });
};

// Instance method to approve team
TeamRegistrationSchema.methods.approve = function () {
  this.registrationStatus = 'approved';
  return this.save();
};

// Instance method to reject team
TeamRegistrationSchema.methods.reject = function (reason: any) {
  this.registrationStatus = 'rejected';
  this.rejectionReason = reason;
  return this.save();
};

// Fix model export to reuse existing model (prevents OverwriteModelError in dev/HMR)
export default mongoose.models.teams || mongoose.model('teams', TeamRegistrationSchema);