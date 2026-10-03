import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";
import tellList from "../public/tellList.js";
import { Tell } from "../models/sentences.js";
import { createSentence, createUser } from "./helpers.js";

describe("GET / (tell sentences)", () => {
  it("returns every tell sentence without needing a login", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(tellList.length);
    expect(res.body[0]).toMatchObject({ key: 1, title: "Day 1" });
  });

  it("CURRENT QUIRK: never saves tells to the database (Tell.find returns [], which is truthy)", async () => {
    await request(app).get("/");
    expect(await Tell.countDocuments()).toBe(0);
  });
});

describe("GET /Collections (approved sentences)", () => {
  it("returns only approved sentences, newest first, with authors, without needing a login", async () => {
    const user = await createUser();
    await createSentence(user, { show: "old", approved: true, createdAt: new Date("2024-01-01") });
    await createSentence(user, { show: "new", approved: true, createdAt: new Date("2024-03-01") });
    await createSentence(user, { show: "pending" });

    const res = await request(app).get("/Collections");

    // CURRENT QUIRK: a read responds 201 Created instead of 200 OK.
    expect(res.status).toBe(201);
    expect(res.body.map((s) => s.show)).toEqual(["new", "old"]);
    expect(res.body[0].author.firstName).toBe("Ada");
  });
});
