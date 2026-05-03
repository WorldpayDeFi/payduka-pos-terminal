import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const dlHandler = (_req: express.Request, res: express.Response) => {
  const filePath = path.resolve(process.cwd(), "../../ico-deploy/index.html");
  res.setHeader("Content-Disposition", 'attachment; filename="index.html"');
  res.setHeader("Content-Type", "text/html");
  res.sendFile(filePath);
};

app.get("/download", dlHandler);
app.get("/api-server/download", dlHandler);

export default app;
