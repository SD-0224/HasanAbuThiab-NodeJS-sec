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

    // Get the route path
    const route = req.route ? req.route.path : 'Unknown';

    // Get the error information
    const errorType = res.locals.errorType || 'None';
    const errorDescription = res.locals.errorDescription || 'None';

    return `${formattedDate} ${formattedTime} | ${res.statusCode} | Error: ${errorType} - ${errorDescription} | Route: ${route}`;
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

app.listen (port, () =>
{
    console.log(`Server running on port http://localhost:${port}`);
});
