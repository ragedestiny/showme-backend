import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import Profile from "../models/profile.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, given_name, family_name, email } = ticket.getPayload();

    let user = await Profile.findOne({ id: sub }).populate("ownSentences");

    if (!user) {
      const fName = given_name.charAt(0).toUpperCase() + given_name.slice(1);
      const lName = family_name
        ? family_name.charAt(0).toUpperCase() + family_name.slice(1)
        : "";

      user = new Profile({
        id: sub,
        firstName: fName,
        lastName: lName,
        email,
      });

      await user.save();
    }

    const customToken = jwt.sign({ id: sub }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ token: customToken, user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Google authentication failed", error: error.message });
  }
};
