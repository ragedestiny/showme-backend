import Profile from "../models/profile.js";

const admin = async (req, res, next) => {
  try {
    const user = await Profile.findOne({ id: req.userId });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default admin;
