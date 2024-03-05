async function deleteFile(filename) {
  try {
    const response = await fetch(`/delete/${filename}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(
        `File not found. It may have been deleted by another user.`
      );
    }

    location.reload();
  } catch (error) {
    console.error("Error deleting file:", error.message);
  }
}
async function updateFile(filename) {
  const newFilename = document.getElementById("newFilename").value;

  try {
    const response = await fetch(`/update/${filename}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newFilename }),
    });

    if (!response.ok) {
      throw new Error(`File update failed. Please try again.`);
    }

    // Redirect back to the index page after successful update
    window.location.href = "/";
  } catch (error) {
    console.error("Error updating file:", error.message);
    // Handle errors as needed
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const filenameInput = document.getElementById("filename");

  filenameInput.addEventListener("input", function () {
    const value = this.value.trim();
    const isValid = /^[a-zA-Z0-9_-]+$/.test(value);

    if (!isValid) {
      this.setCustomValidity(
        "Only use letters, numbers, underscores, and hyphens."
      );
    } else {
      this.setCustomValidity("");
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const filenameInput = document.getElementById("newFilename");

  filenameInput.addEventListener("input", function () {
    const value = this.value.trim();
    const isValid = /^[a-zA-Z0-9_-]+$/.test(value);

    if (!isValid) {
      this.setCustomValidity(
        "Only use letters, numbers, underscores, and hyphens."
      );
    } else {
      this.setCustomValidity("");
    }
  });
});
