import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import routerUrls from "./routes/routes.js";

// Build the Express app without starting it or connecting to a database,
// so tests can import it and supply their own throwaway database.
const app = express();

app.use(express.static("public"));

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

// '/' will the be the start of all routes
app.use("/", routerUrls);

export default app;
