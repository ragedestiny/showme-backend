import mongoose from "mongoose";

// User profile Schema
const profileSchema = new mongoose.Schema({
  id: {
    type: String,
    default: "test",
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
  },
  grade: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  dateJoined: {
    type: Date,
    default: new Date(),
  },
  ownSentences: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sentence",
    },
  ],
  likedSentences: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sentence",
    },
  ],
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;
