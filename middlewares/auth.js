import jwt from "jsonwebtoken";
import { SESSION_COOKIE } from "../config/session.js";
import Profile from "../models/profile.js";

// Find the login token on the request. The session cookie is the new way.
// TEMPORARY: the "Authorization: Bearer <token>" header is the old way, still
// accepted so the frontend that's live today keeps working until it's updated.
const findToken = (req) => {
  if (req.cookies?.[SESSION_COOKIE]) {
    return req.cookies[SESSION_COOKIE];
  }
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  return scheme === "Bearer" ? token : undefined;
};

// The token's contents ({ id, v }) if it's present, correctly signed and not
// expired; otherwise null.
export const readSession = (req) => {
  const token = findToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const auth = async (req, res, next) => {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Tokens issued before versions existed have no v; treat them as 0.
    const user = await Profile.findOne({ id: session.id }, "tokenVersion");
    if (!user || user.tokenVersion !== (session.v ?? 0)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.userId = session.id; // the Google id from our custom JWT
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default auth;
