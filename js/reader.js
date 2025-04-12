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
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Set canvas dimensions to match video
        canvas.width = elements.webcamVideo.videoWidth;
        canvas.height = elements.webcamVideo.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(elements.webcamVideo, 0, 0, canvas.width, canvas.height);
        
        // Decode the QR from the canvas
        decodeCQR(canvas);
    }
    
    // --- Helper Function: Apply Median Filter ---
    function applyMedianFilter(imageData, width, height, kernelSize = 3) {
        const srcData = imageData.data;
        const dstImageData = new ImageData(width, height);
        const dstData = dstImageData.data;
        const halfKernel = Math.floor(kernelSize / 2);
        const kernelArea = kernelSize * kernelSize;
        const neighbors = new Array(kernelArea);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let k = 0;
                // Collect neighbor values
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const pixelY = Math.max(0, Math.min(height - 1, y + ky)); // Clamp coordinates
                        const pixelX = Math.max(0, Math.min(width - 1, x + kx));
                        const srcIndex = (pixelY * width + pixelX) * 4;
                        neighbors[k++] = srcData[srcIndex]; // Use R value (all are same in grayscale/binary)
                    }
                }
                
                // Sort and find median
                neighbors.sort((a, b) => a - b);
                const medianValue = neighbors[Math.floor(kernelArea / 2)];
                
                // Set destination pixel
                const dstIndex = (y * width + x) * 4;
                dstData[dstIndex] = medianValue;
                dstData[dstIndex + 1] = medianValue;
                dstData[dstIndex + 2] = medianValue;
                dstData[dstIndex + 3] = 255; // Alpha
            }
        }
        return dstImageData;
    }
    
    // Utility to calculate Otsu threshold
    function calculateOtsuThreshold(grayscaleData) {
        const histogram = new Array(256).fill(0);
        grayscaleData.forEach(value => histogram[value]++);

        const totalPixels = grayscaleData.length;
        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }

        let sumB = 0;
        let weightB = 0;
        let weightF = 0;
        let maxVariance = 0;
        let threshold = 0;

        for (let t = 0; t < 256; t++) {
            weightB += histogram[t];
            if (weightB === 0) continue;
            weightF = totalPixels - weightB;
            if (weightF === 0) break;

            sumB += t * histogram[t];
            const meanB = sumB / weightB;
            const meanF = (sum - sumB) / weightF;

            const variance = weightB * weightF * Math.pow(meanB - meanF, 2);
            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
            }
        }
        return threshold;
    }
    
    // Function to extract and process a specific color channel with dynamic thresholding and cropping
    function extractChannel(imageData, channelCanvas, channelIndex, width, height) {
        const ctx = channelCanvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, channelCanvas.width, channelCanvas.height);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        let currentImageData = tempCtx.createImageData(width, height);
        
        // Fill temp canvas with the specified channel's grayscale values
        for (let i = 0; i < imageData.length; i += 4) {
            const value = imageData[i + channelIndex];
            currentImageData.data[i]     = value;
            currentImageData.data[i + 1] = value;
            currentImageData.data[i + 2] = value;
            currentImageData.data[i + 3] = 255;
        }
        
        tempCtx.putImageData(currentImageData, 0, 0);
        
        const minDimension = Math.min(width, height);
        let sampleSize = Math.max(10, Math.floor(minDimension * 0.07)); 
        const innerMargin = Math.floor(sampleSize * 0.15); 

        const corners = [
            { x: 0, y: 0 }, { x: width - sampleSize, y: 0 }, { x: 0, y: height - sampleSize }
        ].filter(c => c.x >= 0 && c.y >= 0 && c.x + sampleSize <= width && c.y + sampleSize <= height);
        
        let totalBlackIntensity = 0, totalWhiteIntensity = 0, samplesTaken = 0;
        
        corners.forEach(corner => {
            const sampleImageData = tempCtx.getImageData(corner.x, corner.y, sampleSize, sampleSize).data;
            let blackSum = 0, whiteSum = 0, blackCount = 0, whiteCount = 0;
            for (let y = 0; y < sampleSize; y++) {
                for (let x = 0; x < sampleSize; x++) {
                    const isInner = x >= innerMargin && x < (sampleSize - innerMargin) &&
                                    y >= innerMargin && y < (sampleSize - innerMargin);
                    const pixelIndex = (y * sampleSize + x) * 4;
                    const value = sampleImageData[pixelIndex]; 
                    if (isInner) {
                        blackSum += value; blackCount++;
                    } else {
                        whiteSum += value; whiteCount++;
                    }
                }
            }
            if (blackCount > 0 && whiteCount > 0) {
                totalBlackIntensity += (blackSum / blackCount);
                totalWhiteIntensity += (whiteSum / whiteCount);
                samplesTaken++;
            } else {
                 console.warn(`Channel ${channelIndex}: Invalid sample counts in corner`, corner, blackCount, whiteCount);
            }
        });
        
        let threshold;
        let usedOtsu = false;
        
        if (samplesTaken >= 2) {
            const avgBlack = totalBlackIntensity / samplesTaken;
            const avgWhite = totalWhiteIntensity / samplesTaken;
            
            if (avgWhite > avgBlack + 10) {
                threshold = (avgBlack + avgWhite) / 2;
                threshold = Math.max(10, Math.min(245, threshold));
                console.log(`Channel ${channelIndex}: Using dynamic threshold: ${threshold.toFixed(2)} (Avg Black: ${avgBlack.toFixed(2)}, Avg White: ${avgWhite.toFixed(2)})`);
            } else {
                console.warn(`Channel ${channelIndex}: Dynamic sampling unreliable (diff: ${(avgWhite - avgBlack).toFixed(2)}). Falling back to Otsu.`);
                usedOtsu = true;
            }
        } else {
            console.warn(`Channel ${channelIndex}: Insufficient valid samples (${samplesTaken}). Falling back to Otsu.`);
            usedOtsu = true;
        }

        if (usedOtsu) {
            const grayscaleData = [];
            const dataToThreshold = currentImageData.data;
            for (let i = 0; i < dataToThreshold.length; i += 4) {
                grayscaleData.push(dataToThreshold[i]);
            }
            threshold = calculateOtsuThreshold(grayscaleData);
            console.log(`Channel ${channelIndex}: Using Otsu threshold: ${threshold.toFixed(2)}`);
            threshold = Math.max(5, Math.min(250, threshold));
        }

        const binarizedImageData = tempCtx.createImageData(width, height);
        const dataToBinarize = currentImageData.data;
        let blackPixelCount = 0;
        for (let i = 0; i < dataToBinarize.length; i += 4) {
            const value = dataToBinarize[i]; 
            const newValue = value < threshold ? 0 : 255; 
            if (newValue === 0) {
                blackPixelCount++;
            }
            binarizedImageData.data[i]     = newValue;
            binarizedImageData.data[i + 1] = newValue;
            binarizedImageData.data[i + 2] = newValue;
            binarizedImageData.data[i + 3] = 255;
        }

        const totalPixels = width * height;
        const blackRatio = blackPixelCount / totalPixels;
        let dataForDenoising = binarizedImageData.data;
        
        if (blackRatio > 0.75) {
            console.warn(`Channel ${channelIndex}: High black pixel ratio (${(blackRatio * 100).toFixed(1)}%). Inverting image.`);
            const invertedData = new Uint8ClampedArray(dataForDenoising.length);
            for (let i = 0; i < dataForDenoising.length; i += 4) {
                const invertedValue = dataForDenoising[i] === 0 ? 255 : 0;
                invertedData[i] = invertedValue;
                invertedData[i+1] = invertedValue;
                invertedData[i+2] = invertedValue;
                invertedData[i+3] = 255;
            }
            binarizedImageData.data.set(invertedData);
            dataForDenoising = invertedData;
        }

        console.log(`Channel ${channelIndex}: Applying Median Filter...`);
        const imageDataToDenoise = new ImageData(new Uint8ClampedArray(dataForDenoising), width, height);
        
        let denoisedImageData = applyMedianFilter(imageDataToDenoise, width, height, 3); 
        
        if (channelIndex === 0) { 
            console.log(`Channel ${channelIndex}: Applying additional median filter pass`);
            denoisedImageData = applyMedianFilter(denoisedImageData, width, height, 3);
        }
        
        let minX = width, minY = height, maxX = -1, maxY = -1;
        let hasBlackPixels = false;
        const denoisedData = denoisedImageData.data;
        for (let i = 0; i < denoisedData.length; i += 4) {
            if (denoisedData[i] === 0) {
                hasBlackPixels = true;
                const pixelIndex = i / 4;
                const x = pixelIndex % width;
                const y = Math.floor(pixelIndex / width);
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
        
        tempCtx.putImageData(denoisedImageData, 0, 0); 

        let canvasToDecode = channelCanvas; 
        if (hasBlackPixels && maxX >= minX && maxY >= minY) {
            const padding = Math.max(5, Math.floor(Math.min(width, height) * 0.05));
            
            const cropX = Math.max(0, minX - padding);
            const cropY = Math.max(0, minY - padding);
            const cropWidth = Math.min(width - cropX, (maxX - minX + 1) + 2 * padding);
            const cropHeight = Math.min(height - cropY, (maxY - minY + 1) + 2 * padding);

            console.log(`Channel ${channelIndex}: BBox (minX,minY,maxX,maxY)=(${minX},${minY},${maxX},${maxY}), Padding=${padding}, Crop (x,y,w,h)=(${cropX},${cropY},${cropWidth},${cropHeight})`);

            if (cropWidth > 0 && cropHeight > 0) {
                const croppedCanvas = document.createElement('canvas');
                croppedCanvas.width = cropWidth;
                croppedCanvas.height = cropHeight;
                const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: true });
                croppedCtx.putImageData(tempCtx.getImageData(cropX, cropY, cropWidth, cropHeight), 0, 0);

                ctx.drawImage(croppedCanvas, 0, 0, channelCanvas.width, channelCanvas.height);
                
                canvasToDecode = croppedCanvas; 
            } else {
                 console.warn(`Channel ${channelIndex}: Invalid crop dimensions after padding.`);
                 ctx.drawImage(tempCanvas, 0, 0, channelCanvas.width, channelCanvas.height); 
            }
        } else {
             ctx.drawImage(tempCanvas, 0, 0, channelCanvas.width, channelCanvas.height);
             console.warn(`Channel ${channelIndex}: No black pixels found or invalid bounding box after denoising.`);
        }

        return canvasToDecode; 
    }

    // Main function to decode colored QR code
    function decodeCQR(imageSource) {
        elements.decodedResult.innerHTML = '';
        elements.channelDebugContainer.innerHTML = '';
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        const width = imageSource instanceof HTMLCanvasElement ? 
            imageSource.width : imageSource.naturalWidth;
        const height = imageSource instanceof HTMLCanvasElement ? 
            imageSource.height : imageSource.naturalHeight;
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(imageSource, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        
        const channelData = [];
        
        for (let i = 0; i < 3; i++) {
            const channelConfig = CONFIG.CHANNELS[i];
            const channelDebugCanvas = createChannelCanvas(
                elements.channelDebugContainer, 
                channelConfig.name, 
                width / 2, 
                height / 2
            );
            
            const canvasForDecoding = extractChannel(
                imageData.data, 
                channelDebugCanvas, 
                channelConfig.index, 
                width, 
                height
            );
            
            try {
                channelData[i] = decodeQR(canvasForDecoding); 
                if (channelData[i]) {
                    console.log(`Channel ${channelConfig.name} (${channelConfig.index}): Decoded successfully.`);
                } else {
                    console.warn(`Channel ${channelConfig.name} (${channelConfig.index}): Decode failed (decodeQR returned null).`);
                }
            } catch (error) {
                 console.error(`Channel ${channelConfig.name} (${channelConfig.index}): Error during decodeQR:`, error);
                 channelData[i] = null; 
            }
        }
        
        displayResults(
            elements.decodedResult, 
            channelData[0], 
            channelData[1], 
            channelData[2]
        );
    }
});
