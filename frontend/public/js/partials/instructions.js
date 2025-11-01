// Get step items and counter element
const steps = document.querySelectorAll(".step");
const currentStepEl = document.getElementById("currentStep");

let current = 0;

// Activate the step by index and update the counter
function showStep(index) {
  steps.forEach(s => s.classList.remove("active"));
  steps[index].classList.add("active");
  currentStepEl.textContent = index + 1;
}

// Prev button move back if possible
document.getElementById("prevBtn").addEventListener("click", () => {
  if (current > 0) {
    current--;
    showStep(current);
  }
});

// Next button move forward if possible
document.getElementById("nextBtn").addEventListener("click", () => {
  if (current < steps.length - 1) {
    current++;
    showStep(current);
  }
});

// Initialize with the first step
showStep(current);
