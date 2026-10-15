const { app, db } = require("./app");

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  console.log(`Task API listening at http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
