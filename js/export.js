// Card Export Functions using html2canvas

// Get export dimensions based on card size
function getExportDimensions(cardElement) {
  const size = cardElement.dataset.size || 'square';
  if (size === 'story') {
    return { width: 1080, height: 1920 };
  }
  return { width: 600, height: 600 };
}

// Create off-screen clone for export (prevents flicker)
function createExportClone(cardElement) {
  const dims = getExportDimensions(cardElement);

  // Clone the card
  const clone = cardElement.cloneNode(true);

  // Style for off-screen rendering
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = `${dims.width}px`;
  clone.style.height = `${dims.height}px`;
  clone.style.zIndex = '-1';

  // Add to document
  document.body.appendChild(clone);

  return { clone, dims };
}

// Export card as PNG
export async function exportAsPng(cardElement, filename = 'devotion-card.png') {
  try {
    // Create off-screen clone
    const { clone, dims } = createExportClone(cardElement);

    // Wait for images to load in clone
    await waitForImages(clone);

    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: dims.width,
      height: dims.height
    });

    // Remove clone
    document.body.removeChild(clone);

    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();

    return true;
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

// Copy card to clipboard
export async function copyToClipboard(cardElement) {
  try {
    // Create off-screen clone
    const { clone, dims } = createExportClone(cardElement);

    // Wait for images to load in clone
    await waitForImages(clone);

    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: dims.width,
      height: dims.height
    });

    // Remove clone
    document.body.removeChild(clone);

    // Convert to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    return true;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    throw error;
  }
}

// Wait for all images in element to load
function waitForImages(element) {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = resolve; // Continue even if image fails
    });
  });
  return Promise.all(promises);
}

// Generate filename from profile data
export function generateFilename(profile, type = 'artist') {
  const timestamp = new Date().toISOString().slice(0, 10);

  if (type === 'artist' && profile.artistFocus) {
    const artistName = profile.artistFocus.artist.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    return `devotion-${artistName}-${timestamp}.png`;
  }

  const username = (profile.user.displayName || profile.user.id)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
  return `devotion-profile-${username}-${timestamp}.png`;
}

// Share to Twitter (opens in new window)
export function shareToTwitter(profile) {
  const text = profile.artistFocus
    ? `Check out my devotion to ${profile.artistFocus.artist.name}! #DevotionVerified`
    : `Check out my listening devotion! #DevotionVerified`;

  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'width=550,height=420');
}
