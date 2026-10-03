import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import routerUrls from "./routes/routes.js";

// Build the Express app without starting it or connecting to a database,
// so tests can import it and supply their own throwaway database.
const app = express();

app.use(express.static("public"));

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());
// Turns the browser's "Cookie: a=1; b=2" header into req.cookies = { a, b }
app.use(cookieParser());

// '/' will the be the start of all routes
app.use("/", routerUrls);

export default app;
