# CQR Generator & Reader

This is a simple web application for generating and reading **Colored QR (CQR)** codes.

## Purpose

Standard QR codes store data in black and white modules. CQR codes leverage the Red, Green, and Blue (RGB) color channels of an image to potentially store more information within a single QR code footprint. Each color channel (Red, Green, Blue) encodes a separate piece of data.

## Functionality

*   **Generate CQR:** Enter text data, and the application will split it into three parts, generate a standard QR code for each part, and then combine these into a single colored QR code image. The red channel stores the first part, green the second, and blue the third.
*   **Read CQR:** Upload a CQR image file or use your webcam to capture one. The application will attempt to extract the data from each color channel (Red, Green, Blue) separately and display the combined result.

## How it Works (Simplified)

1.  **Generation:**
    *   Input data is split into three segments.
    *   A standard black and white QR code is generated for each segment.
    *   These three QR codes are overlaid, using the red, green, and blue channels respectively. Where a pixel is "black" in a segment's QR code, that corresponding color channel is set to 0 (black); otherwise, it's set to 255 (full color).
2.  **Reading:**
    *   The CQR image is loaded.
    *   The image data is separated into its Red, Green, and Blue channels.
    *   Each channel is processed (binarized, denoised) to resemble a standard black and white QR code.
    *   A standard QR reader attempts to decode the data from each processed channel image.
    *   The decoded data segments are combined.

**Note:** This is a basic implementation for demonstration purposes. Real-world CQR implementations might involve more complex encoding/decoding schemes and error correction across channels.
