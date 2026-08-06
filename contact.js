document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

  if (!form || !status) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const button = form.querySelector("button[type='submit']");
    const originalText = button?.textContent || "Send enquiry";

    if (button) {
      button.disabled = true;
      button.textContent = "Sending...";
    }

    status.textContent = "";

    try {
      const response = await fetch("/contact", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData),
      });

      const data = await response.json();

      if (data.success) {
        status.textContent = data.message;
        status.style.color = "#2f6b4b";
        form.reset();
      } else {
        throw new Error(data.message || "Unable to send message.");
      }
    } catch (error) {
      status.textContent = error.message || "Unable to send message right now.";
      status.style.color = "#b65c2d";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
});
