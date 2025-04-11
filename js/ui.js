// UI helper functions

/**
 * Tab switching functionality
 */
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(button.getAttribute('data-tab')).classList.add('active');
            
            // Stop webcam when switching away from reader tab
            if (button.getAttribute('data-tab') !== 'reader' && window.stopWebcam) {
                window.stopWebcam();
            }
        });
    });
}

/**
 * Input method switching in reader
 */
function initInputMethods() {
    document.querySelectorAll('.method-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all method buttons
            document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.input-method').forEach(method => method.classList.remove('active'));
            
            // Add active class to clicked method
            button.classList.add('active');
            document.getElementById(button.getAttribute('data-method') + '-input').classList.add('active');
            
            // Stop webcam if switching away from webcam
            if (button.getAttribute('data-method') !== 'webcam' && window.stopWebcam) {
                window.stopWebcam();
            }
        });
    });
}

/**
 * Create and append a channel visualization canvas with label
 */
function createChannelCanvas(container, name, width, height) {
    const wrapper = document.createElement('div');
    wrapper.className = 'channel-wrapper';
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const label = document.createElement('div');
    label.className = 'channel-label';
    label.textContent = name;
    
    wrapper.appendChild(canvas);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
    
    return canvas;
}

/**
 * Show a status message to the user
 */
function showMessage(message, isError = false) {
    alert(message);
}

/**
 * Display decoded results for QR channels
 */
function displayResults(container, redData, greenData, blueData) {
    container.innerHTML = '<h3>Decoded Data:</h3>';
    
    const resultDiv = document.createElement('div');
    resultDiv.classList.add('decoded-content');
    
    // Add each channel's data
    CONFIG.CHANNELS.forEach((channel, index) => {
        const data = [redData, greenData, blueData][index];
        addChannelResult(resultDiv, channel.name, data);
    });
    
    // Combine all data
    let combinedData = [redData, greenData, blueData]
        .filter(data => data)
        .join('');
    
    if (combinedData) {
        const combinedDiv = document.createElement('div');
        combinedDiv.innerHTML = '<h4>Combined Data:</h4><div class="data-box">' + combinedData + '</div>';
        resultDiv.appendChild(combinedDiv);
    } else {
        resultDiv.innerHTML += '<div class="error">Failed to decode any data from the image.</div>';
    }
    
    container.appendChild(resultDiv);
}

/**
 * Add a single channel's result
 */
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
