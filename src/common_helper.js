const fastCsv = require('fast-csv');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

//handle email or username duplicates
exports.handleError = function (err, res, msg) {
    const code = 400;
    const errorMSG = msg != '' ? msg : err;
    res.setHeader('Content-Type', 'application/json');
    res.status(code).send(JSON.stringify({ status: code, data: [], message: errorMSG }));
}

exports.handleSuccess = function (req, res, msg) {
    const code = 200;
    res.setHeader('Content-Type', 'application/json');
    res.status(code).send(JSON.stringify({ status: code, data: [], message: msg }));
}

exports.handleData = function (req, res, result) {
    const code = 200;
    res.setHeader('Content-Type', 'application/json');
    res.status(code).send(JSON.stringify({ status: code, data: result, message: '' }));
}

exports.handle404 = function (err, res, msg) {
    const code = 404;
    const errorMSG = msg != '' ? msg : err;
    res.setHeader('Content-Type', 'application/json');
    res.status(code).send(JSON.stringify({ status: code, data: [], message: errorMSG }));
}

exports.createCsv = function (data, fields, customFields, res) {
    try {
        if (data.length === 0) {
            return res.send('No records to export.');
        }

        const csvStream = fastCsv.format({ headers: true });

        // Use path.join to create an absolute path for the file
        const filePath = path.join(__dirname, 'exported_data.csv');
        const writableStream = fs.createWriteStream(filePath);

        csvStream.pipe(writableStream);

        data.forEach(item => {
            const row = {};
            fields.forEach((field, index) => {
                const customField = customFields[index].label;
                row[customField] = item[field] || ''; // Handle undefined values
            });
            csvStream.write(row);
        });

        // Wait for the stream to finish writing
        writableStream.on('finish', () => {
            // Send the file as a download attachment
            res.download(filePath, 'exported_data.csv', (err) => {
                if (err) {
                    res.send('Error sending CSV file: ' + err);
                } else {
                    // Remove the file after it has been sent
                    fs.unlinkSync(filePath);
                }
            });
        });

        csvStream.end();
    } catch (err) {
        res.send('Error exporting CSV: ' + err);
    }
};


exports.createExcel = function (data, fields, customFields, res) {
    try {
        if (data.length === 0) {
            return res.send('No records to export.');
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Add headers
        const headers = customFields.map(field => field.label);
        worksheet.addRow(headers);

        // Add data
        data.forEach(item => {
            const row = [];
            fields.forEach(field => {
                row.push(item[field] || ''); // Handle undefined values
            });
            worksheet.addRow(row);
        });

        const filePath = path.join(__dirname, 'exported_data.xlsx');
        workbook.xlsx.writeFile(filePath)
            .then(() => {
                // Send the file as a download attachment
                res.download(filePath, 'exported_data.xlsx', (err) => {
                    if (err) {
                        res.send('Error sending Excel file: ' + err);
                    } else {
                        // Remove the file after it has been sent
                        fs.unlinkSync(filePath);
                    }
                });
            })
            .catch(err => {
                res.send('Error writing Excel file: ' + err);
            });
    } catch (err) {
        res.send('Error exporting Excel file: ' + err);
    }
};


exports.createPdf = async function (data, fields, customFields) {
    try {
        if (data.length === 0) {
            throw new Error('No records to export.');
        }

        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        // Construct HTML content
        const htmlContent = `
        <style>
          table {
            font-family: Arial, sans-serif;
            border-collapse: collapse;
            width: 100%;
          }
  
          th, td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
          }
  
          tr:nth-child(even) {
            background-color: #dddddd;
          }
        </style>
        <h2>Users List</h2>
        <table>
          <tr>
            ${customFields.map(field => `<th>${field.label}</th>`).join('')}
          </tr>
          ${data.map(item => `
            <tr>
              ${fields.map(field => `<td>${item[field] || ''}</td>`).join('')}
            </tr>`).join('')}
        </table>
      `;

        await page.setContent(htmlContent);

        const pdfBuffer = await page.pdf();

        await browser.close();

        return pdfBuffer;
    } catch (err) {
        throw new Error('Error exporting PDF file: ' + err);
    }
};