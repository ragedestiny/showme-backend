import jwt from "jsonwebtoken";
import Profile from "../models/profile.js";
import { Sentence } from "../models/sentences.js";

// Create a user in the test database. `id` is the Google account id ("sub").
export const createUser = (overrides = {}) =>
  Profile.create({
    id: "google-user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    ...overrides,
  });

export const createAdmin = (overrides = {}) =>
  createUser({
    id: "google-admin-1",
    firstName: "Grace",
    email: "grace@example.com",
    isAdmin: true,
    ...overrides,
  });

// Sign a JWT exactly the way controllers/auth.js does after a Google login.
export const tokenFor = (user, options = { expiresIn: "1h" }) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, options);

export const bearer = (user) => `Bearer ${tokenFor(user)}`;

// The Cookie header a browser sends back after logging in.
export const sessionCookie = (user) => `session=${tokenFor(user)}`;

export const createSentence = (user, overrides = {}) =>
  Sentence.create({
    title: "The room was messy.",
    tell: "The room was messy.",
    show: "Clothes carpeted the floor.",
    author: user._id,
    GID: user.id,
    ...overrides,
  });
