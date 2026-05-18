const resultLabels = {
  win: "You Win",
  loss: "House Wins",
  push: "Push",
};

export default function ResultBurst({ tone, resultKey, label, delay = "280ms" }) {
  if (!tone) return null;

  return (
    <div
      key={`${tone}-${resultKey}`}
      className={`result-burst result-burst-${tone}`}
      style={{ "--result-delay": delay }}
      aria-live="polite"
    >
      {label || resultLabels[tone]}
    </div>
  );
}
