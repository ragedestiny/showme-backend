import express from "express";
import {
  userSentences,
  getTellSentences,
  getUserInfo,
  getPendingApprovalSentences,
  updatePendingApprovalSentences,
} from "../controllers/routes.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("this works!");
});

// Route for create/update/fetch user sentences
router.post("/MyPage", userSentences);

// Route for fetching Tell sentences
router.get("/Login", getTellSentences);

// Route for getting user info
router.post("/Login", getUserInfo);

// Route for getting sentences awaiting approval
router.get("/Admin", getPendingApprovalSentences);

// Route for updating status on sentences awaiting approval
router.post("/Admin", updatePendingApprovalSentences);

export default router;
