import { FaPlus } from "react-icons/fa6";

import { ReactNode } from "react";

interface BottomButtonProps {
  onClick: () => void;
  text?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

const BottomButton = ({
  onClick,
  text = "New Experiment",
  icon = <FaPlus />,
  disabled = false,
}: BottomButtonProps) => {
  return (
    <div className="absolute bottom-0 left-0 w-full h-[70px] flex items-center justify-center p-4 bg-base-100">
      <button
        className="btn btn-primary w-full text-white uppercase"
        onClick={onClick}
        disabled={disabled}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {text}
      </button>
    </div>
  );
};

export default BottomButton;
