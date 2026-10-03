import jwt from "jsonwebtoken";
import { SESSION_COOKIE } from "../config/session.js";

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

const auth = (req, res, next) => {
  const token = findToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decodedData?.id; // Extract the user ID from the custom JWT

    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export default auth;
