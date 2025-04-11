document.addEventListener('DOMContentLoaded', function() {
    const inputData = document.getElementById('inputData');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const combinedCanvas = document.getElementById('combinedCanvas');
    const ctx = combinedCanvas.getContext('2d');

    // Set up canvas dimensions - QR codes are usually square
    const canvasSize = 300;
    combinedCanvas.width = canvasSize;
    combinedCanvas.height = canvasSize;

    // Create containers for individual channel canvases
    const channelContainer = document.createElement('div');
    channelContainer.className = 'channel-container';
    channelContainer.style.display = 'flex';
    channelContainer.style.justifyContent = 'space-between';
    channelContainer.style.marginTop = '20px';
    
    // Create individual canvases for each channel
    const redCanvas = document.createElement('canvas');
    const greenCanvas = document.createElement('canvas');
    const blueCanvas = document.createElement('canvas');
    
    [redCanvas, greenCanvas, blueCanvas].forEach((canvas, index) => {
        canvas.width = canvasSize / 2;
        canvas.height = canvasSize / 2;
        
        const label = document.createElement('div');
        const channels = ['Red Channel', 'Green Channel', 'Blue Channel'];
        label.textContent = channels[index];
        label.style.textAlign = 'center';
        
        const wrapper = document.createElement('div');
        wrapper.style.display = 'inline-block';
        wrapper.style.margin = '0 5px';
        
        wrapper.appendChild(canvas);
        wrapper.appendChild(label);
        channelContainer.appendChild(wrapper);
    });
    
    // Insert the channel container after the combined canvas
    combinedCanvas.parentNode.appendChild(channelContainer);

    // Hide channel displays initially
    channelContainer.style.display = 'none';

    generateBtn.addEventListener('click', generateColorQR);
    downloadBtn.addEventListener('click', downloadQR);

    async function generateColorQR() {
        const data = inputData.value.trim();
        if (!data) {
            alert('Please enter data to encode');
            return;
        }

        // Clear previous QR code
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        try {
            // Divide data into three approximately equal parts
            const dataLength = data.length;
            const partSize = Math.ceil(dataLength / 3);
            
            const part1 = data.substring(0, partSize);
            const part2 = data.substring(partSize, partSize * 2);
            const part3 = data.substring(partSize * 2);

            // Generate three separate QR codes - one for each channel
            const redQR = await generateQRCode(part1);
            const greenQR = await generateQRCode(part2);
            const blueQR = await generateQRCode(part3);

            // Combine the three QR codes into color channels
            combineQRCodes(redQR, greenQR, blueQR);
            
            // Display individual channels
            displaySingleChannel(redQR, redCanvas, [255, 0, 0]);
            displaySingleChannel(greenQR, greenCanvas, [0, 255, 0]);
            displaySingleChannel(blueQR, blueCanvas, [0, 0, 255]);
            
            // Show channel displays
            channelContainer.style.display = 'flex';
            
            // Enable download button
            downloadBtn.disabled = false;
        } catch (error) {
            console.error('Error generating QR code:', error);
            alert('Failed to generate QR code');
        }
    }

    // Function to display a single channel
    function displaySingleChannel(qrCanvas, targetCanvas, colorChannel) {
        const ctx = targetCanvas.getContext('2d');
        const smallCanvasSize = targetCanvas.width;
        
        // Clear the canvas
        ctx.clearRect(0, 0, smallCanvasSize, smallCanvasSize);
        
        // Get the QR code data
        const sourceCtx = qrCanvas.getContext('2d');
        const sourceData = sourceCtx.getImageData(0, 0, canvasSize, canvasSize);
        
        // Create a new image data for the target canvas
        const targetData = ctx.createImageData(smallCanvasSize, smallCanvasSize);
        
        // Scale factor for resizing
        const scale = canvasSize / smallCanvasSize;
        
        for (let y = 0; y < smallCanvasSize; y++) {
            for (let x = 0; x < smallCanvasSize; x++) {
                // Get corresponding pixel from source (with scaling)
                const sourceX = Math.floor(x * scale);
                const sourceY = Math.floor(y * scale);
                const sourceIndex = (sourceY * canvasSize + sourceX) * 4;
                
                // Get target index
                const targetIndex = (y * smallCanvasSize + x) * 4;
                
                // Get luminance (using red channel as QR is black/white)
                const luminance = sourceData.data[sourceIndex];
                
                // Set color channel - white QR parts get the color, black parts remain black
                targetData.data[targetIndex] = luminance === 255 ? colorChannel[0] : 0;
                targetData.data[targetIndex + 1] = luminance === 255 ? colorChannel[1] : 0;
                targetData.data[targetIndex + 2] = luminance === 255 ? colorChannel[2] : 0;
                targetData.data[targetIndex + 3] = 255; // Alpha
            }
        }
        
        // Put the image data on the canvas
        ctx.putImageData(targetData, 0, 0);
    }

    function generateQRCode(data) {
        return new Promise((resolve, reject) => {
            // Create a temporary canvas to generate the QR code
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasSize;
            tempCanvas.height = canvasSize;
            
            QRCode.toCanvas(tempCanvas, data, { width: canvasSize }, function(error) {
                if (error) {
                    reject(error);
                } else {
                    resolve(tempCanvas);
                }
            });
        });
    }

    function combineQRCodes(redCanvas, greenCanvas, blueCanvas) {
        // Get the image data from each canvas
        const redCtx = redCanvas.getContext('2d');
        const greenCtx = greenCanvas.getContext('2d');
        const blueCtx = blueCanvas.getContext('2d');
        
        const redData = redCtx.getImageData(0, 0, canvasSize, canvasSize);
        const greenData = greenCtx.getImageData(0, 0, canvasSize, canvasSize);
        const blueData = blueCtx.getImageData(0, 0, canvasSize, canvasSize);
        
        // Create new ImageData for the combined image
        const combinedData = ctx.createImageData(canvasSize, canvasSize);
        
        for (let i = 0; i < combinedData.data.length; i += 4) {
            // Extract grayscale values from each QR code (use red channel for simplicity as QR is black and white)
            const redValue = redData.data[i];     // 0 for black, 255 for white
            const greenValue = greenData.data[i]; // 0 for black, 255 for white
            const blueValue = blueData.data[i];   // 0 for black, 255 for white
            
            // Set RGB channels in the combined image
            // We use the values directly - black QR pixels (0) become 0 in the channel
            // white QR pixels (255) become 255 (FF) in the channel
            combinedData.data[i] = redValue;      // Red channel
            combinedData.data[i + 1] = greenValue;// Green channel
            combinedData.data[i + 2] = blueValue; // Blue channel
            combinedData.data[i + 3] = 255;       // Alpha channel (fully opaque)
        }
        
        // Put the combined image data to the canvas
        ctx.putImageData(combinedData, 0, 0);
    }

    function downloadQR() {
        const dataURL = combinedCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'color-qr-code.png';
        link.href = dataURL;
        link.click();
    }
});
