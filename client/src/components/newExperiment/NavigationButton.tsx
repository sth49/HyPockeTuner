import { MdNavigateNext } from "react-icons/md";

interface NavigationButtonProps {
  onClick: () => void;
  text?: string;
  icon?: React.ReactNode;
}

const NavigationButton = ({
  onClick,
  text,
  icon = <MdNavigateNext size={40} />,
}: NavigationButtonProps) => {
  return (
    <div className="absolute bottom-0 left-0 w-full h-[70px] flex items-center justify-end p-4">
      <button
        className="btn btn-primary w-[80px] text-white uppercase"
        onClick={onClick}
      >
        {icon}
        {text && <span>{text}</span>}
      </button>
    </div>
  );
};

export default NavigationButton;
