import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import Profile from "../models/profile.js";
import { bearer, createSentence, createUser, tokenFor } from "./helpers.js";

// We never call Google in tests. vi.mock swaps the real google-auth-library
// for a fake whose verifyIdToken we control. vi.hoisted makes the fake
// function exist before vi.mock runs (vi.mock is moved to the top of the file).
const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken(...args) {
      return verifyIdToken(...args);
    }
  },
}));

// What a verified Google ID token's payload looks like.
const googlePayload = {
  sub: "google-new-user",
  given_name: "linus",
  family_name: "torvalds",
  email: "linus@example.com",
};

beforeEach(() => {
  verifyIdToken.mockReset();
  verifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
});

describe("POST /auth (exchange a Google ID token for our JWT)", () => {
  it("verifies the Google token against our client id", async () => {
    await request(app).post("/auth").send({ token: "google-id-token" });

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "google-id-token",
      audience: "test-google-client-id",
    });
  });

  it("creates a profile on first login, capitalising the names", async () => {
    const res = await request(app).post("/auth").send({ token: "t" });

    expect(res.status).toBe(200);
    const saved = await Profile.findOne({ id: "google-new-user" });
    expect(saved.firstName).toBe("Linus");
    expect(saved.lastName).toBe("Torvalds");
    expect(saved.email).toBe("linus@example.com");
    expect(res.body.user.id).toBe("google-new-user");
  });

  it("reuses the existing profile on later logins", async () => {
    await request(app).post("/auth").send({ token: "t" });
    await request(app).post("/auth").send({ token: "t" });

    expect(await Profile.countDocuments({ id: "google-new-user" })).toBe(1);
  });

  it("returns a JWT holding the Google id that expires after 1 hour", async () => {
    const res = await request(app).post("/auth").send({ token: "t" });

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe("google-new-user");
    expect(decoded.exp - decoded.iat).toBe(60 * 60);
  });

  it("CURRENT BUG: a rejected Google token returns 500 instead of 401", async () => {
    verifyIdToken.mockRejectedValue(new Error("Invalid token signature"));

    const res = await request(app).post("/auth").send({ token: "forged" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Google authentication failed");
  });
});

// The auth middleware guards every private route. GET /Login is the simplest
// one, so we use it to exercise the middleware.
describe("auth middleware (via GET /Login)", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await request(app).get("/Login");
    expect(res.status).toBe(401);
  });

  it("rejects a token that isn't a JWT", async () => {
    const res = await request(app)
      .get("/Login")
      .set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with a different secret", async () => {
    const forged = jwt.sign({ id: "google-user-1" }, "attacker-secret");
    const res = await request(app)
      .get("/Login")
      .set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const user = await createUser();
    const expired = tokenFor(user, { expiresIn: -10 });
    const res = await request(app)
      .get("/Login")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it("accepts a valid token and returns the user with their sentences", async () => {
    const user = await createUser();
    const sentence = await createSentence(user);
    await Profile.updateOne(
      { _id: user._id },
      { $push: { ownSentences: sentence._id } }
    );

    const res = await request(app).get("/Login").set("Authorization", bearer(user));

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("ada@example.com");
    expect(res.body.ownSentences[0].show).toBe("Clothes carpeted the floor.");
  });

  it("returns 404 when the token is valid but the user no longer exists", async () => {
    const user = await createUser();
    const auth = bearer(user);
    await Profile.deleteOne({ _id: user._id });

    const res = await request(app).get("/Login").set("Authorization", auth);
    expect(res.status).toBe(404);
  });
});

describe("POST /Logout", () => {
  it("responds 200", async () => {
    const res = await request(app).post("/Logout");
    expect(res.status).toBe(200);
  });

  it("CURRENT BUG: the token keeps working after logout", async () => {
    const user = await createUser();
    const auth = bearer(user);

    await request(app).post("/Logout").set("Authorization", auth);
    const res = await request(app).get("/Login").set("Authorization", auth);

    expect(res.status).toBe(200);
  });
});
