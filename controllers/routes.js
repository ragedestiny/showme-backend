import mongoose from "mongoose";
import Profile, { Sentence, Tell } from "../models/sentences.js";
import tellList from "../public/tellList.js";

// Route for getting the Tell Sentences
export const getTellSentences = async (req, res) => {
  try {
    const NewList = await Promise.all(
      tellList.map(async (tell, i) => {
        const TellList = new Tell({
          key: tell.key,
          title: tell.title,
          tell: tell.tell,
        });
        const temp = await mongoose.connection.db
          .collection("tells")
          .find({ title: tell.title })
          .toArray();
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

    // When user first logged in, pull their existing sentences in the database
    if (req.body.firstName) {
      const Start = req.body.sentences;
      res.status(200).json(Start);
      return;
    }

    // When user edits and updates their sentence after it has been created
    if (typeof req.body[0] === "string") {
      const [userID, sentenceInfo, updateUserSentences] = req.body;
      await mongoose.connection.db
        .collection("profiles")
        .findOneAndUpdate(
          { id: userID },
          { $set: { sentences: updateUserSentences } }
        );
      await mongoose.connection.db.collection("sentences").findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(sentenceInfo._id) },
        {
          $set: {
            show: sentenceInfo.show,
            createdAt: sentenceInfo.createdAt,
          },
        }
      );
      res.status(200).json(updateUserSentences);
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
      mongoose.connection.db
        .collection("profiles")
        .findOneAndUpdate(
          { id: req.body.GID },
          { $push: { sentences: newSentence } }
        );
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
    const checkUser = await mongoose.connection.db
      .collection("profiles")
      .find({ id: req.body.sub })
      .toArray();

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
