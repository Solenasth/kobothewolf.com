// A labeled range with its value shown (FR-E9).
export function Range(props: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onInput: (value: number) => void;
}) {
  const { id, label, min, max, step, value, unit, onInput } = props;
  return (
    <div class="ed-rng">
      <label for={id}>{label}</label>
      <output for={id}>{`${value}${unit}`}</output>
      <input type="range" id={id} min={min} max={max} step={step} value={value} onInput={(e) => onInput(Number(e.currentTarget.value))} />
    </div>
  );
}
