const encryptImageInput = document.getElementById("encryptImage");
const decryptImageInput = document.getElementById("decryptImage");
const secretMessageInput = document.getElementById("secretMessage");
const encryptPasswordInput = document.getElementById("encryptPassword");
const decryptPasswordInput = document.getElementById("decryptPassword");

const encryptButton = document.getElementById("encryptButton");
const decryptButton = document.getElementById("decryptButton");

const encryptFileName = document.getElementById("encryptFileName");
const decryptFileName = document.getElementById("decryptFileName");

const encryptPreview = document.getElementById("encryptPreview");
const decryptPreview = document.getElementById("decryptPreview");

const encryptImageInfo = document.getElementById("encryptImageInfo");
const decryptImageInfo = document.getElementById("decryptImageInfo");

const messageCount = document.getElementById("messageCount");
const strengthText = document.getElementById("strengthText");
const strengthBars = document.querySelectorAll(".strengthBars span");

const capacityBox = document.getElementById("capacityBox");
const capacityText = document.getElementById("capacityText");
const capacityFill = document.getElementById("capacityFill");

const messageArea = document.getElementById("messageArea");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const closeMessage = document.getElementById("closeMessage");

const protectedResult = document.getElementById("protectedResult");
const protectedPreview = document.getElementById("protectedPreview");
const downloadProtectedButton = document.getElementById(
    "downloadProtectedButton"
);
const clearProtectedButton = document.getElementById(
    "clearProtectedButton"
);

const decryptedCard = document.getElementById("decryptedCard");
const decryptedMessage = document.getElementById(
    "decryptedMessage"
);
const copyMessageButton = document.getElementById(
    "copyMessageButton"
);
const clearDecryptedButton = document.getElementById(
    "clearDecryptedButton"
);

const modeTabs = document.querySelectorAll(".modeTab");
const modePanels = document.querySelectorAll(".modePanel");
const passwordButtons = document.querySelectorAll(
    ".showPasswordButton"
);
const uploadBoxes = document.querySelectorAll(".uploadBox");

const encryptionIterations = 250000;
const headerSize = 8;
const magicBytes = new Uint8Array([72, 75, 89, 49]);

let selectedEncryptImage = null;
let selectedDecryptImage = null;
let currentCapacity = 0;
let protectedImageUrl = null;

modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const mode = tab.getAttribute("data-mode");

        modeTabs.forEach((item) => {
            item.classList.remove("active");
        });

        modePanels.forEach((panel) => {
            panel.classList.remove("active");
        });

        tab.classList.add("active");

        const panel = document.getElementById(`${mode}Panel`);

        if (panel) {
            panel.classList.add("active");
        }

        hideMessage();
    });
});

secretMessageInput.addEventListener("input", () => {
    messageCount.textContent = secretMessageInput.value.length;
    updateCapacityStatus();
});

encryptPasswordInput.addEventListener("input", () => {
    updatePasswordStrength(encryptPasswordInput.value);
});

encryptImageInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];

    if (!file) {
        selectedEncryptImage = null;
        encryptFileName.textContent = "No image selected";
        return;
    }

    try {
        encryptFileName.textContent = "Converting image to PNG...";
        selectedEncryptImage = await convertImageToPng(file);
        encryptFileName.textContent = selectedEncryptImage.name;

        showImagePreview(
            selectedEncryptImage,
            encryptPreview,
            encryptImageInfo
        );

        await loadImageCapacity(selectedEncryptImage);
        hideMessage();
    } catch (error) {
        selectedEncryptImage = null;
        encryptFileName.textContent = "Image conversion failed";

        showMessage(
            "Image error",
            error.message ||
                "This image could not be converted to PNG.",
            true
        );
    }
});

decryptImageInput.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) {
        selectedDecryptImage = null;
        decryptFileName.textContent = "No image selected";
        return;
    }

    selectedDecryptImage = file;
    decryptFileName.textContent = file.name;

    showImagePreview(
        file,
        decryptPreview,
        decryptImageInfo
    );

    hideMessage();
});

passwordButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-target");
        const input = document.getElementById(targetId);

        if (!input) {
            return;
        }

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "Hide";
        } else {
            input.type = "password";
            button.textContent = "Show";
        }
    });
});

closeMessage.addEventListener("click", hideMessage);

clearProtectedButton.addEventListener(
    "click",
    clearProtectedResult
);

clearDecryptedButton.addEventListener(
    "click",
    clearDecryptedResult
);

copyMessageButton.addEventListener("click", async () => {
    if (!decryptedMessage.textContent) {
        return;
    }

    try {
        await navigator.clipboard.writeText(
            decryptedMessage.textContent
        );

        copyMessageButton.textContent = "Copied";

        setTimeout(() => {
            copyMessageButton.textContent = "Copy message";
        }, 1500);
    } catch (error) {
        showMessage(
            "Copy failed",
            "The message could not be copied automatically.",
            true
        );
    }
});

uploadBoxes.forEach((box) => {
    box.addEventListener("dragover", (event) => {
        event.preventDefault();
        box.classList.add("dragOver");
    });

    box.addEventListener("dragleave", () => {
        box.classList.remove("dragOver");
    });

    box.addEventListener("drop", (event) => {
        event.preventDefault();
        box.classList.remove("dragOver");

        const file = event.dataTransfer.files[0];

        if (!file || !file.type.startsWith("image/")) {
            showMessage(
                "Invalid image",
                "Please choose a valid image file.",
                true
            );
            return;
        }

        const input = box.querySelector("input");
        const dataTransfer = new DataTransfer();

        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event("change"));
    });
});

encryptButton.addEventListener("click", encryptAndHideMessage);
decryptButton.addEventListener("click", extractAndDecryptMessage);

async function encryptAndHideMessage() {
    const message = secretMessageInput.value.trim();
    const password = encryptPasswordInput.value;

    if (!selectedEncryptImage) {
        showMessage(
            "Image required",
            "Please choose a cover image first.",
            true
        );
        return;
    }

    if (!message) {
        showMessage(
            "Message required",
            "Please enter a secret message.",
            true
        );
        return;
    }

    if (password.length < 8) {
        showMessage(
            "Password too short",
            "Use a password with at least 8 characters.",
            true
        );
        return;
    }

    setButtonLoading(
        encryptButton,
        true,
        "Protecting your message"
    );

    try {
        const imageData = await readImageData(
            selectedEncryptImage
        );

        const encryptedPayload = await encryptMessage(
            message,
            password
        );

        const bytesNeeded =
            headerSize + encryptedPayload.length;

        if (bytesNeeded > currentCapacity) {
            throw new Error(
                "Your message is too large for this image."
            );
        }

        const encodedImage = hideBytesInImage(
            imageData,
            encryptedPayload
        );

        const verificationPayload =
            extractBytesFromImage(encodedImage);

        console.log(
            "Hidden Key internal test passed:",
            verificationPayload.length,
            "bytes"
        );

        const imageUrl = await createPngDownload(
            encodedImage
        );

        showProtectedResult(imageUrl);

        showMessage(
            "Encryption complete",
            "Your protected image is ready to preview or download."
        );
    } catch (error) {
        console.error("Encryption error:", error);

        showMessage(
            "Encryption failed",
            error.message ||
                "Something went wrong during encryption.",
            true
        );
    } finally {
        setButtonLoading(encryptButton, false);
    }
}

async function extractAndDecryptMessage() {
    const password = decryptPasswordInput.value;

    if (!selectedDecryptImage) {
        showMessage(
            "Image required",
            "Please choose the protected PNG image first.",
            true
        );
        return;
    }

    if (!password) {
        showMessage(
            "Password required",
            "Please enter the image password.",
            true
        );
        return;
    }

    setButtonLoading(
        decryptButton,
        true,
        "Decrypting message"
    );

    try {
        const imageData = await readImageData(
            selectedDecryptImage
        );

        const encryptedPayload = extractBytesFromImage(
            imageData
        );

        const message = await decryptMessage(
            encryptedPayload,
            password
        );

        showDecryptedResult(message);

        showMessage(
            "Message revealed",
            "Your original message has been successfully restored."
        );
    } catch (error) {
        console.error("Hidden Key decrypt error:", error);

        showMessage(
            "Unable to decrypt",
            error.message ||
                "The image could not be decrypted.",
            true
        );
    } finally {
        setButtonLoading(decryptButton, false);
    }
}

async function encryptMessage(message, password) {
    const messageBytes = new TextEncoder().encode(message);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const encryptedData = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv
        },
        key,
        messageBytes
    );

    const encryptedBytes = new Uint8Array(encryptedData);

    const payload = new Uint8Array(
        salt.length +
        iv.length +
        encryptedBytes.length
    );

    payload.set(salt, 0);
    payload.set(iv, salt.length);
    payload.set(
        encryptedBytes,
        salt.length + iv.length
    );

    return payload;
}

async function decryptMessage(payload, password) {
    if (payload.length < 45) {
        throw new Error(
            "The hidden data is incomplete."
        );
    }

    const salt = payload.slice(0, 16);
    const iv = payload.slice(16, 28);
    const encryptedBytes = payload.slice(28);
    const key = await deriveKey(password, salt);

    try {
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            encryptedBytes
        );

        return new TextDecoder().decode(decryptedData);
    } catch (error) {
        throw new Error(
            "The password is incorrect or the hidden data was damaged."
        );
    }
}

async function deriveKey(password, salt) {
    const passwordBytes = new TextEncoder().encode(password);

    const baseKey = await crypto.subtle.importKey(
        "raw",
        passwordBytes,
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: encryptionIterations,
            hash: "SHA-256"
        },
        baseKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

function hideBytesInImage(imageData, encryptedPayload) {
    const output = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );

    const bytesToStore = new Uint8Array(
        headerSize + encryptedPayload.length
    );

    bytesToStore.set(magicBytes, 0);

    bytesToStore[4] =
        encryptedPayload.length >>> 24;

    bytesToStore[5] =
        encryptedPayload.length >>> 16;

    bytesToStore[6] =
        encryptedPayload.length >>> 8;

    bytesToStore[7] =
        encryptedPayload.length;

    bytesToStore.set(
        encryptedPayload,
        headerSize
    );

    const totalBits = bytesToStore.length * 8;
    let bitIndex = 0;

    for (
        let pixelIndex = 0;
        pixelIndex < output.data.length;
        pixelIndex += 4
    ) {
        if (bitIndex >= totalBits) {
            return output;
        }

        const currentByte =
            bytesToStore[Math.floor(bitIndex / 8)];

        const currentBit =
            (currentByte >> (7 - (bitIndex % 8))) & 1;

        output.data[pixelIndex] =
            currentBit === 1 ? 192 : 64;

        bitIndex++;
    }

    throw new Error(
        "The image does not have enough capacity."
    );
}

function extractBytesFromImage(imageData) {
    const availableBytes = Math.floor(
        imageData.width *
        imageData.height /
        8
    );

    const headerBits = [];

    for (
        let pixelIndex = 0;
        pixelIndex < imageData.data.length;
        pixelIndex += 4
    ) {
        headerBits.push(
            imageData.data[pixelIndex] >= 128 ? 1 : 0
        );

        if (headerBits.length >= headerSize * 8) {
            break;
        }
    }

    if (headerBits.length < headerSize * 8) {
        throw new Error(
            "The image is too small to contain Hidden Key data."
        );
    }

    const header = bitsToBytes(headerBits);

    for (let index = 0; index < magicBytes.length; index++) {
        if (header[index] !== magicBytes[index]) {
            throw new Error(
                "This image does not contain Hidden Key data."
            );
        }
    }

    const payloadLength =
        header[4] * 16777216 +
        header[5] * 65536 +
        header[6] * 256 +
        header[7];

    if (
        payloadLength < 45 ||
        payloadLength > availableBytes - headerSize
    ) {
        throw new Error(
            "The hidden data length is invalid."
        );
    }

    const totalBits =
        (headerSize + payloadLength) * 8;

    const allBits = [];

    for (
        let pixelIndex = 0;
        pixelIndex < imageData.data.length;
        pixelIndex += 4
    ) {
        allBits.push(
            imageData.data[pixelIndex] >= 128 ? 1 : 0
        );

        if (allBits.length >= totalBits) {
            break;
        }
    }

    if (allBits.length < totalBits) {
        throw new Error(
            "The hidden data is incomplete."
        );
    }

    return bitsToBytes(allBits).slice(headerSize);
}

function bitsToBytes(bits) {
    const output = new Uint8Array(
        Math.floor(bits.length / 8)
    );

    for (
        let byteIndex = 0;
        byteIndex < output.length;
        byteIndex++
    ) {
        let value = 0;

        for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
            value =
                (value << 1) |
                bits[byteIndex * 8 + bitIndex];
        }

        output[byteIndex] = value;
    }

    return output;
}

async function readImageData(file) {
    if (!file) {
        throw new Error(
            "No image file was selected."
        );
    }

    const imageUrl = URL.createObjectURL(file);

    try {
        const image = await loadImage(imageUrl);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext(
            "2d",
            {
                willReadFrequently: true
            }
        );

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        context.drawImage(image, 0, 0);

        return context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );
    } finally {
        URL.revokeObjectURL(imageUrl);
    }
}

function loadImage(imageUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);

        image.onerror = () => {
            reject(
                new Error("The image could not be opened.")
            );
        };

        image.src = imageUrl;
    });
}

function createPngDownload(imageData) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = imageData.width;
        canvas.height = imageData.height;

        context.putImageData(imageData, 0, 0);

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(
                        new Error(
                            "The protected PNG could not be created."
                        )
                    );
                    return;
                }

                resolve(URL.createObjectURL(blob));
            },
            "image/png"
        );
    });
}

async function convertImageToPng(file) {
    const imageUrl = URL.createObjectURL(file);

    try {
        const image = await loadImage(imageUrl);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        context.drawImage(image, 0, 0);

        const pngBlob = await new Promise(
            (resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(
                                new Error(
                                    "PNG conversion failed."
                                )
                            );
                            return;
                        }

                        resolve(blob);
                    },
                    "image/png"
                );
            }
        );

        const originalName = file.name.replace(
            /\.[^/.]+$/,
            ""
        );

        return new File(
            [pngBlob],
            `${originalName}.png`,
            {
                type: "image/png"
            }
        );
    } finally {
        URL.revokeObjectURL(imageUrl);
    }
}

async function loadImageCapacity(file) {
    const imageData = await readImageData(file);

    currentCapacity = Math.floor(
        imageData.width *
        imageData.height /
        8
    );

    capacityBox.classList.remove("hidden");
    updateCapacityStatus();
}

function updateCapacityStatus() {
    if (!currentCapacity) {
        return;
    }

    const messageBytes = new TextEncoder().encode(
        secretMessageInput.value
    ).length;

    const estimatedBytes =
        headerSize +
        28 +
        messageBytes +
        16;

    const percentage = Math.min(
        100,
        Math.round(
            estimatedBytes /
            currentCapacity *
            100
        )
    );

    capacityText.textContent =
        `${formatBytes(estimatedBytes)} of ` +
        `${formatBytes(currentCapacity)}`;

    capacityFill.style.width =
        `${percentage}%`;
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updatePasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) {
        strength++;
    }

    if (password.length >= 12) {
        strength++;
    }

    if (
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password)
    ) {
        strength++;
    }

    if (
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    ) {
        strength++;
    }

    strengthBars.forEach((bar, index) => {
        if (index < strength) {
            bar.style.background =
                strength <= 1
                    ? "#ff8b8b"
                    : strength === 2
                        ? "#ffd27d"
                        : "var(--green)";
        } else {
            bar.style.background =
                "rgba(125, 255, 178, 0.13)";
        }
    });

    if (!password) {
        strengthText.textContent =
            "Use at least 12 characters";
    } else if (strength === 1) {
        strengthText.textContent = "Password is weak";
    } else if (strength === 2) {
        strengthText.textContent = "Password is fair";
    } else if (strength === 3) {
        strengthText.textContent = "Password is strong";
    } else {
        strengthText.textContent = "Password is excellent";
    }
}

function showImagePreview(file, preview, info) {
    if (!file) {
        return;
    }

    const imageUrl = URL.createObjectURL(file);

    preview.src = imageUrl;
    preview.classList.remove("hidden");

    preview.onload = () => {
        URL.revokeObjectURL(imageUrl);

        info.textContent =
            `${preview.naturalWidth} × ` +
            `${preview.naturalHeight} pixels • ` +
            `${formatBytes(file.size)}`;
    };
}

function showProtectedResult(imageUrl) {
    protectedImageUrl = imageUrl;
    protectedPreview.src = imageUrl;
    downloadProtectedButton.href = imageUrl;
    protectedResult.classList.remove("hidden");

    protectedResult.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function showDecryptedResult(message) {
    decryptedMessage.textContent = message;
    decryptedCard.classList.remove("hidden");

    decryptedCard.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function clearProtectedResult() {
    protectedResult.classList.add("hidden");
    protectedPreview.removeAttribute("src");
    downloadProtectedButton.removeAttribute("href");

    if (protectedImageUrl) {
        URL.revokeObjectURL(protectedImageUrl);
        protectedImageUrl = null;
    }
}

function clearDecryptedResult() {
    decryptedCard.classList.add("hidden");
    decryptedMessage.textContent = "";
}

function showMessage(title, text, isError = false) {
    messageArea.classList.remove("hidden");
    messageTitle.textContent = title;
    messageText.textContent = text;

    if (isError) {
        messageArea.style.borderColor =
            "rgba(255, 139, 139, 0.35)";
        messageArea.style.background =
            "rgba(255, 139, 139, 0.06)";
        messageIcon.style.color = "#351414";
        messageIcon.style.background = "#ff8b8b";
        messageIcon.textContent = "!";
    } else {
        messageArea.style.borderColor =
            "rgba(125, 255, 178, 0.2)";
        messageArea.style.background =
            "rgba(125, 255, 178, 0.06)";
        messageIcon.style.color = "var(--black)";
        messageIcon.style.background = "var(--green)";
        messageIcon.textContent = "✓";
    }
}

function hideMessage() {
    messageArea.classList.add("hidden");
}

function setButtonLoading(
    button,
    isLoading,
    loadingText = ""
) {
    const textElement = button.querySelector("span");

    if (isLoading) {
        button.disabled = true;
        button.style.opacity = "0.7";
        textElement.textContent = loadingText;
    } else {
        button.disabled = false;
        button.style.opacity = "1";

        textElement.textContent =
            button === encryptButton
                ? "Encrypt and hide message"
                : "Extract and decrypt message";
    }
}