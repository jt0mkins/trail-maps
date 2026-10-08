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

      // A static host (e.g. GitHub Pages) has no /contact endpoint and
      // returns an HTML error page instead of JSON.
      let data = null;
      try {
        data = await response.json();
      } catch {}

      if (!data) {
        throw new Error("The contact form isn't available on this site yet. Please email hello@trailmapsnz.co.nz instead.");
      }

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
