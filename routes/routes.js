import express from "express";
import {
  userSentences,
  getTellSentences,
  getUserInfo,
} from "../controllers/routes.js";

const router = express.Router();

// Route for create/update/fetch user sentences
router.post("/MyPage", userSentences);

// Route for fetching Tell sentences
router.get("/Login", getTellSentences);

// Route for getting user info
router.post("/Login", getUserInfo);

export default router;
