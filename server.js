const express = require("express");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const { body, validationResult } = require("express-validator");

//Use Express and delcare port
const app = express();
const port = 3000;

//Use methodoverride for delete/put
app.use(methodOverride("_method"));

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

// Custom format function for morgan
morgan.token("custom", (req, res) => {
  // Format the date and time
  const now = new Date();
  const formattedDate = now.toISOString().slice(0, 10);
  const formattedTime = now.toTimeString().split(" ")[0];

  // Get the requested URL
  const requestUrl = req.originalUrl || req.url;

  // Get the error information
  const errorType = res.locals.errorType || "None";
  const errorDescription = res.locals.errorDescription || "None";

  // Build the log string
  let logString = `${formattedDate} ${formattedTime} | ${res.statusCode} | Error: ${errorType} - ${errorDescription}| Request URL: ${requestUrl}`;

  // Check if there is a full error message
  if (res.locals.fullError) {
    // Add a new line and the full error message
    logString += `\nFull Error: ${res.locals.fullError}`;
  }

  return logString;
});

// Setup morgan middleware with the custom format
app.use(morgan(":custom", { stream: accessLogStream }));
// Setup body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Use EJS as viewport
app.set("view engine", "ejs");

//Use styles and public
app.use(express.static(path.join(__dirname, "public")));
app.use("/styles", express.static(path.join(__dirname, "styles")));

//GET endpoint that fetches the list of files and render them into a template

const createFileValidator = [
  body("filename").notEmpty().withMessage("Filename is required"),
  body("filename")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Special characters in filename. Only alphanumeric, underscore, and hyphen are allowed."
    ),
];

// Custom validation middleware for update endpoint
const updateFileValidator = [
  body("newFilename").notEmpty().withMessage("New filename is required"),
  body("newFilename")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Special characters in filename. Only alphanumeric, underscore, and hyphen are allowed."
    ),
];

// Fettch index render and render the list of data
app.get("/", async (req, res, next) => {
  try {
    const directoryPath = path.join(__dirname, "Data");
    const files = await fs.promises.readdir(directoryPath);
    const txtFiles = files.filter((file) => path.extname(file) === ".txt");

    res.render("index", { files: txtFiles });
  } catch (error) {
    console.error("Error rendering index page:", error);

    next(error);
  }
});
//GET endpoint that fetches the details of a file and renders it into the template
app.get("/details/:fileName", async (req, res, next) => {
  const fileName = req.params.fileName;

  try {
    const filePath = path.join(__dirname, "Data", fileName);
    console.log(filePath);
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    res.render("details", { fileName, content: fileContent });
  } catch (error) {
    next(error);
  }
});

//Render create page content
app.get("/create", (req, res) => {
  try {
    res.render("create");
  } catch (error) {
    console.log(error);
    next(error);
  }
});

//Post endpoint that creates file in the Data folder from the body of the request
app.post("/create", createFileValidator, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors.array().map((error) => error.msg) });
  }

  try {
    const { filename, content } = req.body;

    const fixedFileName = `${filename}.txt`;

    const filePath = path.join(__dirname, "Data", fixedFileName);

    await fs.promises.writeFile(filePath, content, "utf-8");

    res.redirect("/");
  } catch (error) {
    console.log("Error creating file");
    next(error);
  }
});
app.delete("/delete/:filename", async (req, res, next) => {
  const filename = req.params.filename;

  try {
    const filePath = path.join(__dirname, "Data", filename);

    // Check if the file exists
    await fs.promises.access(filePath);

    // Delete the file
    await fs.promises.unlink(filePath);

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    next(error);
  }
});
//Render update form
app.get("/update/:filename", (req, res) => {
  const filename = req.params.filename;

  try {
    // Render the update.ejs page with the filename
    res.render("update", { filename: filename });
  } catch (error) {
    console.error("Error rendering update page:", error);
    next(error);
  }
});
//Update Filename from body request
app.put("/update/:filename", updateFileValidator, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { newFilename } = req.body;
    const filename = req.params.filename;

    const fixedNewFilename = `${newFilename}.txt`;

    const filePath = path.join(__dirname, "Data", filename);
    const newFilePath = path.join(__dirname, "Data", fixedNewFilename);

    await fs.promises.access(filePath);
    await fs.promises.rename(filePath, newFilePath);

    res.status(200).json({ message: "File updated successfully" });
  } catch (error) {
    next(error);
  }
});
//Download file endpoint
app.get("/download/:filename", async (req, res, next) => {
  const filename = req.params.filename;

  try {
    const filePath = path.join(__dirname, "Data", filename);

    // Check if the file exists
    await fs.promises.access(filePath);

    // Set appropriate headers for file download
    res.setHeader("Content-disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-type", "text/plain"); // Adjust the content type based on your file type

    // Create a readable stream from the file and pipe it to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    // Handle other errors
    next(error);
  }
});

//Error handling middlewares

app.use((error, req, res, next) => {
  switch (true) {
    case error.code === "EMOENT":
      res.locals.errorType = "File Doesnt exist Error";
      res.locals.errorDescription = "file Doesnt exist ";
      res.status(404).json({ error: "File Not Found" });
      break;

    case error.code === "EEXIST":
      // File already exists, send a 400 Bad Request response
      res.locals.errorType = "File Exists Error";
      res.locals.errorDescription = "A file with the same name already exists";
      break;

    case error.code === "EACCES" || error.code === "EPERM":
      // Handle permission issues
      res.status(403).json({ error: "Permission Denied" });
      res.locals.errorType = "Permission Denied Error";
      res.locals.errorDescription = "Permission Denied";
      break;

    default:
      // Other errors
      res.status(500).json({ error: "Internal Server Error" });

      res.locals.errorType = "Internal Server Error";
      res.locals.errorDescription = "Unhandled error";
      break;
  }

  res.locals.fullError = error.stack || error.message;
  next();
});
//App listener
app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
