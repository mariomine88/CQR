document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const elements = {
        decodeFileBtn: document.getElementById('decodeFileBtn'),
        cqrInput: document.getElementById('cqrInput'),
        decodedResult: document.getElementById('decodedResult'),
        startWebcamBtn: document.getElementById('startWebcamBtn'),
        captureBtn: document.getElementById('captureBtn'),
        webcamVideo: document.getElementById('webcamVideo'),
        webcamCanvas: document.getElementById('webcamCanvas'),
        channelDebugContainer: document.getElementById('channelDebugContainer')
    };

    let videoStream = null;

    // Event listeners
    elements.decodeFileBtn.addEventListener('click', decodeFromFile);
    elements.startWebcamBtn.addEventListener('click', toggleWebcam);
    elements.captureBtn.addEventListener('click', captureAndDecode);

    // Function to decode from file upload
    function decodeFromFile() {
        const file = elements.cqrInput.files[0];
        if (!file) {
            showMessage('Please select an image file');
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

    // Toggle webcam on/off
    function toggleWebcam() {
        if (videoStream) {
            stopWebcam();
            elements.startWebcamBtn.textContent = 'Start Webcam';
            elements.captureBtn.disabled = true;
        } else {
            startWebcam();
            elements.startWebcamBtn.textContent = 'Stop Webcam';
        }
    }

    // Start webcam
    function startWebcam() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(function(stream) {
                videoStream = stream;
                elements.webcamVideo.srcObject = stream;
                elements.captureBtn.disabled = false;
            })
            .catch(function(err) {
                console.error('Error accessing webcam:', err);
                showMessage('Could not access webcam. Please check permissions.', true);
            });
    }

    // Stop webcam
    function stopWebcam() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
            elements.webcamVideo.srcObject = null;
        }
    }

    // Make stopWebcam available globally for tab switching
    window.stopWebcam = stopWebcam;

    // Capture image from webcam and decode
    function captureAndDecode() {
        if (!videoStream) return;

        const canvas = elements.webcamCanvas;
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to match video
        canvas.width = elements.webcamVideo.videoWidth;
        canvas.height = elements.webcamVideo.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(elements.webcamVideo, 0, 0, canvas.width, canvas.height);
        
        // Decode the QR from the canvas
        decodeCQR(canvas);
    }

    // Main function to decode colored QR code
    function decodeCQR(imageSource) {
        // Clear previous results
        elements.decodedResult.innerHTML = '';
        elements.channelDebugContainer.innerHTML = '';
        
        // Create canvas to process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions based on source image
        const width = imageSource instanceof HTMLCanvasElement ? 
            imageSource.width : imageSource.naturalWidth;
        const height = imageSource instanceof HTMLCanvasElement ? 
            imageSource.height : imageSource.naturalHeight;
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas
        ctx.drawImage(imageSource, 0, 0, width, height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        
        // Create and extract channels
        const channelData = [];
        
        for (let i = 0; i < 3; i++) {
            // Create channel canvas
            const channelCanvas = createChannelCanvas(
                elements.channelDebugContainer, 
                CONFIG.CHANNELS[i].name, 
                width / 2, 
                height / 2
            );
            
            // Extract channel data
            extractChannel(
                imageData.data, 
                channelCanvas, 
                CONFIG.CHANNELS[i].index, 
                width, 
                height
            );
            
            // Decode QR from the channel
            channelData[i] = decodeQR(channelCanvas);
        }
        
        // Display results
        displayResults(
            elements.decodedResult, 
            channelData[0], 
            channelData[1], 
            channelData[2]
        );
    }
});
