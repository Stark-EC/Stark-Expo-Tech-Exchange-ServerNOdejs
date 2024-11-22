const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const cors = require('cors');


// Initialize Express app
const app = express();
const port = 3000;

// Setup middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Enable CORS
app.use(cors());



// Setup file upload (Multer)
const upload = multer({ dest: 'uploads/' });

// CSV Writer setup
const csvWriter = createObjectCsvWriter({
  path: 'applications.csv',
  header: [
    { id: 'name', title: 'Name' },
    { id: 'email', title: 'Email' },
    { id: 'phonenumber', title: 'PhoneNumber' },
    { id: 'company', title: 'Location' },
    { id: 'field', title: 'Program' },
    { id: 'level', title: 'Level' },
    { id: 'fee', title: 'Fee' },
    { id: 'paymentScreenshot', title: 'Payment Screenshot' }
  ],
  append: true
});

// authentication
const auth = require('basic-auth');

app.use((req, res, next) => {
    const user = auth(req);
    if (!user || user.name !== 'admin' || user.pass !== 'STARKEC') {
        res.status(401).send('Access denied');
        return;
    }
    next();
});
// retrieve the CSV content (only accessible with valid credentials):
app.get('/admin/application_data', (req, res) => {
    const csvFile = fs.readFileSync('applications.csv', 'utf8');
    res.send(csvFile);
});


// Route to handle form submission
app.post('/submit_application', upload.single('paymentScreenshot'), (req, res) => {
  const { name, email, phonenumber, company, field, level, fee } = req.body;
  const paymentScreenshot = req.file ? req.file.filename : null;

  console.log(req.body); // Log the form data
  console.log(req.file); // Log the file upload
  // Validate phone number length
  if (phonenumber.length !== 10) {
    return res.status(400).json({ success: false, message: 'Phone number must be 10 digits! Please enter correct phone number!' });
  }

  // Check if the user already exists based on email (duplicate check)
  fs.readFile('applications.csv', 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error reading your data' });
    }

    // If CSV file is empty or no data exists, proceed to write
    if (!data) {
      // Write the first row if CSV is empty
      csvWriter.writeRecords([{ name, email, phonenumber, company, field, level, fee, paymentScreenshot }])
        .then(() => {
          res.json({ success: true, message: 'Application submitted successfully' });
        })
        .catch((error) => {
          res.status(500).json({ success: false, message: 'Error writing to CSV file' });
        });
    } else {
      // If data exists, check for duplicates by email
      const rows = data.split('\n').slice(1); // Skip header
      for (let row of rows) {
        const columns = row.split(',');
        if (columns[1] === email) {
          return res.status(400).json({ success: false, message: 'Email already exists' });
        }
      }

      // No duplicate found, write the new data to CSV
      csvWriter.writeRecords([{ name, email, phonenumber, company, field, level, fee, paymentScreenshot }])
        .then(() => {
          res.json({ success: true, message: 'Application submitted successfully' });
        })
        .catch((error) => {
          res.status(500).json({ success: false, message: 'Error writing to CSV file' });
        });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
