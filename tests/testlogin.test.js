import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import Profile from "../models/profile.js";
import { tokenFromLogin } from "./helpers.js";

// A secret long enough for the test login door to agree to open
const SECRET = "a-long-random-test-login-secret-0123456789";

// Each test chooses its own settings; restore the real ones afterwards
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /auth/test (test-only login, for automated browser tests on staging)", () => {
  describe("when the door is open (staging)", () => {
    beforeEach(() => {
      vi.stubEnv("TEST_LOGIN_SECRET", SECRET);
      vi.stubEnv("GCLOUD_PROJECT", "showme-staging");
    });

    it("logs in as the test student and sets the same session cookie a Google login does", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "student" });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ firstName: "Test", isAdmin: false });
      expect(res.body.token).toBeUndefined(); // never in the body
      expect(res.headers["set-cookie"][0]).toMatch(/^session=.*HttpOnly/);

      // The cookie works on a page that needs a login
      const mypage = await request(app)
        .get("/MyPage")
        .set("Cookie", `session=${tokenFromLogin(res)}`);
      expect(mypage.status).toBe(200);
    });

    it("logs in as the test admin, who can open the admin page", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.user.isAdmin).toBe(true);
      const adminPage = await request(app)
        .get("/Admin")
        .set("Cookie", `session=${tokenFromLogin(res)}`);
      expect(adminPage.status).toBe(200);
    });

    it("reuses the same test account on every login instead of creating new ones", async () => {
      await request(app).post("/auth/test").send({ secret: SECRET, role: "student" });
      await request(app).post("/auth/test").send({ secret: SECRET, role: "student" });

      expect(await Profile.countDocuments({ id: "test-student" })).toBe(1);
    });

    it("refuses a wrong secret", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: "wrong", role: "student" });

      expect(res.status).toBe(401);
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("refuses a missing secret or body", async () => {
      const res = await request(app).post("/auth/test");
      expect(res.status).toBe(401);
    });

    it("refuses an unknown role", async () => {
      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "superuser" });
      expect(res.status).toBe(400);
    });
  });

  describe("when the door must stay shut", () => {
    it("doesn't exist when no secret is configured (production never gets one)", async () => {
      vi.stubEnv("TEST_LOGIN_SECRET", "");
      vi.stubEnv("GCLOUD_PROJECT", "showme-staging");

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: "", role: "student" });
      expect(res.status).toBe(404);
    });

    it("stays shut on the production project even if a secret is set by mistake", async () => {
      vi.stubEnv("TEST_LOGIN_SECRET", SECRET);
      vi.stubEnv("GCLOUD_PROJECT", "showme-backend-789");

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: SECRET, role: "admin" });
      expect(res.status).toBe(404);
    });

    it("stays shut when the secret is too short to be safe", async () => {
      vi.stubEnv("TEST_LOGIN_SECRET", "short");
      vi.stubEnv("GCLOUD_PROJECT", "showme-staging");

      const res = await request(app)
        .post("/auth/test")
        .send({ secret: "short", role: "admin" });
      expect(res.status).toBe(404);
    });
  });
});
