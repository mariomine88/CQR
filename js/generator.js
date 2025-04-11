document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const elements = {
        inputData: document.getElementById('inputData'),
        generateBtn: document.getElementById('generateBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        combinedCanvas: document.getElementById('combinedCanvas')
    };
    
    // Set up canvas
    const canvasSize = CONFIG.CANVAS.DEFAULT_SIZE;
    elements.combinedCanvas.width = canvasSize;
    elements.combinedCanvas.height = canvasSize;
    const ctx = elements.combinedCanvas.getContext('2d');
    
    // Create container for QR display
    const qrDisplayContainer = document.createElement('div');
    qrDisplayContainer.className = 'qr-display-container';
    qrDisplayContainer.style.display = 'flex';
    qrDisplayContainer.style.alignItems = 'flex-start';
    qrDisplayContainer.style.gap = '20px';
    
    // Move canvas into container
    elements.combinedCanvas.parentNode.insertBefore(qrDisplayContainer, elements.combinedCanvas);
    qrDisplayContainer.appendChild(elements.combinedCanvas);
    
    // Create channel container
    const channelContainer = document.createElement('div');
    channelContainer.className = 'channel-container';
    channelContainer.style.display = 'none';
    channelContainer.style.flexDirection = 'column';
    channelContainer.style.gap = '10px';
    qrDisplayContainer.appendChild(channelContainer);
    
    // Create individual channel canvases
    const smallCanvasSize = canvasSize / CONFIG.CANVAS.CHANNEL_SCALE_FACTOR;
    const channelCanvases = CONFIG.CHANNELS.map(channel => 
        createChannelCanvas(channelContainer, channel.name, smallCanvasSize, smallCanvasSize)
    );
    
    // Event listeners
    elements.generateBtn.addEventListener('click', generateColorQR);
    elements.downloadBtn.addEventListener('click', downloadQR);
    
    async function generateColorQR() {
        const data = elements.inputData.value.trim();
        if (!data) {
            showMessage('Please enter data to encode');
            return;
        }

        // Clear previous QR code
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        
        try {
            // Split data into parts for each channel
            const [part1, part2, part3] = splitDataForChannels(data);
            
            // Generate QR codes for each channel
            const qrPromises = [part1, part2, part3].map(part => 
                generateQRCode(part, canvasSize)
            );
            
            const [redQR, greenQR, blueQR] = await Promise.all(qrPromises);
            
            // Combine QR codes into color channels
            combineQRCodes(redQR, greenQR, blueQR);
            
            // Display individual channel previews
            CONFIG.CHANNELS.forEach((channel, index) => {
                const qrCanvas = [redQR, greenQR, blueQR][index];
                displaySingleChannel(qrCanvas, channelCanvases[index], channel.color);
            });
            
            // Show channel container
            channelContainer.style.display = 'flex';
            
            // Enable download
            elements.downloadBtn.disabled = false;
        } catch (error) {
            console.error('Error generating QR code:', error);
            showMessage('Failed to generate QR code', true);
        }
    }

    function combineQRCodes(redCanvas, greenCanvas, blueCanvas) {
        // Get image data from each canvas
        const canvasContexts = [redCanvas, greenCanvas, blueCanvas].map(c => 
            c.getContext('2d').getImageData(0, 0, canvasSize, canvasSize)
        );
        
        // Create combined image data
        const combinedData = ctx.createImageData(canvasSize, canvasSize);
        
        for (let i = 0; i < combinedData.data.length; i += 4) {
            // Extract values from each QR (use red channel as QRs are black/white)
            combinedData.data[i] = canvasContexts[0].data[i];      // Red channel
            combinedData.data[i + 1] = canvasContexts[1].data[i];  // Green channel
            combinedData.data[i + 2] = canvasContexts[2].data[i];  // Blue channel
            combinedData.data[i + 3] = 255;                        // Alpha
        }
        
        ctx.putImageData(combinedData, 0, 0);
    }

    function displaySingleChannel(qrCanvas, targetCanvas, colorChannel) {
        const ctx = targetCanvas.getContext('2d');
        const smallCanvasSize = targetCanvas.width;
        
        // Clear canvas
        ctx.clearRect(0, 0, smallCanvasSize, smallCanvasSize);
        
        // Get QR data
        const sourceCtx = qrCanvas.getContext('2d');
        const sourceData = sourceCtx.getImageData(0, 0, canvasSize, canvasSize);
        
        // Create image data for target
        const targetData = ctx.createImageData(smallCanvasSize, smallCanvasSize);
        const scale = canvasSize / smallCanvasSize;
        
        for (let y = 0; y < smallCanvasSize; y++) {
            for (let x = 0; x < smallCanvasSize; x++) {
                const sourceX = Math.floor(x * scale);
                const sourceY = Math.floor(y * scale);
                const sourceIndex = (sourceY * canvasSize + sourceX) * 4;
                const targetIndex = (y * smallCanvasSize + x) * 4;
                
                // Set color based on QR value (black or white)
                const isWhite = sourceData.data[sourceIndex] === 255;
                targetData.data[targetIndex] = isWhite ? colorChannel[0] : 0;
                targetData.data[targetIndex + 1] = isWhite ? colorChannel[1] : 0;
                targetData.data[targetIndex + 2] = isWhite ? colorChannel[2] : 0;
                targetData.data[targetIndex + 3] = 255;
            }
        }
        
        ctx.putImageData(targetData, 0, 0);
    }

    function downloadQR() {
        const dataURL = elements.combinedCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'color-qr-code.png';
        link.href = dataURL;
        link.click();
    }
});
