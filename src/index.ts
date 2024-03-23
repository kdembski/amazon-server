import express from "express";
import cors from "cors";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: "./.env.local" });
}

const app = express();
app.use(express.json());
app.use(cors());

app.listen(process.env.PORT || 3000, () => console.log("Server is running..."));
