import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      // Note: hash this before saving in any write API
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "judge"],
      default: "judge",
      index: true,
    },
    // Optional manager linkage if you use it in UI
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    // Assigned team IDs (store TeamRegistration.teamId strings)
    assignedTeams: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Reuse existing model to avoid OverwriteModelError
export default mongoose.models.User || mongoose.model("User", UserSchema);
