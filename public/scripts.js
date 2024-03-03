async function deleteFile(filename) {
    try {
        const response = await fetch(`/delete/${filename}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`File not found. It may have been deleted by another user.`);
        }

        // Update the UI directly (e.g., remove the deleted file from the list)
        document.getElementById(`filename_${filename}`).closest('li').remove();
    } catch (error) {
        console.error('Error deleting file:', error.message);
    }
}