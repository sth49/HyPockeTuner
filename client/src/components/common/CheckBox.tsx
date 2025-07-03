import React from "react";

interface CheckBoxProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: boolean;
}

const CheckBox = ({
  label,
  checked = false,
  onChange,
  disabled = false,
  error = false,
}: CheckBoxProps) => {
  return (
    <div className="flex items-center gap-2 justify-center">
      <input
        type="checkbox"
        className={`checkbox checkbox-xs checkbox-primary rounded-sm text-white ${
          error ? "input-error" : ""
        }`}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
};

export default CheckBox;
