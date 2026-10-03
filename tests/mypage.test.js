import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";
import Profile from "../models/profile.js";
import { Sentence } from "../models/sentences.js";
import { bearer, createSentence, createUser } from "./helpers.js";

const otherUser = () =>
  createUser({ id: "google-user-2", firstName: "Alan", email: "alan@example.com" });

describe("/MyPage requires a valid token", () => {
  it.each([
    ["get", "/MyPage"],
    ["post", "/MyPage"],
    ["patch", "/MyPage"],
  ])("%s %s without a token returns 401", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe("GET /MyPage", () => {
  it("returns only the signed-in user's sentences", async () => {
    const ada = await createUser();
    const alan = await otherUser();
    await createSentence(ada, { show: "Ada's sentence" });
    await createSentence(alan, { show: "Alan's sentence" });

    const res = await request(app).get("/MyPage").set("Authorization", bearer(ada));

    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.show)).toEqual(["Ada's sentence"]);
  });
});

describe("POST /MyPage", () => {
  it("creates a sentence and links it to the user's profile", async () => {
    const ada = await createUser();

    const res = await request(app)
      .post("/MyPage")
      .set("Authorization", bearer(ada))
      .send({
        title: "Day 1",
        tell: "It is cold outside.",
        show: "Frost bit my fingers.",
        author: ada._id,
        GID: ada.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.show).toBe("Frost bit my fingers.");
    const profile = await Profile.findById(ada._id);
    expect(profile.ownSentences.map(String)).toEqual([res.body._id]);
  });

  it("CURRENT BUG: trusts GID/author from the request body, so a user can post as someone else", async () => {
    const ada = await createUser();
    const alan = await otherUser();

    // Ada is signed in, but claims to be Alan in the body.
    const res = await request(app)
      .post("/MyPage")
      .set("Authorization", bearer(ada))
      .send({
        title: "Day 1",
        tell: "It is cold outside.",
        show: "Written by Ada, credited to Alan",
        author: alan._id,
        GID: alan.id,
      });

    expect(res.status).toBe(201);
    const saved = await Sentence.findById(res.body._id);
    expect(saved.GID).toBe(alan.id);
    const alanProfile = await Profile.findById(alan._id);
    expect(alanProfile.ownSentences.map(String)).toContain(res.body._id);
  });
});

describe("PATCH /MyPage", () => {
  it("replaces the user's sentence with that title and sends it back for review", async () => {
    const ada = await createUser();
    await createSentence(ada, { title: "Day 1", approved: true, toRedo: true });

    const res = await request(app)
      .patch("/MyPage")
      .set("Authorization", bearer(ada))
      .send({ title: "Day 1", show: "A better sentence." });

    expect(res.status).toBe(201);
    expect(res.body.show).toBe("A better sentence.");
    expect(res.body.approved).toBe(false);
    expect(res.body.toRedo).toBe(false);
  });

  it("can't edit another user's sentence (404)", async () => {
    const ada = await createUser();
    const alan = await otherUser();
    await createSentence(alan, { title: "Day 1" });

    const res = await request(app)
      .patch("/MyPage")
      .set("Authorization", bearer(ada))
      .send({ title: "Day 1", show: "Hijacked" });

    expect(res.status).toBe(404);
  });
});

describe("Sentence model", () => {
  it("CURRENT BUG: createdAt defaults to when the server started, not when the sentence was made", async () => {
    const ada = await createUser();
    const first = await createSentence(ada, { title: "a", createdAt: undefined });
    await new Promise((r) => setTimeout(r, 20));
    const second = await createSentence(ada, { title: "b", createdAt: undefined });

    // `default: new Date()` is evaluated once, when the model file loads.
    expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
  });
});
