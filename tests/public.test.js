import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";
import tellList from "../public/tellList.js";
import { createSentence, createUser } from "./helpers.js";

describe("GET / (tell sentences)", () => {
  it("returns every tell sentence, exactly as listed, without needing a login", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    // Straight from public/tellList.js: no database round trips, no _id fields.
    expect(res.body).toEqual(tellList);
  });
});

describe("GET /Collections (approved sentences)", () => {
  it("returns only approved sentences, newest first, with authors, without needing a login", async () => {
    const user = await createUser();
    await createSentence(user, { show: "old", approved: true, createdAt: new Date("2024-01-01") });
    await createSentence(user, { show: "new", approved: true, createdAt: new Date("2024-03-01") });
    await createSentence(user, { show: "pending" });

    const res = await request(app).get("/Collections");

    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.show)).toEqual(["new", "old"]);
    expect(res.body[0].author.firstName).toBe("Ada");
  });

  it("keeps newest first even for sentences written within the same second", async () => {
    const user = await createUser();
    // Saved first, 350 ms older: the database would hand it back first
    await createSentence(user, {
      show: "older",
      approved: true,
      createdAt: new Date("2026-10-06T04:02:45.643Z"),
    });
    await createSentence(user, {
      show: "newer",
      approved: true,
      createdAt: new Date("2026-10-06T04:02:45.993Z"),
    });

    const res = await request(app).get("/Collections");

    expect(res.body.map((s) => s.show)).toEqual(["newer", "older"]);
  });
});
