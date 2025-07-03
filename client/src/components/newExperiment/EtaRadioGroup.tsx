interface EtaRadioGroupProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
}

const EtaRadioGroup = ({
  value,
  onChange,
  options = [2, 3, 4],
}: EtaRadioGroupProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="form-control gap-2 flex flex-row">
      {options.map((option) => (
        <label key={option} className="label cursor-pointer">
          <input
            type="radio"
            name="eta-radio-group"
            className="radio radio-neutral radio-xs"
            value={option}
            checked={value === option}
            onChange={handleChange}
          />
          <span className="label-text">{option}</span>
        </label>
      ))}
    </div>
  );
};

export default EtaRadioGroup;
