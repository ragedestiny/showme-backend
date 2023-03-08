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
  approved: {
    type: Boolean,
    default: false,
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
  sentences: [sentenceSchema],
});

// Creating mongoose model
const Tell = mongoose.model("Tell", tellSchema);
const Sentence = mongoose.model("Sentence", sentenceSchema);
const Profile = mongoose.model("Profile", profileSchema);

export default Profile;
export { Sentence, Tell };
