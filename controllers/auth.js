import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import Profile from "../models/profile.js";
import {
  SESSION_COOKIE,
  SESSION_SECONDS,
  sessionCookieOptions,
} from "../config/session.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  const { token } = req.body;

  // Check the Google token on its own, so a bad token gets 401 ("show valid
  // ID") instead of 500 ("our server broke").
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid Google token" });
  }

  try {
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

    // v = the user's current token version; logging out changes it.
    const customToken = jwt.sign(
      { id: sub, v: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: SESSION_SECONDS }
    );

    // The browser stores this cookie and sends it back on every request.
    // Express wants maxAge in milliseconds.
    res.cookie(SESSION_COOKIE, customToken, {
      ...sessionCookieOptions,
      maxAge: SESSION_SECONDS * 1000,
    });

    // The token travels only in the httpOnly cookie, never in the body, where
    // scripts in the page could read it.
    res.status(200).json({ user });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Google authentication failed", error: error.message });
  }
};
