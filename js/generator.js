// QR Code generation functionality

// Colorize QR code with specific color
function colorizeQR(canvas, color) {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    
    const ctx = newCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    
    // Colorize the black pixels with the specified color
    const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // If pixel is black (QR code foreground)
        if (data[i] < 128 && data[i+1] < 128 && data[i+2] < 128) {
            // Parse color (format: #RRGGBB)
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            // Set pixel to the color
            data[i] = r;
            data[i+1] = g;
            data[i+2] = b;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return newCanvas;
}

// Generate QR code canvas for a single part
function generateQRCanvas(text, color) {
    return new Promise(resolve => {
        const canvas = document.createElement('canvas');
        const scale = 5;
        const size = 200; // Default size
        canvas.width = size;
        canvas.height = size;
        
        QRCode.toCanvas(canvas, text, {
            errorCorrectionLevel: 'H',
            margin: 1,
            scale: scale,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, function(error) {
            if (error) {
                console.error(error);
                return;
            }
            
            // Colorize the generated QR code
            const colorized = colorizeQR(canvas, color);
            resolve(colorized);
        });
    });
}

// Generate CQR
async function generateCQR() {
    const inputData = document.getElementById('inputData').value;
    if (!inputData) return alert('Please enter data to encode');

    // Split data into 3 parts
    const partLength = Math.ceil(inputData.length / 3);
    const parts = [
        inputData.substring(0, partLength),
        inputData.substring(partLength, partLength * 2),
        inputData.substring(partLength * 2)
    ];

    // Clear previous channel visualization
    const channelContainer = document.getElementById('channelVisualizationContainer');
    if (channelContainer) {
        channelContainer.innerHTML = '';
    } else {
        // Create container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'channelVisualizationContainer';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.marginTop = '10px';
        container.style.marginBottom = '10px';
        
        // Insert after input area but before combined canvas
        const combinedCanvas = document.getElementById('combinedCanvas');
        combinedCanvas.parentNode.insertBefore(container, combinedCanvas);
    }

    // Generate QR codes for each part
    const channelNames = ["Red", "Green", "Blue"];
    const channelColors = ['#ff0000', '#00ff00', '#0000ff'];
    
    // Generate QR codes and visualize each channel
    const qrCanvases = await Promise.all(parts.map(async (part, index) => {
        // Generate the base QR code in black and white
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = 200;
        baseCanvas.height = 200;
        
        await new Promise(resolve => {
            QRCode.toCanvas(baseCanvas, part, {
                errorCorrectionLevel: 'H',
                margin: 1,
                scale: 5,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, function() {
                resolve();
            });
        });
        
        // Colorize the QR code
        const colorizedCanvas = colorizeQR(baseCanvas, channelColors[index]);
        
        // Create wrapper for visualization
        const wrapper = document.createElement('div');
        wrapper.style.textAlign = 'center';
        wrapper.style.margin = '0 10px';
        
        // Create canvas that shows how the QR appears in its specific channel
        const channelView = document.createElement('canvas');
        channelView.width = baseCanvas.width;
        channelView.height = baseCanvas.height;
        channelView.style.maxWidth = '150px';
        channelView.style.border = `2px solid ${channelColors[index]}`;
        
        const viewCtx = channelView.getContext('2d');
        const baseData = baseCanvas.getContext('2d').getImageData(0, 0, baseCanvas.width, baseCanvas.height).data;
        const channelImg = viewCtx.createImageData(baseCanvas.width, baseCanvas.height);
        
        // Extract just the single color channel
        for (let i = 0; i < baseData.length; i += 4) {
            const isBlack = baseData[i] < 128; // QR code pixels are black
            
            // For proper channel visualization, only show the specific channel
            if (index === 0) { // Red channel
                // For red channel, only keep red values
                channelImg.data[i] = isBlack ? 0 : 255; // Red component
                channelImg.data[i+1] = 0; // No green
                channelImg.data[i+2] = 0; // No blue
            } else if (index === 1) { // Green channel
                // For green channel, only keep green values
                channelImg.data[i] = 0; // No red
                channelImg.data[i+1] = isBlack ? 0 : 255; // Green component
                channelImg.data[i+2] = 0; // No blue
            } else { // Blue channel
                // For blue channel, only keep blue values
                channelImg.data[i] = 0; // No red
                channelImg.data[i+1] = 0; // No green
                channelImg.data[i+2] = isBlack ? 0 : 255; // Blue component
            }
            
            channelImg.data[i+3] = 255; // Alpha
        }
        
        viewCtx.putImageData(channelImg, 0, 0);
        wrapper.appendChild(channelView);
        
        // Add label
        const label = document.createElement('div');
        label.textContent = `${channelNames[index]} Channel`;
        label.style.marginTop = '5px';
        label.style.color = channelColors[index];
        label.style.fontWeight = 'bold';
        wrapper.appendChild(label);
        
        // Add to container
        document.getElementById('channelVisualizationContainer').appendChild(wrapper);
        
        return colorizedCanvas;
    }));

    // Combine into CQR
    const combinedCanvas = combineCanvases(qrCanvases);
    document.getElementById('combinedCanvas').replaceWith(combinedCanvas);
    combinedCanvas.id = 'combinedCanvas';
    
    // Enable download button
    document.getElementById('downloadBtn').disabled = false;
}

// Download CQR function
function downloadCQR() {
    const canvas = document.getElementById('combinedCanvas');
    if (!canvas) return;
    
    // Convert canvas to data URL
    const dataURL = canvas.toDataURL('image/png');
    
    // Create temporary link for download
    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = 'color-qr-code.png';
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Initialize generator interface
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('generateBtn').addEventListener('click', generateCQR);
    document.getElementById('downloadBtn').addEventListener('click', downloadCQR);
});
