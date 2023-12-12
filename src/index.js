const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Users = require('./users');
const rateLimit = require('express-rate-limit');
const common_helper = require('./common_helper');

// Middleware to parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

const { swaggerServe, swaggerSetup } = require('../config')

mongoose.connect('mongodb://127.0.0.1:27017/test', {
}).then(() => {
    console.log('Connected to database.');
}).catch(err => {
    console.log('Error: ' + err);
});

const port = process.env.PORT || 3000;

// =================================== Methods use by our system (Middleware) ===========================================
app.use(express.json());


// =================================== Apply rate limiting middleware ===================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Custom error message: Too many requests, please try again later...',
});
app.use('/exportexcel', limiter);

// ================================ Create User ===============================
app.post('/user', async (req, res) => {
    try {
        const userData = req.body;
        const register = new Users(userData);
        await register.save();
        res.status(201).send('user created successfully');
    }
    catch (err) {
        res.send('user not created, try again.' + err);
    }
});

// ================================ Get data of all Users ===============================
app.get('/users', async (req, res) => {
    try {
        const result = await Users.find();
        res.send(result);
    }
    catch (err) {
        res.send('Records not found, try again.' + err);
    }
});


// ================================ Get single user data ===============================
app.get('/users/:name', async (req, res) => {
    try {
        const userName = req.params.name;
        const result = await Users.find({name: userName});
        res.send(result);
    }
    catch (err) {
        res.send('Records not found, try again.' + err);
    }
});


// ================================ Get data of all Users with all find property ===============================
app.get('/users-with-find-props', async (req, res) => {
    try {
        const result = await Users.find({age: {$gt: 30}}, { name: 1, email: 1, phone: 1, _id: 0 }).sort({age: -1}).limit(5);
        res.send(result);
    }
    catch (err) {
        res.send('Records not found, try again.' + err);
    }
});

// ================================ Join Users with Bank ===============================
app.get('/users-bank', async (req, res) => {
    try {

        const matchStage = {
            $match: {
                name: "Sonu",
                age: { $gt: 25 }
            }
        };

        const result = await Users.aggregate([
            matchStage,
            {
                $lookup: {
                    from: "bank_details",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "bankDetails"
                }
            }
        ]).exec();
        res.send(result);
    }
    catch (err) {
        res.send('user not created, try again.' + err);
    }
});

// ================================ Join Users with Bank using Pipeline ===============================
app.get('/users-bank-pipeline', async (req, res) => {
    try {
        const pipeline = [
            // Match users older than 30
            {
                $match: {
                    age: { $gt: 25 }
                }
            },
            // Lookup bank details for matching users
            {
                $lookup: {
                    from: "bank_details",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "bankDetails"
                }
            },
            // Project to include only necessary fields
            {
                $project: {
                    _id: 0,
                    name: 1,
                    phone: 1,
                    address: 1,
                    age: 1,
                    bankDetails: {
                        _id: 1,
                        user_id: 1,
                        bank_name: 1,
                        account_number: 1,
                        branch_name: 1
                    }
                }
            }
        ];

        const result = await Users.aggregate(pipeline).exec();
        res.send(result);
    }
    catch (err) {
        res.send('user not created, try again.' + err);
    }
});

// ================================ Join Users with Bank using Pipeline ===============================
app.get('/users-bank-pipeline-with-all', async (req, res) => {
    try {
        const pipeline = [
            // Match users older than 30
            {
                $match: {
                    age: { $gte: 30 }
                }
            },
            // Lookup bank details for matching users
            {
                $lookup: {
                    from: "bank_details",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "bankDetails"
                }
            },
            // Project to include only necessary fields
            {
                $project: {
                    _id: 1,
                    name: 1,
                    age: 1,
                    bankDetails: {
                        bank_name: 1,
                        account_number: 1,
                        branch_name: 1
                    }
                }
            },
            // Group users by age and calculate average age for each group
            {
                $group: {
                    _id: '$age',
                    averageAge: { $avg: '$age' },
                    count: { $sum: 1 },
                    users: { $push: '$$ROOT' } // Store original documents in the 'users' array
                }
            },
            // Sort the results by average age in descending order
            {
                $sort: {
                    averageAge: -1
                }
            },
            // Limit the output to the top 5 groups
            {
                $limit: 5
            }
        ];

        const result = await Users.aggregate(pipeline).exec();

        res.send(result);
    }
    catch (err) {
        res.send('user not created, try again.' + err);
    }
});

// ================================ Get data of all Users and create CSV ===============================
app.get('/exportcsv', async (req, res) => {
    try {
        const users = await Users.find();

        const customFields = [
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email Address' },
            { key: 'phone', label: 'Contact Number' },
            { key: 'address', label: 'Home Address' },
        ];

        const fieldsToExport = customFields.map(field => field.key);

        common_helper.createCsv(users, fieldsToExport, customFields, res);
    } catch (err) {
        res.send('Error exporting CSV: ' + err);
    }
});

// ================================ Get data of all Users and create Excel ===============================
app.get('/exportexcel', async (req, res) => {
    try {
        const users = await Users.find();

        const customFields = [
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email Address' },
            { key: 'phone', label: 'Contact Number' },
            { key: 'address', label: 'Home Address' },
        ];

        const fieldsToExport = customFields.map(field => field.key);

        common_helper.createExcel(users, fieldsToExport, customFields, res);
    } catch (err) {
        res.send('Error exporting Excel file: ' + err);
    }
});


// ================================ Get data of all Users and create PDF with HTML content ===============================
app.get('/exportpdf', async (req, res) => {
    try {
        const users = await Users.find();

        const customFields = [
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email Address' },
            { key: 'phone', label: 'Contact Number' },
            { key: 'address', label: 'Home Address' },
        ];

        const fieldsToExport = customFields.map(field => field.key);

        const pdfBuffer = await common_helper.createPdf(users, fieldsToExport, customFields);

        // Send the PDF buffer as a download attachment
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=users.pdf');
        res.send(pdfBuffer);
    } catch (err) {
        res.send('Error exporting PDF file: ' + err);
    }
});

app.use("/api-docs", swaggerServe, swaggerSetup);

app.listen(port, () => {
    console.log('connected to server and running on PORT: ' + port);
});