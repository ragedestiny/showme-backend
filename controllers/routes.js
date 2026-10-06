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

// A show sentence must be text with something besides spaces and line breaks,
// so a blank one can't use up a day or wipe out a written one. The website
// checks this too, but anyone can send requests straight to the server.
const isBlank = (show) => typeof show !== "string" || show.trim() === "";
const BLANK_MESSAGE = "The show sentence can't be empty";

export const createNewUserSentence = async (req, res) => {
  try {
    // Only the sentence text comes from the browser. Who wrote it comes from
    // the verified token (req.userId), never from the request body, which
    // anyone can edit.
    const { show, title, tell } = req.body ?? {};
    if (isBlank(show)) {
      return res.status(400).json({ message: BLANK_MESSAGE });
    }

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
    if (isBlank(show)) {
      return res.status(400).json({ message: BLANK_MESSAGE });
    }
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
    // Newest (last edited) first. The database sorts, to the millisecond;
    // Date.parse on a Date drops the milliseconds, so it can't break ties.
    const awaitingApproval = await Sentence.find({
      approved: false,
      toRedo: false,
    })
      .sort({ createdAt: -1 })
      .populate("author");
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

    // send back the updated queue, newest first (sorted by the database)
    const awaitingApproval = await Sentence.find({
      approved: false,
      toRedo: false,
    })
      .sort({ createdAt: -1 })
      .populate("author");

    res.status(201).json(awaitingApproval);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

// fetch approved sentences from database
export const fetchApprovedSentences = async (req, res) => {
  try {
    // find all approved sentences, newest first (sorted by the database)
    const approvedSentences = await Sentence.find({
      approved: true,
    })
      .sort({ createdAt: -1 })
      .populate("author");

    res.status(200).json(approvedSentences);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};
