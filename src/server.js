require("dotenv").config();

const app = require("./app");

const parsedPort = Number(process.env.PORT);
const port = Number.isFinite(parsedPort) ? parsedPort : 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
