// Configuration constants shared across application

const CONFIG = {
    // Canvas dimensions
    CANVAS: {
        DEFAULT_SIZE: 300,
        CHANNEL_SCALE_FACTOR: 3 // How much smaller channel previews should be
    },
    
    // Colors
    COLORS: {
        RED: [255, 0, 0],
        GREEN: [0, 255, 0], 
        BLUE: [0, 0, 255]
    },
    
    // Channel information
    CHANNELS: [
        { name: 'Red Channel', color: [255, 0, 0], index: 0 },
        { name: 'Green Channel', color: [0, 255, 0], index: 1 },
        { name: 'Blue Channel', color: [0, 0, 255], index: 2 }
    ]
};
