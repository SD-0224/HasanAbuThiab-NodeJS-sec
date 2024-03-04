const express = require("express");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");

const app = express();
const port = 3000;
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

  return `${formattedDate} ${formattedTime} | ${res.statusCode} | Error: ${errorType} - ${errorDescription} | Request URL: ${requestUrl}`;
});

// Setup morgan middleware with the custom format
app.use(morgan(":custom", { stream: accessLogStream }));
// Setup body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use("/styles", express.static(path.join(__dirname, "styles")));

//GET endpoint that fetches the list of files and render them into a template
app.get("/", async (req, res) => {
  try {
    const directoryPath = path.join(__dirname, "Data");
    const files = await fs.promises.readdir(directoryPath);
    const txtFiles = files.filter((file) => path.extname(file) === ".txt");

    res.render("index", { files: txtFiles });
  } catch (error) {
    console.error("Error rendering index page:", error);

    // If the error is due to the 'Data' directory or files not found,
    // render the index page with an empty list of files
    if (error.code === "ENOENT") {
      res.render("index", { files: [] });
    } else {
      // Other errors
      console.error("Unhandled error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});
//GET endpoint that fetches the details of a file and renders it into the template
app.get("/details/:fileName", async (req, res) => {
  const fileName = req.params.fileName;

  try {
    const filePath = path.join(__dirname, "Data", fileName);
    console.log(filePath);
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    res.render("details", { fileName, content: fileContent });
  } catch (error) {
    if (error.code === "ENOENT") {
      // File doesn't exist, send a 404 Not Found response
      console.log("File Not Found");
      res.status(404).json({ error: "File Not Found" });
    } else {
      // Other errors
      console.error("Error in details endpoint:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});
app.get("/create", (req, res) => {
  res.render("create");
});

//Post endpoint that creates file in the Data folder from the body of the request
app.post("/create", async (req, res) => {
  try {
    const { filename, content } = req.body;
    //Checks if filename is entered
    if (!filename) {
      return res.status(400).json({ error: "filename is required" });
    }
    //Checks for special characters and append .txt extension
    if (!/^[a-zA-Z0-9_-]+$/.test(filename)) {
      throw {
        specialError: true,
        message:
          "Special characters in filename. Only alphanumeric, underscore, and hyphen are allowed.",
      };
    }
    const fixedFileName = `${filename}.txt`;

    const filePath = path.join(__dirname, "Data", fixedFileName);
    // Write the content to the file
    await fs.promises.writeFile(filePath, content, "utf-8");

    res.redirect("/");
  } catch (error) {
    console.log('Error creating file: ' + filePath)
    switch (true) {
        case error.specialError:
          // Handle special character error
          console.error("Special characters in filename");
          res.status(400).json({ error: error.message });
          break;
      
        case error.code === "EEXIST":
          // File already exists, send a 400 Bad Request response
          console.error("A file with the same name already exists");
          res.status(400).json({ error: "A file with the same name already exists" });
          break;
      
        case error.code === "ENOENT":
          // Handle file not found (e.g., invalid path)
          res.status(404).json({ error: "File not found" });
          break;
      
        case error.code === "EACCES" || error.code === "EPERM":
          // Handle permission issues
          res.status(403).json({ error: "Permission denied" });
          break;
      
        default:
          // Handle other errors
          res.status(500).json({ error: "Internal Server Error" });
          break;
      }
  }
});
app.delete("/delete/:filename", async (req, res) => {
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
    switch (error.code) {
        case "ENOENT":
          // File doesn't exist, send a 404 Not Found response
          console.log("File Not Found");
          res.status(404).json({ error: "File Not Found" });
          break;
      
        case "EACCES":
        case "EPERM":
          // Handle permission issues
          console.error("Permission Denied");
          res.status(403).json({ error: "Permission Denied" });
          break;
      
        default:
          // Other errors
          res.status(500).json({ error: "Internal Server Error" });
          break;
      }
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
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//Update Filename from body request
app.put("/update/:filename", async (req, res) => {
  try {
    const { newFilename } = req.body;
    const filename = req.params.filename;

    // Checks if the new filename is entered
    if (!newFilename) {
      return res.status(400).json({ error: "New filename is required" });
    }

    // Checks for special characters in the new filename and appends .txt extension
    if (!/^[a-zA-Z0-9_-]+$/.test(newFilename)) {
      throw {
        specialError: true,
        message:
          "Special characters in filename. Only alphanumeric, underscore, and hyphen are allowed.",
      };
    }
    const fixedNewFilename = `${newFilename}.txt`;

    const filePath = path.join(__dirname, "Data", filename);
    const newFilePath = path.join(__dirname, "Data", fixedNewFilename);
    await fs.promises
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    // Rename the file
    await fs.promises.rename(filePath, newFilePath);

    res.status(200).json({ message: "File updated successfully" });
  } catch (error) {
    switch (true) {
        case error.specialError:
          // Handle special character error
          console.error("Special characters in new filename");
          res.status(400).json({ error: error.message });
          break;
      
        case error.code === "ENOENT":
          // Handle file not found (e.g., invalid path)
          res.status(404).json({ error: "File not found" });
          break;
      
        case error.code === "EEXIST":
          // New filename already exists, send a 400 Bad Request response
          console.error("A file with the new name already exists");
          res.status(400).json({ error: "A file with the new name already exists" });
          break;
      
        case error.code === "EACCES" || error.code === "EPERM":
          // Handle permission issues
          res.status(403).json({ error: "Permission denied" });
          break;
      
        default:
          // Handle other errors
          console.error("Error updating file:", error);
          res.status(500).json({ error: "Internal Server Error" });
          break;
      }
  }
});
//Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

//App listener
app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
