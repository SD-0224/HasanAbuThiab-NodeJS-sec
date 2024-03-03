const express = require('express');
const path = require('path');
const fs =  require('fs');
const morgan = require('morgan');

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
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    const directoryPath = path.join(__dirname, 'Data');
    const files = fs.readdirSync(directoryPath).filter(file => path.extname(file) === '.txt');
    res.render('index', { files });
});

app.get('/details/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'Data', fileName);

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.render('details', { fileName, content });
    } catch (error) {
        console.error(`Error reading file ${fileName}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen (port, () =>
{
    console.log(`Server running on port http://localhost:${port}`);
});
