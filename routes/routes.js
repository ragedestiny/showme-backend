import express from "express";
import {
  getUserSentences,
  createNewUserSentence,
  editUserSentence,
  getTellSentences,
  getUserInfo,
  getPendingApprovalSentences,
  updatePendingApprovalSentences,
  fetchApprovedSentences,
  logoutUser,
} from "../controllers/routes.js";
import { googleAuth } from "../controllers/auth.js";
import { testLogin } from "../controllers/testLogin.js";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/admin.js";

const router = express.Router();

router.get("/", getTellSentences); // Fetch Tell sentences on the home route

router.post("/auth", googleAuth); // Google authentication route
// Login for automated browser tests; only works on staging (see testLogin.js)
router.post("/auth/test", testLogin);

// Route for create/update/fetch user sentences
router.get("/MyPage", auth, getUserSentences);
router.post("/MyPage", auth, createNewUserSentence);
router.patch("/MyPage", auth, editUserSentence);

// // Route for fetching Tell sentences
// router.get("/Login", getTellSentences);
// Route for getting user info
router.get("/Login", auth, getUserInfo);

// Route for logging out user
router.post("/Logout", logoutUser);

// Route for getting sentences awaiting approval
router.get("/Admin", auth, admin, getPendingApprovalSentences);
// Route for updating status on sentences awaiting approval
router.patch("/Admin", auth, admin, updatePendingApprovalSentences);

// Route for getting approved sentences
router.get("/Collections", fetchApprovedSentences);

export default router;
