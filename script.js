// ================ Configuration ================
const CLOUD_NAME = 'dqyfijrbh'; // Replace with your Cloudinary cloud name
const UPLOAD_PRESET = 'Imgsupload'; // Replace with your upload preset
const API_KEY = '433986273773748'; // Replace with your API key
const API_SECRET = '80fQwCdLhk4zTYDS06omYzZVJnQ'; // Replace with your API secret

// Performance tuning
const BATCH_SIZE = 5; // Number of parallel uploads
const DELAY_MS = 1000; // Delay between batches
const MAX_FILES = 500; // Maximum files to process

// ================ DOM Elements ================
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const dropArea = document.getElementById('drop-area');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultsDiv = document.getElementById('results');
const loadingIndicator = document.getElementById('loading');

// ================ State Management ================
let totalFiles = 0;
let processedCount = 0;
let isProcessing = false;

// ================ Event Listeners ================
function initEventListeners() {
    // File selection
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFiles);
    
    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        dropArea.addEventListener(event, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(event => {
        dropArea.addEventListener(event, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(event => {
        dropArea.addEventListener(event, unhighlight, false);
    });
    
    dropArea.addEventListener('drop', handleDrop, false);
}

// ================ Drag & Drop Functions ================
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
}

// ================ Main Processing Function ================
async function handleFiles(e) {
    if (isProcessing) {
        alert('Please wait until current processing completes');
        return;
    }
    
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Initialize processing
    isProcessing = true;
    toggleLoading(true);
    resetUI();
    
    // Process files (limited to MAX_FILES)
    totalFiles = Math.min(files.length, MAX_FILES);
    updateProgressText();
    
    try {
        // Process in batches
        for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
            const batch = Array.from(files).slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(file => 
                processFile(file)
                    .finally(() => {
                        processedCount++;
                        updateProgress();
                    })
            ));
            
            // Add delay between batches if not last batch
            if (i + BATCH_SIZE < totalFiles) {
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }
        
        showCompletionMessage();
    } catch (error) {
        console.error('Processing error:', error);
        showErrorMessage('Processing failed. Please check console for details.');
    } finally {
        isProcessing = false;
        toggleLoading(false);
    }
}

// ================ File Processing ================
async function processFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        displayResult(file.name, [], 'Invalid file type');
        return;
    }
    
    try {
        // 1. Upload to Cloudinary
        const uploadData = await uploadToCloudinary(file);
        
        // 2. Get AI tags
        const tags = await getImageTags(uploadData.public_id);
        
        // 3. Display results
        displayResult(file.name, tags);
        
    } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        displayResult(file.name, [], 'Processing error');
        throw error; // Propagate for batch handling
    }
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        { method: 'POST', body: formData }
    );
    
    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }
    
    return await response.json();
}

async function getImageTags(publicId) {
    const authString = btoa(`${API_KEY}:${API_SECRET}`);
    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/tags?public_id=${publicId}`,
        { headers: { 'Authorization': `Basic ${authString}` } }
    );
    
    if (!response.ok) {
        throw new Error(`Tagging failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.tags || [];
}

// ================ UI Functions ================
function resetUI() {
    resultsDiv.innerHTML = '';
    progressBar.style.width = '0%';
    processedCount = 0;
    updateProgressText();
}

function updateProgress() {
    const progress = Math.round((processedCount / totalFiles) * 100);
    progressBar.style.width = `${progress}%`;
    updateProgressText();
}

function updateProgressText() {
    if (progressText) {
        progressText.textContent = `Processed ${processedCount} of ${totalFiles} files`;
    }
}

function toggleLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

function showCompletionMessage() {
    const completionDiv = document.createElement('div');
    completionDiv.className = 'completion-message';
    completionDiv.textContent = `✅ Processing complete! Analyzed ${processedCount} files.`;
    resultsDiv.prepend(completionDiv);
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = `❌ ${message}`;
    resultsDiv.prepend(errorDiv);
}

function displayResult(filename, tags, errorMessage = null) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'photo-result';
    
    if (errorMessage) {
        resultDiv.innerHTML = `
            <h3>${filename}</h3>
            <p class="error">⚠️ ${errorMessage}</p>
        `;
    } else if (!tags || tags.length === 0) {
        resultDiv.innerHTML = `
            <h3>${filename}</h3>
            <p class="warning">No tags detected</p>
        `;
    } else {
        const title = tags.slice(0, 3).map(t => t.tag).join(', ') || 'Untitled';
        const keywords = tags.map(t => t.tag).join(', ') || 'No keywords';
        
        resultDiv.innerHTML = `
            <h3>${filename}</h3>
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Keywords:</strong> ${keywords}</p>
            <div class="tag-confidence">
                ${tags.slice(0, 5).map(t => `
                    <span>${t.tag} (${Math.round(t.confidence)}%)</span>
                `).join('')}
            </div>
        `;
    }
    
    resultsDiv.appendChild(resultDiv);
}

// ================ Initialize Application ================
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    console.log('Photo Analyzer initialized');
});
