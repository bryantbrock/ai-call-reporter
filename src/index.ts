import express from "express";
import justcallRoutes from "./routes/justcall";

const app = express();
app.use(express.json());

app.use("/justcall", justcallRoutes);

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`🚀 Listening on ${port}`);
});
