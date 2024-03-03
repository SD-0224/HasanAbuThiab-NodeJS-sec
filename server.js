const express = require('express');
const path = require('path');
const fs =  require('fs');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// Custom format function for morgan
morgan.token('custom', (req, res) => {
    // Format the date and time
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);
    const formattedTime = now.toTimeString().split(' ')[0];

    // Get the requested URL
    const requestUrl = req.originalUrl || req.url;

    // Get the error information
    const errorType = res.locals.errorType || 'None';
    const errorDescription = res.locals.errorDescription || 'None';

    return `${formattedDate} ${formattedTime} | ${res.statusCode} | Error: ${errorType} - ${errorDescription} | Request URL: ${requestUrl}`;
});

// Setup morgan middleware with the custom format
app.use(morgan(':custom', { stream: accessLogStream }));
// Setup body parser 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

//GET endpoint that fetches the list of files and render them into a template 
app.get('/', async (req, res) => {
    try {
        const directoryPath = path.join(__dirname, 'Data');
        const files = await fs.promises.readdir(directoryPath); 
        const txtFiles = files.filter(file => path.extname(file) === '.txt');
        res.render('index', { files: txtFiles });
    } catch (error) {
        console.error('Error rendering index page:', error);

        if (error.code === 'ENOENT') {
            // 'Data' directory or files not found, send a 404 Not Found response
            console.log('Data directory or files not found');
            res.status(404).json({ error: 'Data directory or files not found' });
        } else {
            // Other errors
            console.error('Unhandled error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

//GET endpoint that fetches the details of a file and renders it into the template
app.get('/details/:fileName', async (req, res) => {
    const fileName = req.params.fileName;

    try {
        const filePath = path.join(__dirname, 'Data', fileName);
        console.log(filePath);
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        res.render('details', { fileName, content: fileContent });
    } catch (error) {

        if (error.code === 'ENOENT') {
            // File doesn't exist, send a 404 Not Found response
            console.log('File Not Found');
            res.status(404).json({ error: 'File Not Found' });
        } else {
            // Other errors
            console.error('Error in details endpoint:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});
app.get('/create', (req, res) => {
    res.render('create');
});

//Post endpoint that creates file in the Data folder from the body of the request
app.post('/create', async (req, res) => {
    try {
        const { filename, content } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'filename is required' });
        }

        const filePath = path.join(__dirname, 'Data', filename);

        // Check if the file already exists
        const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);

        if (fileExists) {
            return res.status(400).json({ error: 'A file with the same name already exists' });
        }

        // Write the content to the file
        await fs.promises.writeFile(filePath, content, 'utf-8');

        res.status(200).json({ message: 'File created successfully' });
    } catch (error) {
        console.error('Error creating file:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//Error handling middleware 
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

//App listener
app.listen (port, () =>
{
    console.log(`Server running on port http://localhost:${port}`);
});
