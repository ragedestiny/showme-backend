import { Sentence, Tell } from "../models/sentences.js";
import Profile from "../models/profile.js";
import tellList from "../public/tellList.js";

// Route for getting the Tell Sentences
export const getTellSentences = async (req, res) => {
  try {
    // await Profile.updateMany({}, [
    //   { $addFields: { "sentences.toRedo": false } },
    // ]);
    // await Profile.updateMany({}, { $set: { isAdmin: false } });
    const NewList = await Promise.all(
      tellList.map(async (tell) => {
        const TellList = new Tell({
          key: tell.key,
          title: tell.title,
          tell: tell.tell,
          image: tell.image,
        });
        const existingTell = await Tell.find({ title: tell.title });
        if (!existingTell) {
          await TellList.save();
        }
        return TellList;
      })
    );
    res.status(200).json(NewList);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
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
    const { show, title, tell, author, GID } = req.body;

    // When User creates a new show sentence
    const newSentence = new Sentence({ title, tell, show, author, GID });
    await newSentence.save();
    await Profile.findOneAndUpdate(
      { id: GID },
      { $push: { ownSentences: newSentence._id } }
    );
    res.status(201).json(newSentence);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const editUserSentence = async (req, res) => {
  try {
    const { title, show } = req.body;
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
  // Sign out User
  res.json();
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
    const user = await Profile.findOne({ id: req.userId });

    if (!user.isAdmin) {
      return res.status(403).json({ message: "You are not the admin!" });
    }
    const { status, sentence } = req.body;

    const checkedSentence = await Sentence.findById(sentence._id);

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

    res.status(201).json(approvedSentences);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};
