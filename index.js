// Must be the first import: ES module imports all run before the rest of the
// file, so this loads .env before any other module reads process.env.
import "dotenv/config";
import * as functions from "firebase-functions";
import mongoose from "mongoose";
import app from "./app.js";

mongoose.set("strictQuery", false);
// Connect to mongodb via mongoose. DATABASE_NAME overrides the database in the
// connection string; set it in .env.local so only the emulator uses the dev DB.
mongoose
  .connect(process.env.DATABASE_ACCESS, {
    dbName: process.env.DATABASE_NAME,
  })
  .catch((error) => console.log(error.message));

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);
