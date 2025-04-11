document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const decodeFileBtn = document.getElementById('decodeFileBtn');
    const cqrInput = document.getElementById('cqrInput');
    const decodedResult = document.getElementById('decodedResult');
    const startWebcamBtn = document.getElementById('startWebcamBtn');
    const captureBtn = document.getElementById('captureBtn');
    const webcamVideo = document.getElementById('webcamVideo');
    const webcamCanvas = document.getElementById('webcamCanvas');
    const channelDebugContainer = document.getElementById('channelDebugContainer');

    let videoStream = null;

    // Set up event listeners
    decodeFileBtn.addEventListener('click', decodeFromFile);
    startWebcamBtn.addEventListener('click', toggleWebcam);
    captureBtn.addEventListener('click', captureAndDecode);

    // Function to decode CQR from uploaded file
    function decodeFromFile() {
        const file = cqrInput.files[0];
        if (!file) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                decodeCQR(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Function to toggle webcam
    function toggleWebcam() {
        if (videoStream) {
            stopWebcam();
            startWebcamBtn.textContent = 'Start Webcam';
            captureBtn.disabled = true;
        } else {
            startWebcam();
            startWebcamBtn.textContent = 'Stop Webcam';
        }
    }

    // Function to start webcam
    function startWebcam() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(function(stream) {
                videoStream = stream;
                webcamVideo.srcObject = stream;
                captureBtn.disabled = false;
            })
            .catch(function(err) {
                console.error('Error accessing webcam:', err);
                alert('Could not access webcam. Please make sure you have granted permission.');
            });
    }

    // Function to stop webcam
    function stopWebcam() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
            webcamVideo.srcObject = null;
        }
    }

    // Capture image from webcam and decode
    function captureAndDecode() {
        if (!videoStream) return;

        const canvas = webcamCanvas;
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        canvas.width = webcamVideo.videoWidth;
        canvas.height = webcamVideo.videoHeight;
        
        // Draw the current video frame to the canvas
        ctx.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);
        
        // Decode the QR from the canvas
        decodeCQR(canvas);
    }

    // Main function to decode colored QR code
    function decodeCQR(imageSource) {
        // Clear previous results
        decodedResult.innerHTML = '';
        channelDebugContainer.innerHTML = '';
        
        // Create a canvas to draw and process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions based on source image
        const width = imageSource instanceof HTMLCanvasElement ? imageSource.width : imageSource.naturalWidth;
        const height = imageSource instanceof HTMLCanvasElement ? imageSource.height : imageSource.naturalHeight;
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas
        ctx.drawImage(imageSource, 0, 0, width, height);
        
        // Get image data to process
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Create separate canvases for each channel
        const redCanvas = createChannelCanvas('Red Channel', width, height);
        const greenCanvas = createChannelCanvas('Green Channel', width, height);
        const blueCanvas = createChannelCanvas('Blue Channel', width, height);
        
        // Extract each channel
        extractChannel(data, redCanvas, 0, width, height); // Red channel
        extractChannel(data, greenCanvas, 1, width, height); // Green channel
        extractChannel(data, blueCanvas, 2, width, height); // Blue channel
        
        // Decode each channel
        const redData = decodeQrFromCanvas(redCanvas, 'red');
        const greenData = decodeQrFromCanvas(greenCanvas, 'green');
        const blueData = decodeQrFromCanvas(blueCanvas, 'blue');
        
        // Display the combined result
        displayResults(redData, greenData, blueData);
    }
    
    // Function to create a canvas for a channel
    function createChannelCanvas(label, width, height) {
        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.style.display = 'inline-block';
        wrapper.style.margin = '10px';
        wrapper.style.textAlign = 'center';
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width / 2;  // Make it smaller for display purposes
        canvas.height = height / 2;
        
        // Create label
        const labelElement = document.createElement('div');
        labelElement.textContent = label;
        
        // Add to wrapper
        wrapper.appendChild(canvas);
        wrapper.appendChild(labelElement);
        
        // Add to container
        channelDebugContainer.appendChild(wrapper);
        
        return canvas;
    }

    // Extract a specific color channel
    function extractChannel(sourceData, targetCanvas, channelIndex, width, height) {
        const targetCtx = targetCanvas.getContext('2d');
        const targetWidth = targetCanvas.width;
        const targetHeight = targetCanvas.height;
        const scale = width / targetWidth;  // Scale factor
        
        // Create grayscale image data for the channel
        const channelData = targetCtx.createImageData(targetWidth, targetHeight);
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                // Get source coordinates
                const sourceX = Math.floor(x * scale);
                const sourceY = Math.floor(y * scale);
                const sourceIndex = (sourceY * width + sourceX) * 4;
                
                // Get target index
                const targetIndex = (y * targetWidth + x) * 4;
                
                // Extract only the specified channel and create grayscale from it
                const channelValue = sourceData[sourceIndex + channelIndex];
                
                // Set all RGB channels to the value of the extracted channel (making grayscale)
                channelData.data[targetIndex] = channelValue;
                channelData.data[targetIndex + 1] = channelValue;
                channelData.data[targetIndex + 2] = channelValue;
                channelData.data[targetIndex + 3] = 255;  // Full opacity
            }
        }
        
        // Put the channel data on canvas
        targetCtx.putImageData(channelData, 0, 0);
    }

    // Decode QR code from a canvas
    function decodeQrFromCanvas(canvas, channelName) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            // Try to decode QR code
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                return code.data;
            } else {
                console.warn(`No QR code found in ${channelName} channel`);
                return null;
            }
        } catch (error) {
            console.error(`Error decoding ${channelName} channel:`, error);
            return null;
        }
    }

    // Display the results
    function displayResults(redData, greenData, blueData) {
        decodedResult.innerHTML = '<h3>Decoded Data:</h3>';
        
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('decoded-content');
        
        // Add results for each channel
        addChannelResult(resultDiv, 'Red Channel', redData);
        addChannelResult(resultDiv, 'Green Channel', greenData);
        addChannelResult(resultDiv, 'Blue Channel', blueData);
        
        // Combine all data and display
        let combinedData = '';
        if (redData) combinedData += redData;
        if (greenData) combinedData += greenData;
        if (blueData) combinedData += blueData;
        
        if (combinedData) {
            const combinedDiv = document.createElement('div');
            combinedDiv.innerHTML = '<h4>Combined Data:</h4><div class="data-box">' + combinedData + '</div>';
            resultDiv.appendChild(combinedDiv);
        } else {
            resultDiv.innerHTML += '<div class="error">Failed to decode any data from the image.</div>';
        }
        
        decodedResult.appendChild(resultDiv);
    }

    // Add result for a specific channel
    function addChannelResult(container, label, data) {
        const channelDiv = document.createElement('div');
        channelDiv.classList.add('channel-result');
        
        if (data) {
            channelDiv.innerHTML = `<h4>${label}:</h4><div class="data-box">${data}</div>`;
        } else {
            channelDiv.innerHTML = `<h4>${label}:</h4><div class="error">No data detected</div>`;
        }
        
        container.appendChild(channelDiv);
    }

    // Make stopWebcam available globally for the tab switching
    window.stopWebcam = stopWebcam;
});
