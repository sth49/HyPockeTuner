import React from "react";
import { IoWarningOutline, IoPlayOutline, IoPauseOutline } from "react-icons/io5";

interface ExperimentActionModalProps {
  modalId: string;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  isDestructive?: boolean;
  actionType?: 'pause' | 'start' | 'resume' | 'warning';
}

const ExperimentActionModal: React.FC<ExperimentActionModalProps> = ({
  modalId,
  title,
  message,
  confirmText,
  onConfirm,
  isDestructive = false,
  actionType = 'warning',
}) => {
  const handleConfirm = () => {
    onConfirm();
    const modal = document.getElementById(modalId) as HTMLDialogElement;
    modal?.close();
  };

  const getIcon = () => {
    switch (actionType) {
      case 'pause':
        return <IoPauseOutline size={24} className="text-warning" />;
      case 'start':
      case 'resume':
        return <IoPlayOutline size={24} className="text-success" />;
      default:
        return <IoWarningOutline size={24} className={isDestructive ? "text-warning" : "text-info"} />;
    }
  };

  const getButtonStyle = () => {
    switch (actionType) {
      case 'pause':
        return 'btn-warning';
      case 'start':
      case 'resume':
        return 'btn-success';
      default:
        return isDestructive ? 'btn-warning' : 'btn-primary';
    }
  };

  return (
    <dialog id={modalId} className="modal">
      <div className="modal-box">
        <div className="flex items-center gap-3 mb-4">
          {getIcon()}
          <h3 className="font-bold text-lg">{title}</h3>
        </div>
        
        <p className="py-4 text-gray-700">{message}</p>
        
        <div className="modal-action">
          <form method="dialog">
            <button className="btn btn-ghost mr-2">Cancel</button>
            <button
              type="button"
              className={`btn ${getButtonStyle()}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};

export default ExperimentActionModal;