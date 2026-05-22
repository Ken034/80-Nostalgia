const http = require('http');
const fs = require('fs');
const path = require('path');

// In-memory storage for feedback messages (in production, use a database)
let messages = [];

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Handle API routes
    if (req.url === '/api/feedback' && req.method === 'GET') {
        // Get all messages
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(messages.reverse())); // Show newest first
        return;
    }

    if (req.url === '/api/feedback' && req.method === 'POST') {
        // Submit new message
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                // Validate input
                if (!data.name || !data.message) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Name and message are required' }));
                    return;
                }

                // Create new message object
                const newMessage = {
                    id: Date.now(),
                    name: sanitizeInput(data.name),
                    email: data.email ? sanitizeInput(data.email) : '',
                    message: sanitizeInput(data.message),
                    date: new Date().toISOString()
                };

                // Add to storage
                messages.push(newMessage);

                console.log(`New feedback from ${newMessage.name}: ${newMessage.message.substring(0, 50)}...`);

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: newMessage }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // Remove query parameters
    filePath = filePath.split('?')[0];
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';
    
    // Security: prevent directory traversal
    if (filePath.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const fullPath = path.join(__dirname, filePath);

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// Helper function to sanitize user input
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Feedback form available at http://localhost:' + PORT + '/feedback.html');
});
