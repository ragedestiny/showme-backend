import { Sentence } from "../models/sentences.js";
import Profile from "../models/profile.js";
import tellList from "../public/tellList.js";
import { readSession } from "../middlewares/auth.js";
import { SESSION_COOKIE, sessionCookieOptions } from "../config/session.js";

// Route for getting the Tell Sentences. The list lives in the code
// (public/tellList.js), so it's sent straight from memory with no database
// round trips.
export const getTellSentences = (req, res) => {
  res.status(200).json(tellList);
};

export const getUserSentences = async (req, res) => {
  try {
    const userSentences = await Sentence.find({ GID: req.userId });

    res.status(200).json(userSentences);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const createNewUserSentence = async (req, res) => {
  try {
    // Only the sentence text comes from the browser. Who wrote it comes from
    // the verified token (req.userId), never from the request body, which
    // anyone can edit.
    const { show, title, tell } = req.body ?? {};

    const user = await Profile.findOne({ id: req.userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // When User creates a new show sentence
    const newSentence = new Sentence({
      title,
      tell,
      show,
      author: user._id,
      GID: user.id,
    });
    await newSentence.save();
    user.ownSentences.push(newSentence._id);
    await user.save();
    res.status(201).json(newSentence);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const editUserSentence = async (req, res) => {
  try {
    const { title, show } = req.body ?? {};
    // find sentence to replace
    const updateSentence = await Sentence.findOne({
      GID: req.userId,
      title: title,
    });

    if (!updateSentence) {
      return res.status(404).json({ message: "Sentence not found" });
    }

    // update with new sentence
    updateSentence.show = show;
    updateSentence.createdAt = new Date();
    updateSentence.toRedo = false;
    updateSentence.approved = false;
    await updateSentence.save();
    // send back updated sentence

    res.status(201).json(updateSentence);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    // If the request carries a valid login, bump the user's token version so
    // that token, and every copy of it, stops working.
    const session = readSession(req);
    if (session) {
      await Profile.updateOne({ id: session.id }, { $inc: { tokenVersion: 1 } });
    }

    // Always tell the browser to delete its cookie, even if the token was
    // missing or already expired. The options must match the ones it was set with.
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Route for register/Retrieve/signout user
export const getUserInfo = async (req, res) => {
  // Register/Retrieve user
  try {
    const user = await Profile.findOne({ id: req.userId }).populate(
      "ownSentences"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Route for fetching all sentences awaiting approval
export const getPendingApprovalSentences = async (req, res) => {
  try {
    // fetch all sentences that are not approved
    const awaitingApproval = await Sentence.find({
      approved: false,
      toRedo: false,
    }).populate("author");
    // sort sentences by date last edited
    awaitingApproval.sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
    res.status(200).json(awaitingApproval);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

// Route for approving or rejecting sentences
export const updatePendingApprovalSentences = async (req, res) => {
  try {
    // The admin middleware on this route has already checked isAdmin.
    const { status, sentence } = req.body ?? {};

    const checkedSentence = await Sentence.findById(sentence?._id);

    if (!checkedSentence) {
      return res.status(404).json({ message: "Sentence not found" });
    }

    // update status depending if approve or needs redo
    if (status === "approve") {
      checkedSentence.approved = true;
      checkedSentence.toRedo = false; // Ensure redo flag is cleared if approved
    } else if (status === "redo") {
      checkedSentence.toRedo = true;
      checkedSentence.approved = false; // Ensure approved flag is cleared if redo
    }
    await checkedSentence.save();

    // send back sorted updated sentences
    const awaitingApproval = await Sentence.find({
      approved: false,
      toRedo: false,
    }).populate("author");

    // Sort by creation date in descending order
    awaitingApproval.sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );

    res.status(201).json(awaitingApproval);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

// fetch approved sentences from database
export const fetchApprovedSentences = async (req, res) => {
  try {
    // find all approved sentences
    const approvedSentences = await Sentence.find({
      approved: true,
    }).populate("author");
    // sort the approved sentences by date created
    approvedSentences.sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );

    res.status(200).json(approvedSentences);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};
