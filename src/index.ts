import express from "express";
import cors from "cors";
import { useRouter } from "@/routes";

const app = express();
app.use(express.json());
app.use(cors());

const { router } = useRouter();
app.use(router);

app.listen(process.env.PORT || 5001, () => console.log("Server is running..."));
