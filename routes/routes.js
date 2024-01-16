import express from "express";
import {
  userSentences,
  editUserSentences,
  getTellSentences,
  getUserInfo,
  getPendingApprovalSentences,
  updatePendingApprovalSentences,
  fetchApprovedSentences,
} from "../controllers/routes.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("this works!");
});

// Route for create/update/fetch user sentences
router.post("/MyPage", userSentences);
router.put("/MyPage", editUserSentences);

// Route for fetching Tell sentences
router.get("/Login", getTellSentences);

// Route for getting user info
router.post("/Login", getUserInfo);

// Route for getting sentences awaiting approval
router.get("/Admin", getPendingApprovalSentences);

// Route for updating status on sentences awaiting approval
router.patch("/Admin", updatePendingApprovalSentences);

// Route for getting approved sentences
router.get("/Collections", fetchApprovedSentences);

export default router;
