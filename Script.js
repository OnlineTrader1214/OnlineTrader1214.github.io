// Configuration - Replace with your Cloudinary details
const CLOUD_NAME = 'dqyfijrbh'; // From Cloudinary dashboard
const UPLOAD_PRESET = 'Imgsupload'; // Create in Cloudinary settings

// DOM Elements
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const dropArea = document.getElementById('drop-area');
const progressBar = document.getElementById('progress-bar');
const resultsDiv = document.getElementById('results');

// Event Listeners
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);

// Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(event => {
    dropArea.addEventListener(event, highlight, false);
});

['dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, unhighlight, false);
});

function highlight() {
    dropArea.style.borderColor = '#4CAF50';
}

function unhighlight() {
    dropArea.style.borderColor = '#ccc';
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
}

// Main Processing Function
async function handleFiles(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    // Reset UI
    resultsDiv.innerHTML = '';
    progressBar.style.width = '0%';
    
    // Process first 500 files
    const filesToProcess = Array.from(files).slice(0, 500);
    const totalFiles = filesToProcess.length;
    
    for (let i = 0; i < totalFiles; i++) {
        const file = filesToProcess[i];
        await processFile(file, i + 1, totalFiles);
    }
}

async function processFile(file, currentIndex, totalFiles) {
    // Update progress
    const progress = Math.round((currentIndex / totalFiles) * 100);
    progressBar.style.width = `${progress}%`;
    
    try {
        // Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        
        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
            { method: 'POST', body: formData }
        );
        
        const uploadData = await uploadResponse.json();
        
        // Get AI tags
        const tagsResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/tags?public_id=${uploadData.public_id}`,
            { headers: { 'Authorization': `Basic ${btoa('433986273773748:')}` } }
        );
        
        const tagsData = await tagsResponse.json();
        displayResult(file.name, tagsData.tags || []);
        
    } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        displayResult(file.name, [], true);
    }
}

function displayResult(filename, tags, isError = false) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'photo-result';
    
    if (isError) {
        resultDiv.innerHTML = `
            <h3>${filename}</h3>
            <p style="color: red;">Error processing image</p>
        `;
    } else {
        const title = tags.slice(0, 3).map(t => t.tag).join(', ') || 'Untitled';
        const keywords = tags.map(t => t.tag).join(', ') || 'No keywords detected';
        
        resultDiv.innerHTML = `
            <h3>${filename}</h3>
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Keywords:</strong> ${keywords}</p>
        `;
    }
    
    resultsDiv.appendChild(resultDiv);
}
