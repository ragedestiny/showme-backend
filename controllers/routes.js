import Profile, { Sentence, Tell } from "../models/sentences.js";
import tellList from "../public/tellList.js";

// Route for getting the Tell Sentences
export const getTellSentences = async (req, res) => {
  try {
    // await Sentence.updateMany({}, { $set: { toRedo: false } });
    // await Profile.updateMany({}, [
    //   { $addFields: { "sentences.toRedo": false } },
    // ]);
    const NewList = await Promise.all(
      tellList.map(async (tell, i) => {
        const TellList = new Tell({
          key: tell.key,
          title: tell.title,
          tell: tell.tell,
        });
        const temp = await Tell.find({ title: tell.title });
        if (temp.length === 0) {
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

// Route for retrieving/creating/updating the User sentences
export const userSentences = async (req, res) => {
  try {
    // If no user logged in, return no sentences
    if (req.body?.length === 0) {
      return;
    }

    // Pull login user existing sentences from the database
    if (req.body.firstName) {
      const userID = req.body.id;
      const userSentences = await Sentence.find({ GID: userID });
      res.status(200).json(userSentences);
      return;
    }

    // When user edits and updates their sentence after it has been created
    if (typeof req.body[0] === "string") {
      // destructure required information
      const [userID, newSentence, sentenceInfo] = req.body;

      // find sentence to replace
      const [updateSentence] = await Sentence.find({
        GID: userID,
        title: sentenceInfo.title,
      });
      // update with new sentence
      updateSentence.show = newSentence;
      updateSentence.createdAt = new Date();
      updateSentence.toRedo = false;
      updateSentence.approved = false;
      await updateSentence.save();
      // send back updated sentence
      res.status(201).json(updateSentence);
      return;
    }

    if (req.body.show) {
      // When User creates a new show sentence
      const newSentence = new Sentence({
        title: req.body.title,
        tell: req.body.tell,
        show: req.body.show,
        author: req.body.author,
        GID: req.body.GID,
      });

      await newSentence.save();
      // add new sentence to the user own sentences
      await Profile.findOneAndUpdate(
        { id: req.body.GID },
        { $push: { ownSentences: newSentence._id } }
      );
      // send back newly created sentence
      res.status(201).json(newSentence);
    }
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

// Route for register/Retrieve/signout user
export const getUserInfo = async (req, res) => {
  // sign out user
  if (Object.keys(req.body).length === 0) {
    res.json();
    return;
  }

  // Register/Retrieve user
  try {
    // Check to see if user exists already
    const checkUser = await Profile.find({ id: req.body.sub }).populate(
      "ownSentences"
    );

    // Create new user, if new
    if (checkUser.length === 0) {
      const User = new Profile({
        id: req.body.sub,
        firstName: req.body.given_name,
        lastName: req.body.family_name,
        email: req.body.email,
      });
      const newUser = await User.save();
      res.status(201).json(newUser);
    } else {
      // Retrieve existing user info
      res.status(201).json(...checkUser);
    }
  } catch (error) {
    res.status(409).json({ message: error.message });
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
    const [status, user, sentence] = req.body;

    // check to see if user is admin - safe guard
    if (user.id !== process.env.ADMIN_ID)
      throw new Error("You are not the admin!");

    // find the target sentence in database
    const [checkedSentence] = await Sentence.find({ _id: sentence._id });

    // update status depending if approve or needs redo
    if (status === "approve") {
      checkedSentence.approved = true;
    } else if (status === "redo") {
      checkedSentence.toRedo = true;
    }
    await checkedSentence.save();

    // send back sorted updated sentences
    const awaitingApproval = await Sentence.find({
      approved: false,
      toRedo: false,
    }).populate("author");
    awaitingApproval.sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );

    res.status(201).json(awaitingApproval);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};
