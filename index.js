// Settings come from .env (and .env.local in the emulator). Firebase loads
// them into process.env before this file runs, both when deployed and in the
// emulator, so no library is needed here.
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
