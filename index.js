import * as dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import routesUrls from "./routes/routes.js";
dotenv.config();

const app = express();

app.use(express.static("public"));

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

// '/' will the be the start of all routes
app.use("/", routesUrls);

const PORT = process.env.PORT || 5000;

mongoose.set("strictQuery", false);
// Connect to mongodb via mongoose
mongoose
  .connect(process.env.DATABASE_ACCESS, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() =>
    app.listen(PORT, () => console.log(`Server running on port : ${PORT}`))
  )
  .catch((error) => console.log(error.message));
