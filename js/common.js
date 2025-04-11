/**
 * Utility functions for both generator and reader
 */

// Helper functions for both generator and reader

// Convert hex color to RGB components
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [
        (bigint >> 16) & 255,
        (bigint >> 8) & 255,
        bigint & 255
    ];
}

/**
 * Split data into approximately equal parts
 */
function splitDataForChannels(data) {
    const partSize = Math.ceil(data.length / 3);
    return [
        data.substring(0, partSize),
        data.substring(partSize, partSize * 2),
        data.substring(partSize * 2)
    ];
}

/**
 * Generate QR code on a canvas
 */
function generateQRCode(data, size) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        QRCode.toCanvas(canvas, data, { width: size }, error => {
            if (error) reject(error);
            else resolve(canvas);
        });
    });
}

// Colorize QR code with transparency
function colorizeQR(canvas, color) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    
    ctx.drawImage(canvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;
    const [r, g, b] = hexToRgb(color);

    for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 0 && data[i+1] === 0 && data[i+2] === 0) {
            data[i] = r;
            data[i+1] = g;
            data[i+2] = b;
            data[i+3] = 255;
        } else {
            data[i+3] = 0;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return tempCanvas;
}

/**
 * Extract a single color channel from image data
 */
function extractChannel(sourceData, targetCanvas, channelIndex, sourceWidth, sourceHeight) {
    const ctx = targetCanvas.getContext('2d');
    const targetWidth = targetCanvas.width;
    const targetHeight = targetCanvas.height;
    const scale = sourceWidth / targetWidth;
    
    const channelData = ctx.createImageData(targetWidth, targetHeight);
    
    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            // Calculate source and target indices
            const sourceX = Math.floor(x * scale);
            const sourceY = Math.floor(y * scale);
            const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
            const targetIndex = (y * targetWidth + x) * 4;
            
            // Extract channel value
            const value = sourceData[sourceIndex + channelIndex];
            
            // Set grayscale value from the channel
            channelData.data[targetIndex] = value;
            channelData.data[targetIndex + 1] = value;
            channelData.data[targetIndex + 2] = value;
            channelData.data[targetIndex + 3] = 255; // Full opacity
        }
    }
    
    ctx.putImageData(channelData, 0, 0);
}

// Combine color channels
function combineCanvases(canvases) {
    const combined = document.createElement('canvas');
    combined.width = canvases[0].width;
    combined.height = canvases[0].height;
    const ctx = combined.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, combined.width, combined.height);
    ctx.globalCompositeOperation = 'multiply';

    canvases.forEach(c => ctx.drawImage(c, 0, 0));
    ctx.globalCompositeOperation = 'source-over';

    return combined;
}

/**
 * Try to decode QR code from canvas
 */
function decodeQR(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        return code ? code.data : null;
    } catch (error) {
        console.error('QR decode error:', error);
        return null;
    }
}
