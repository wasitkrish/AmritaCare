// Vercel Serverless entry: export the Express app
// Vercel will invoke the exported function when requests arrive for paths routed to this file.
const app = require('../server');
module.exports = app;
