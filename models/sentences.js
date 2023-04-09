import mongoose from "mongoose";

// Tell sentence schema
const tellSchema = new mongoose.Schema({
  key: Number,
  title: String,
  tell: String,
});

// User sentence schema
const sentenceSchema = new mongoose.Schema({
  title: String,
  tell: String,
  show: String,
  hideedit: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
  },
  toRedo: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  GID: String,
});

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
    required: true,
  },
  grade: {
    type: String,
  },
  email: String,
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
});

// Creating mongoose model
const Tell = mongoose.model("Tell", tellSchema);
const Sentence = mongoose.model("Sentence", sentenceSchema);
const Profile = mongoose.model("Profile", profileSchema);

export default Profile;
export { Sentence, Tell };
