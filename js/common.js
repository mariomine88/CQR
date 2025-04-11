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
