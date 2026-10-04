import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routerUrls from "./routes/routes.js";

// Build the Express app without starting it or connecting to a database,
// so tests can import it and supply their own throwaway database.
const app = express();

app.use(express.static("public"));

// Turn the request's text body into req.body. Express has this built in.
// A sentence is a few hundred bytes; 1mb leaves plenty of room while stopping
// anyone from tying up the server with huge requests.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(cors());
// Turns the browser's "Cookie: a=1; b=2" header into req.cookies = { a, b }
app.use(cookieParser());

// '/' will the be the start of all routes
app.use("/", routerUrls);

export default app;
