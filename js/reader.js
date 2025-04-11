// QR Code reading functionality

// Global variables for webcam
let videoStream = null;
let isWebcamActive = false;
let webcamInterval = null;

// Initialize reader interface
document.addEventListener('DOMContentLoaded', () => {
    // File-based decoding
    document.getElementById('decodeFileBtn').addEventListener('click', readCQR);
    
    // Webcam functionality
    document.getElementById('startWebcamBtn').addEventListener('click', toggleWebcam);
    document.getElementById('captureBtn').addEventListener('click', captureAndDecode);
});

// File-based CQR reading
async function readCQR() {
    const file = document.getElementById('cqrInput').files[0];
    if (!file) return alert('Please select an image');

    console.log("Reading file:", file.name, "Size:", file.size);
    
    try {
        const img = await createImageBitmap(file);
        console.log("Successfully created ImageBitmap from file");
        processCQRImage(img);
    } catch (error) {
        console.error("Error in CQR reading process:", error);
        document.getElementById('decodedResult').textContent = 'Error: ' + error.message;
    }
}

// Process image for CQR decoding (used by both file and webcam)
async function processCQRImage(img) {
    console.log("Image loaded successfully. Dimensions:", img.width, "x", img.height);
    console.log("Starting CQR processing pipeline...");
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    console.log("Created temporary canvas for image processing");
    
    canvas.width = img.width;
    canvas.height = img.height;
    console.log("Canvas dimensions set to match image:", canvas.width, "x", canvas.height);
    
    ctx.drawImage(img, 0, 0);
    console.log("Image drawn to canvas successfully");

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log("Image data extracted. Total pixels:", (imageData.data.length / 4), "RGBA array size:", imageData.data.length);
    
    // Clear previous debug visualization
    const debugContainer = document.getElementById('channelDebugContainer');
    debugContainer.innerHTML = '';
    console.log("Cleared previous debug visualizations");
    debugContainer.style.display = 'flex';
    debugContainer.style.marginTop = '10px';
    console.log("Debug container styles applied");
    
    // Extract and process channels with color inversionn (color → inverted → B&W)
    const channels = [];
    const channelNames = ["Red", "Green", "Blue"];
    
    for (let i = 0; i < 3; i++) {
        console.log(`------------------------------`);
        console.log(`Processing ${channelNames[i]} channel (${i})...`);
        console.time(`${channelNames[i]} channel processing`);
        const channelData = extractAndProcessChannel(imageData, i);
        console.timeEnd(`${channelNames[i]} channel processing`);
        console.log(`${channelNames[i]} channel processed, dimensions:`, channelData.width, "x", channelData.height);
        
        channels.push(channelData);
        console.log(`${channelNames[i]} channel added to processing queue`);
        
        // Add debug visualization
        console.log(`Creating debug visualization for ${channelNames[i]} channel`);
        const debugCanvas = document.createElement('canvas');
        debugCanvas.width = channelData.width;
        debugCanvas.height = channelData.height;
        debugCanvas.style.margin = '5px';
        debugCanvas.style.maxWidth = '150px';
        debugCanvas.title = `${channelNames[i]} Channel`;
        console.log(`Debug canvas for ${channelNames[i]} created with dimensions:`, debugCanvas.width, "x", debugCanvas.height);
        
        const debugCtx = debugCanvas.getContext('2d');
        debugCtx.putImageData(channelData, 0, 0);
        
        const wrapper = document.createElement('div');
        wrapper.style.textAlign = 'center';
        wrapper.appendChild(debugCanvas);
        
        const label = document.createElement('div');
        label.textContent = channelNames[i];
        wrapper.appendChild(label);
        
        debugContainer.appendChild(wrapper);
    }
    
    console.log("Channels extracted successfully");

    // Decode all channels
    let decodedText = '';
    let successfulDecodes = 0;
    
    for (let i = 0; i < channels.length; i++) {
        const channelData = channels[i];
        const channelName = channelNames[i];
        
        console.log(`Attempting to decode ${channelName} channel...`);
        
        try {
            const code = jsQR(channelData.data, channelData.width, channelData.height, {
                inversionAttempts: "attemptBoth"
            });
            
            if (code) {
                console.log(`${channelName} channel decoded successfully:`, code.data);
                decodedText += code.data;
                successfulDecodes++;
            } else {
                console.warn(`${channelName} channel could not be decoded`);
            }
        } catch (err) {
            console.error(`Error decoding ${channelName} channel:`, err);
        }
    }

    console.log(`Decoding complete. Success rate: ${successfulDecodes}/${channels.length}`);
    
    document.getElementById('decodedResult').textContent = 
        decodedText || 'Failed to decode CQR';
}

// Extract and process color channel with specific color transformations
function extractAndProcessChannel(imageData, channelIndex) {
    console.log(`Extracting channel at index ${channelIndex}`);
    
    const width = imageData.width;
    const height = imageData.height;
    const newData = new Uint8ClampedArray(width * height * 4);
    
    // Process pixels - extract only the specific channel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Get only the value for the specific channel
            let channelValue = imageData.data[idx + channelIndex];
            
            // Convert to black and white for QR detection
            const threshold = 128;
            const resultColor = (channelValue < threshold) ? 0 : 255;
            
            // Set all RGB channels to the same value to create grayscale
            newData[idx] = resultColor;
            newData[idx + 1] = resultColor;
            newData[idx + 2] = resultColor;
            newData[idx + 3] = 255; // Alpha always 255
        }
    }
    
    // Count black and white pixels for debugging
    let blackPixels = 0;
    let whitePixels = 0;
    for (let i = 0; i < newData.length; i += 4) {
        if (newData[i] === 0) blackPixels++;
        else whitePixels++;
    }
    
    console.log(`Channel ${channelIndex} processing complete: ${blackPixels} black pixels, ${whitePixels} white pixels`);
    
    // Remove excessive logging that could slow down processing
    if (blackPixels + whitePixels > 0) {
        const blackPercentage = (blackPixels / (blackPixels + whitePixels) * 100).toFixed(2);
        console.log(`Black pixel percentage: ${blackPercentage}%`);
    }
    
    return new ImageData(newData, width, height);
}

// Function to detect and enhance QR code finder patterns
function enhanceFinderPatterns(data, width, height, colorMap) {
    // First dilate to connect broken parts
    const dilated = dilate(data, width, height);
    
    // Then look for finder pattern candidates (square patterns)
    for (let y = 10; y < height - 10; y += 3) {
        for (let x = 10; x < width - 10; x += 3) {
            if (isFinderPatternCandidate(x, y, dilated, width, height)) {
                // Enhance the finder pattern by drawing a solid block
                drawFinderPattern(data, x, y, width);
            }
        }
    }
}

// Helper function to check if an area looks like a finder pattern
function isFinderPatternCandidate(centerX, centerY, data, width, height) {
    // Simple check: look for alternating black/white pattern in 7x7 area
    const pattern = [1,1,1,1,1,1,1,
                     1,0,0,0,0,0,1,
                     1,0,1,1,1,0,1,
                     1,0,1,0,1,0,1,
                     1,0,1,1,1,0,1,
                     1,0,0,0,0,0,1,
                     1,1,1,1,1,1,1];
    
    // Count matching pixels
    let matches = 0;
    let total = 0;
    
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            const x = centerX + dx;
            const y = centerY + dy;
            const idx = (y * width + x) * 4;
            
            // Check if this pixel is in bounds
            if (x < 0 || y < 0 || x >= width || y >= height) continue;
            
            const pixelValue = data[idx] < 128 ? 1 : 0;
            const patternValue = pattern[(dy + 3) * 7 + (dx + 3)];
            
            if (pixelValue === patternValue) matches++;
            total++;
        }
    }
    
    // Return true if enough pixels match the expected pattern
    return matches / total > 0.7;
}

// Helper function to draw a finder pattern
function drawFinderPattern(data, centerX, centerY, width) {
    const size = 7;
    for (let dy = -size/2; dy <= size/2; dy++) {
        for (let dx = -size/2; dx <= size/2; dx++) {
            const x = centerX + Math.round(dx);
            const y = centerY + Math.round(dy);
            
            // Skip if out of bounds
            if (x < 0 || y < 0 || x >= width) continue;
            
            const idx = (y * width + x) * 4;
            
            // Outer border: black
            if (Math.abs(dx) === 3 || Math.abs(dy) === 3) {
                data[idx] = data[idx + 1] = data[idx + 2] = 0;
            }
            // Middle ring: white
            else if (Math.abs(dx) === 2 || Math.abs(dy) === 2) {
                data[idx] = data[idx + 1] = data[idx + 2] = 255;
            }
            // Inner square: black
            else {
                data[idx] = data[idx + 1] = data[idx + 2] = 0;
            }
        }
    }
}

// Simple dilate operation to connect nearby dark pixels
function dilate(data, width, height) {
    const result = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Check if any neighbors are black
            let hasBlackNeighbor = false;
            
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    const nidx = (ny * width + nx) * 4;
                    
                    if (data[nidx] === 0) {
                        hasBlackNeighbor = true;
                        break;
                    }
                }
                if (hasBlackNeighbor) break;
            }
            
            // If any neighbor is black, make this pixel black
            if (hasBlackNeighbor) {
                result[idx] = result[idx + 1] = result[idx + 2] = 0;
            }
        }
    }
    
    return result;
}

// Webcam functionality
function toggleWebcam() {
    if (isWebcamActive) {
        stopWebcam();
        document.getElementById('startWebcamBtn').textContent = 'Start Webcam';
        document.getElementById('captureBtn').disabled = true;
    } else {
        startWebcam();
        document.getElementById('startWebcamBtn').textContent = 'Stop Webcam';
    }
}

// Start webcam
async function startWebcam() {
    try {
        const video = document.getElementById('webcamVideo');
        
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        videoStream = stream;
        isWebcamActive = true;
        
        // Enable capture button once video is playing
        video.onloadedmetadata = () => {
            document.getElementById('captureBtn').disabled = false;
        };
        
        // Optional: Auto-scan mode
        // webcamInterval = setInterval(captureAndDecode, 2000);
    } catch (error) {
        console.error('Error accessing webcam:', error);
        alert('Could not access webcam. Please ensure you have given permission and that no other application is using it.');
    }
}

// Stop webcam
function stopWebcam() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (webcamInterval) {
        clearInterval(webcamInterval);
        webcamInterval = null;
    }
    
    isWebcamActive = false;
    document.getElementById('webcamVideo').srcObject = null;
}

// Capture frame from webcam and decode
function captureAndDecode() {
    if (!isWebcamActive) return;
    
    const video = document.getElementById('webcamVideo');
    const canvas = document.getElementById('webcamCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Create ImageBitmap and process
    createImageBitmap(canvas)
        .then(img => processCQRImage(img))
        .catch(err => {
            console.error('Error capturing from webcam:', err);
            document.getElementById('decodedResult').textContent = 'Error: ' + err.message;
        });
}
