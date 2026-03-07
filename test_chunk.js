const chunkText = (text, maxChunkSize = 2000, firstChunkSize = maxChunkSize) => {
    if (text.length <= firstChunkSize && text.length <= maxChunkSize) {
        return [text];
    }

    const chunks = [];
    let currentIndex = 0;
    let isFirst = true;

    while (currentIndex < text.length) {
        const currentSize = isFirst ? firstChunkSize : maxChunkSize;
        let endIndex = Math.min(currentIndex + currentSize, text.length);

        if (endIndex < text.length) {
            // Try to split at a sentence/clause boundary for smoother audio
            const substr = text.slice(currentIndex, endIndex);
            const lastPunc = Math.max(
                substr.lastIndexOf('. '),
                substr.lastIndexOf('! '),
                substr.lastIndexOf('? '),
                substr.lastIndexOf(', ')
            );

            if (lastPunc > 300) {
                endIndex = currentIndex + lastPunc + 1; // Include the punctuation
            } else if (/\S/.test(text[endIndex])) {
                // Fallback to word boundary
                const lastSpace = text.lastIndexOf(' ', endIndex);
                if (lastSpace > currentIndex + 250) {
                    endIndex = lastSpace;
                }
            }
        }

        chunks.push(text.slice(currentIndex, endIndex).trim());
        currentIndex = endIndex;
        isFirst = false;
    }

    return chunks.filter(chunk => chunk.length > 0);
};

const text = "Hello! This is a quick test of the text-to-speech system. How does it sound?";
console.log("Length:", text.length);
console.log("Chunks:", chunkText(text, 600, 600));

// Wait!! The user's text was likely NOT 186 characters. The user might have just pasted something else.
// What if they pasted exactly something that triggers the bug?
// Let's test what happens if we pass maxChunkSize=600, firstChunkSize=600, but the `text.length` is 602.
const text2 = "a ".repeat(301);
console.log("Length2:", text2.length);
console.log("Chunks2:", chunkText(text2, 600, 600));

