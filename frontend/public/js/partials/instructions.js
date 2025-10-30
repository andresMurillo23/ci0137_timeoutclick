const steps = document.querySelectorAll(".step");
const currentStepEl = document.getElementById("currentStep");

let current = 0;

function showStep(index) {
  steps.forEach(s => s.classList.remove("active"));
  steps[index].classList.add("active");
  currentStepEl.textContent = index + 1;
}

document.getElementById("prevBtn").addEventListener("click", () => {
  if (current > 0) {
    current--;
    showStep(current);
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (current < steps.length - 1) {
    current++;
    showStep(current);
  }
});

showStep(current);
